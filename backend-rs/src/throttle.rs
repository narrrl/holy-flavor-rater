//! In-process rate limiting + confirmation-code hardening.
//!
//! Replaces what Django got from `django_ratelimit` (request throttling) and
//! adds two protections the Django app lacked: a per-account attempt lockout on
//! the code-verifying endpoints, and a TTL on the 6-digit confirmation codes
//! (`email_confirmation_code` has no expiry column in the shared schema, so the
//! TTL is tracked here in memory).
//!
//! Everything is in-memory. Two consequences worth knowing:
//! - A process restart resets the counters (fail-open) — acceptable: the worst
//!   case is a brute-force attacker getting their window reset, still bounded by
//!   the very low per-hour limits, and the strangler runs a single Rust process.
//! - Code expiry is best-effort: `code_expired` only reports `true` when we hold
//!   a record that is past its TTL. An unknown code (minted before a restart, or
//!   by Django directly) falls through to the existing DB-equality check, so a
//!   legitimate user is never locked out worse than Django did.

use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::error::ApiError;

/// A request rate, mirroring django_ratelimit's `N/period` notation.
#[derive(Clone, Copy)]
pub struct Rate {
    pub limit: usize,
    pub window: Duration,
}

impl Rate {
    pub const fn per_minute(limit: usize) -> Self {
        Rate {
            limit,
            window: Duration::from_secs(60),
        }
    }
    pub const fn per_hour(limit: usize) -> Self {
        Rate {
            limit,
            window: Duration::from_secs(3600),
        }
    }
}

// --- Django-parity request limits (key + rate match api/views) -------------
/// `signup` — django_ratelimit key="ip" rate="5/h".
pub const SIGNUP: Rate = Rate::per_hour(5);
/// `request_password_reset` — key="ip" rate="3/h".
pub const PASSWORD_RESET_REQUEST: Rate = Rate::per_hour(3);
/// `complete_password_reset` — key="ip" rate="5/h".
pub const PASSWORD_RESET_COMPLETE: Rate = Rate::per_hour(5);
/// `request_account_deletion` — key="user" rate="3/h".
pub const ACCOUNT_DELETION_REQUEST: Rate = Rate::per_hour(3);
/// `RatingViewSet.create` — key="user" rate="10/m".
pub const RATING_CREATE: Rate = Rate::per_minute(10);

// --- Added hardening (no Django equivalent) --------------------------------
/// Login brute-force guard, keyed by IP (Django had none).
pub const LOGIN: Rate = Rate::per_minute(10);
/// Verification-email resends, keyed by IP — caps the email-bomb vector.
pub const RESEND_VERIFICATION: Rate = Rate::per_hour(5);
/// Per-account attempt lockout on the code-verifying endpoints. Generous enough
/// that a real user fat-fingering a code never trips it, low enough to make the
/// 6-digit space (1e6) infeasible even for an attacker rotating source IPs.
pub const CODE_ATTEMPTS: Rate = Rate::per_hour(10);

/// How long a freshly minted confirmation code stays valid.
pub const CODE_TTL: Duration = Duration::from_secs(15 * 60);

/// Shared security state: a sliding-window request log plus the code-mint clock.
#[derive(Default)]
pub struct Security {
    /// key -> timestamps of recent hits (oldest first).
    hits: Mutex<HashMap<String, VecDeque<Instant>>>,
    /// confirmation-code key -> mint time.
    codes: Mutex<HashMap<String, Instant>>,
}

impl Security {
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a hit on `key` and reject (429) if it exceeds `rate`. Uses a
    /// sliding-window log so a burst can't straddle a fixed boundary.
    pub fn check_rate(&self, key: &str, rate: Rate) -> Result<(), ApiError> {
        let now = Instant::now();
        let mut map = self.hits.lock().unwrap();
        let log = map.entry(key.to_string()).or_default();
        // Drop hits that have aged out of the window.
        while let Some(&front) = log.front() {
            if now.duration_since(front) >= rate.window {
                log.pop_front();
            } else {
                break;
            }
        }
        if log.len() >= rate.limit {
            // Retry once the oldest in-window hit expires.
            let retry_after = log
                .front()
                .map(|&t| rate.window.saturating_sub(now.duration_since(t)))
                .unwrap_or(rate.window);
            return Err(ApiError::RateLimited {
                retry_after: retry_after.as_secs().max(1),
            });
        }
        log.push_back(now);
        Ok(())
    }

    /// Note that a confirmation code was just minted for `key`.
    pub fn record_code(&self, key: &str) {
        self.codes
            .lock()
            .unwrap()
            .insert(key.to_string(), Instant::now());
    }

    /// True only when we hold a mint time for `key` that is older than `CODE_TTL`.
    /// Unknown keys return `false` (fall through to the DB-equality check).
    pub fn code_expired(&self, key: &str) -> bool {
        self.codes
            .lock()
            .unwrap()
            .get(key)
            .is_some_and(|&t| t.elapsed() >= CODE_TTL)
    }

    /// Forget a code after it has been consumed (or invalidated).
    pub fn clear_code(&self, key: &str) {
        self.codes.lock().unwrap().remove(key);
    }

    /// Drop empty/expired buckets so the maps don't grow unbounded. Called
    /// periodically from a background task.
    pub fn gc(&self) {
        let now = Instant::now();
        // Longest request window in use is one hour; reuse it as the sweep horizon.
        let max_window = Duration::from_secs(3600);
        let mut hits = self.hits.lock().unwrap();
        hits.retain(|_, log| {
            while let Some(&front) = log.front() {
                if now.duration_since(front) >= max_window {
                    log.pop_front();
                } else {
                    break;
                }
            }
            !log.is_empty()
        });
        drop(hits);
        let mut codes = self.codes.lock().unwrap();
        codes.retain(|_, &mut t| t.elapsed() < CODE_TTL);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_up_to_limit_then_blocks() {
        let s = Security::new();
        let rate = Rate::per_hour(3);
        for _ in 0..3 {
            assert!(s.check_rate("k", rate).is_ok());
        }
        let err = s.check_rate("k", rate).unwrap_err();
        assert!(matches!(err, ApiError::RateLimited { .. }));
    }

    #[test]
    fn keys_are_independent() {
        let s = Security::new();
        let rate = Rate::per_hour(1);
        assert!(s.check_rate("a", rate).is_ok());
        assert!(s.check_rate("b", rate).is_ok());
        assert!(s.check_rate("a", rate).is_err());
    }

    #[test]
    fn unknown_code_is_not_expired() {
        let s = Security::new();
        assert!(!s.code_expired("missing"));
    }

    #[test]
    fn recorded_code_is_fresh() {
        let s = Security::new();
        s.record_code("k");
        assert!(!s.code_expired("k"));
        s.clear_code("k");
        assert!(!s.code_expired("k"));
    }
}
