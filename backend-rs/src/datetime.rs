use chrono::{NaiveDateTime, Timelike, Utc};

/// Current UTC time truncated to microsecond precision. Django stores datetimes
/// with 6 fractional digits; SeaORM/sqlx would otherwise persist nanoseconds,
/// so truncate before inserting to keep the on-disk format identical.
pub fn now_micros() -> NaiveDateTime {
    let now = Utc::now().naive_utc();
    now.with_nanosecond(now.nanosecond() / 1000 * 1000).unwrap_or(now)
}

/// Format a naive-UTC datetime exactly as DRF serializes an aware UTC
/// `DateTimeField`: ISO-8601 with microseconds and a `Z` suffix, e.g.
/// `2026-04-11T00:37:59.496766Z`.
///
/// Caveat: DRF (Python `isoformat`) omits the fractional part when microseconds
/// are zero. We always emit 6 digits; verify against live responses if any
/// client parses strictly.
pub fn drf_iso(dt: &NaiveDateTime) -> String {
    dt.format("%Y-%m-%dT%H:%M:%S%.6fZ").to_string()
}

/// Format a naive-UTC datetime the way Django writes datetimes into SQLite:
/// `2026-04-11 00:37:59.496766` (space separator, 6 fractional digits, no `Z`).
/// Used when inserting token-blacklist rows so they match Django's ORM writes.
pub fn db_datetime(dt: &NaiveDateTime) -> String {
    dt.format("%Y-%m-%d %H:%M:%S%.6f").to_string()
}
