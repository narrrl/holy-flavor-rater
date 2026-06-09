//! httpOnly JWT cookie strings, matching Django's `set_jwt_cookies` /
//! `clear_jwt_cookies`. Names and attributes mirror `settings.JWT_AUTH_COOKIE_*`
//! so the same cookies are interchangeable between the Django and Rust backends.

pub const COOKIE_ACCESS: &str = "access_token";
pub const COOKIE_REFRESH: &str = "refresh_token";
const COOKIE_PATH: &str = "/";
const SAMESITE: &str = "Lax"; // JWT_AUTH_COOKIE_SAMESITE

/// Build a `Set-Cookie` value for an auth cookie with the given max-age (secs).
pub fn set_cookie(name: &str, value: &str, max_age: i64, secure: bool) -> String {
    let mut s = format!(
        "{name}={value}; Max-Age={max_age}; Path={COOKIE_PATH}; HttpOnly; SameSite={SAMESITE}"
    );
    if secure {
        s.push_str("; Secure");
    }
    s
}

/// Build a `Set-Cookie` value that clears the cookie (empty value, expired).
pub fn clear_cookie(name: &str, secure: bool) -> String {
    let mut s = format!(
        "{name}=; Max-Age=0; Path={COOKIE_PATH}; HttpOnly; SameSite={SAMESITE}; \
         expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    if secure {
        s.push_str("; Secure");
    }
    s
}

/// Read a cookie value out of a `Cookie:` header string.
pub fn cookie_value(cookie_header: &str, name: &str) -> Option<String> {
    let prefix = format!("{name}=");
    cookie_header
        .split(';')
        .map(str::trim)
        .find_map(|kv| kv.strip_prefix(&prefix).map(str::to_string))
}
