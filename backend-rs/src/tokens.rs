//! SimpleJWT-compatible token issuance.
//!
//! Mirrors `rest_framework_simplejwt`: HS256 signed with `SECRET_KEY`, claim set
//! `{ token_type, exp, iat, jti, user_id }`, `jti` a uuid4 hex string. Lifetimes
//! match `settings.SIMPLE_JWT` (access 60 min, refresh 14 days). Tokens minted
//! here verify in Django and vice versa, so the strangler proxy can route auth
//! to Rust while other endpoints stay on Django.

use chrono::{DateTime, NaiveDateTime, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const ACCESS_LIFETIME_SECS: i64 = 60 * 60; // ACCESS_TOKEN_LIFETIME = 60 min
pub const REFRESH_LIFETIME_SECS: i64 = 14 * 24 * 60 * 60; // REFRESH_TOKEN_LIFETIME = 14 days

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    pub token_type: String,
    pub exp: i64,
    pub iat: i64,
    pub jti: String,
    pub user_id: i32,
}

impl TokenClaims {
    /// Convert an `exp` epoch into a naive-UTC datetime (for blacklist rows).
    pub fn expires_naive(exp: i64) -> NaiveDateTime {
        epoch_to_naive(exp)
    }
}

/// A freshly minted token plus the fields needed to record it (jti/exp).
pub struct Minted {
    pub token: String,
    pub jti: String,
    pub iat: i64,
    pub exp: i64,
}

impl Minted {
    /// `expires_at` as a naive-UTC datetime, for the outstanding-token row.
    pub fn expires_at(&self) -> NaiveDateTime {
        epoch_to_naive(self.exp)
    }
    /// `created_at` (== iat) as a naive-UTC datetime.
    pub fn created_at(&self) -> NaiveDateTime {
        epoch_to_naive(self.iat)
    }
}

fn mint(secret: &str, user_id: i32, token_type: &str, lifetime: i64) -> Minted {
    let now = Utc::now().timestamp();
    let exp = now + lifetime;
    let jti = Uuid::new_v4().simple().to_string(); // uuid4().hex — 32 hex chars
    let claims = TokenClaims {
        token_type: token_type.to_string(),
        exp,
        iat: now,
        jti: jti.clone(),
        user_id,
    };
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("HS256 encode never fails for serializable claims");
    Minted {
        token,
        jti,
        iat: now,
        exp,
    }
}

pub fn mint_access(secret: &str, user_id: i32) -> Minted {
    mint(secret, user_id, "access", ACCESS_LIFETIME_SECS)
}

pub fn mint_refresh(secret: &str, user_id: i32) -> Minted {
    mint(secret, user_id, "refresh", REFRESH_LIFETIME_SECS)
}

fn decode_claims(token: &str, secret: &str) -> Option<TokenClaims> {
    let mut v = Validation::new(Algorithm::HS256);
    v.validate_aud = false;
    decode::<TokenClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &v)
        .ok()
        .map(|d| d.claims)
}

/// Verify signature + `exp` and require `token_type == "refresh"`.
pub fn verify_refresh(token: &str, secret: &str) -> Option<TokenClaims> {
    let claims = decode_claims(token, secret)?;
    (claims.token_type == "refresh").then_some(claims)
}

/// Verify signature + `exp` for any token type (matches SimpleJWT's
/// `UntypedToken` used by the verify endpoint).
pub fn verify_any(token: &str, secret: &str) -> Option<TokenClaims> {
    decode_claims(token, secret)
}

fn epoch_to_naive(secs: i64) -> NaiveDateTime {
    DateTime::<Utc>::from_timestamp(secs, 0)
        .unwrap_or_default()
        .naive_utc()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "test-secret-matching-django";

    #[test]
    fn access_round_trips_with_correct_claims() {
        let minted = mint_access(SECRET, 42);
        let claims = verify_any(&minted.token, SECRET).expect("valid access token");
        assert_eq!(claims.token_type, "access");
        assert_eq!(claims.user_id, 42);
        assert_eq!(claims.jti, minted.jti);
        assert_eq!(claims.exp - claims.iat, ACCESS_LIFETIME_SECS);
        assert_eq!(claims.jti.len(), 32); // uuid4().hex
    }

    #[test]
    fn refresh_round_trips_and_is_typed() {
        let minted = mint_refresh(SECRET, 7);
        let claims = verify_refresh(&minted.token, SECRET).expect("valid refresh token");
        assert_eq!(claims.token_type, "refresh");
        assert_eq!(claims.exp - claims.iat, REFRESH_LIFETIME_SECS);
        // An access token must not satisfy verify_refresh.
        let access = mint_access(SECRET, 7);
        assert!(verify_refresh(&access.token, SECRET).is_none());
    }

    #[test]
    fn rejects_wrong_secret() {
        let minted = mint_access(SECRET, 1);
        assert!(verify_any(&minted.token, "other-secret").is_none());
    }

    #[test]
    fn rejects_tampered_token() {
        let mut t = mint_access(SECRET, 1).token;
        // Flip a character in the payload segment.
        let mid = t.len() / 2;
        let ch = if &t[mid..=mid] == "A" { "B" } else { "A" };
        t.replace_range(mid..=mid, ch);
        assert!(verify_any(&t, SECRET).is_none());
    }
}
