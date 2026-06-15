//! Django `AUTH_PASSWORD_VALIDATORS` ported faithfully.
//!
//! Django *configures* the four default validators
//! (`UserAttributeSimilarityValidator`, `MinimumLengthValidator`,
//! `CommonPasswordValidator`, `NumericPasswordValidator`) with default options,
//! but this project's DRF views never actually call `validate_password`, so the
//! live Django backend accepts any non-empty password at signup and anything at
//! all on change/reset. Enforcing the validators here is therefore a deliberate
//! hardening step that *diverges* from the current Django behaviour (chosen by
//! the maintainer): a password Django would accept may be rejected by Rust.
//!
//! [`validate`] aggregates every failing validator's message in the same order
//! Django's settings list them, mirroring `validate_password`'s behaviour of
//! raising a `ValidationError` containing all errors.

use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::sync::OnceLock;

const MIN_LENGTH: usize = 8;
const MAX_SIMILARITY: f64 = 0.7;

/// User attributes the similarity validator compares against. Empty values are
/// skipped (mirrors Django ignoring falsy attributes). The verbose names match
/// Django's `AbstractUser` field `verbose_name`s so error text is identical.
pub struct UserAttrs<'a> {
    pub username: &'a str,
    pub first_name: &'a str,
    pub last_name: &'a str,
    pub email: &'a str,
}

/// Validate `password` against all four validators. Returns the list of
/// human-readable error messages; empty means the password is acceptable.
pub fn validate(password: &str, attrs: &UserAttrs) -> Vec<String> {
    let mut errors = Vec::new();
    // Order matches settings.AUTH_PASSWORD_VALIDATORS.
    if let Err(e) = too_similar(password, attrs) {
        errors.push(e);
    }
    if let Err(e) = min_length(password) {
        errors.push(e);
    }
    if let Err(e) = too_common(password) {
        errors.push(e);
    }
    if let Err(e) = entirely_numeric(password) {
        errors.push(e);
    }
    errors
}

/// `MinimumLengthValidator(min_length=8)`. Length is counted in characters, like
/// Python's `len()` over a `str`.
fn min_length(password: &str) -> Result<(), String> {
    if password.chars().count() < MIN_LENGTH {
        Err(format!(
            "This password is too short. It must contain at least {MIN_LENGTH} characters."
        ))
    } else {
        Ok(())
    }
}

/// `NumericPasswordValidator`. Mirrors Python `str.isdigit()`, which is false for
/// the empty string and true only when every character is a digit.
fn entirely_numeric(password: &str) -> Result<(), String> {
    if !password.is_empty() && password.chars().all(|c| c.is_ascii_digit()) {
        Err("This password is entirely numeric.".to_string())
    } else {
        Ok(())
    }
}

/// `CommonPasswordValidator`. Django compares `password.lower().strip()` against
/// the shipped 20k-entry list.
fn too_common(password: &str) -> Result<(), String> {
    let normalized = password.to_lowercase();
    if common_passwords().contains(normalized.trim()) {
        Err("This password is too common.".to_string())
    } else {
        Ok(())
    }
}

/// Django's `common-passwords.txt.gz`, decompressed once and cached. Embedded in
/// the binary so there's no runtime file dependency.
fn common_passwords() -> &'static HashSet<String> {
    static SET: OnceLock<HashSet<String>> = OnceLock::new();
    SET.get_or_init(|| {
        let gz: &[u8] = include_bytes!("../assets/common-passwords.txt.gz");
        let mut decoder = flate2::read::GzDecoder::new(gz);
        let mut contents = String::new();
        decoder
            .read_to_string(&mut contents)
            .expect("embedded common-passwords list must decompress");
        contents.lines().map(|l| l.trim().to_string()).collect()
    })
}

/// `UserAttributeSimilarityValidator(max_similarity=0.7)`. Compares the password
/// against each attribute and its `\W+`-split components.
fn too_similar(password: &str, attrs: &UserAttrs) -> Result<(), String> {
    let password = password.to_lowercase();
    let candidates = [
        (attrs.username, "username"),
        (attrs.first_name, "first name"),
        (attrs.last_name, "last name"),
        (attrs.email, "email address"),
    ];

    for (value, verbose_name) in candidates {
        if value.is_empty() {
            continue;
        }
        let value_lower = value.to_lowercase();
        let mut value_parts = split_non_word(&value_lower);
        value_parts.push(value_lower);
        for part in &value_parts {
            if exceeds_maximum_length_ratio(&password, MAX_SIMILARITY, part) {
                continue;
            }
            if quick_ratio(&password, part) >= MAX_SIMILARITY {
                return Err(format!(
                    "The password is too similar to the {verbose_name}."
                ));
            }
        }
    }
    Ok(())
}

/// Port of Django's `exceeds_maximum_length_ratio`: a cheap pre-filter that lets
/// the validator skip the ratio computation when the attribute is far shorter
/// than the password (in which case the similarity can't reach the threshold).
fn exceeds_maximum_length_ratio(password: &str, max_similarity: f64, value: &str) -> bool {
    let pwd_len = password.chars().count();
    let length_bound_similarity = max_similarity / 2.0 * pwd_len as f64;
    let value_len = value.chars().count();
    pwd_len >= 10 * value_len && (value_len as f64) < length_bound_similarity
}

/// Port of `difflib.SequenceMatcher.quick_ratio`: an upper bound on the real
/// ratio, computed as `2 * |multiset intersection| / (len(a) + len(b))`.
fn quick_ratio(a: &str, b: &str) -> f64 {
    let mut fullbcount: HashMap<char, i32> = HashMap::new();
    for c in b.chars() {
        *fullbcount.entry(c).or_insert(0) += 1;
    }
    let mut avail: HashMap<char, i32> = HashMap::new();
    let mut matches = 0i32;
    for c in a.chars() {
        let numb = match avail.get(&c) {
            Some(&n) => n,
            None => *fullbcount.get(&c).unwrap_or(&0),
        };
        avail.insert(c, numb - 1);
        if numb > 0 {
            matches += 1;
        }
    }
    let total = a.chars().count() + b.chars().count();
    if total == 0 {
        1.0
    } else {
        2.0 * matches as f64 / total as f64
    }
}

/// Equivalent of Python `re.split(r"\W+", s)`: split on maximal runs of
/// non-word characters (`\w` = alphanumeric or underscore), preserving the empty
/// strings that appear when `s` begins or ends with a separator.
fn split_non_word(s: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut token = String::new();
    let mut in_sep = false;
    for c in s.chars() {
        if c.is_alphanumeric() || c == '_' {
            in_sep = false;
            token.push(c);
        } else if !in_sep {
            result.push(std::mem::take(&mut token));
            in_sep = true;
        }
    }
    result.push(token);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn attrs<'a>(username: &'a str, email: &'a str) -> UserAttrs<'a> {
        UserAttrs {
            username,
            first_name: "",
            last_name: "",
            email,
        }
    }

    #[test]
    fn rejects_empty_and_short() {
        let a = attrs("alice", "alice@example.com");
        assert!(validate("", &a).iter().any(|e| e.contains("too short")));
        assert!(validate("abc", &a).iter().any(|e| e.contains("too short")));
    }

    #[test]
    fn rejects_entirely_numeric() {
        let a = attrs("alice", "alice@example.com");
        let errs = validate("12345678", &a);
        assert!(errs.iter().any(|e| e.contains("entirely numeric")));
    }

    #[test]
    fn rejects_common_password() {
        let a = attrs("alice", "alice@example.com");
        // "password" is in Django's list.
        assert!(validate("password", &a)
            .iter()
            .any(|e| e.contains("too common")));
    }

    #[test]
    fn rejects_similar_to_username() {
        let a = attrs("alexander", "alex@example.com");
        assert!(validate("alexander1", &a)
            .iter()
            .any(|e| e.contains("too similar")));
    }

    #[test]
    fn rejects_similar_to_email_local_part() {
        let a = attrs("zzz", "supersecret@example.com");
        // Matches the email local-part component after \W+ split.
        assert!(validate("supersecret", &a)
            .iter()
            .any(|e| e.contains("too similar")));
    }

    #[test]
    fn accepts_strong_password() {
        let a = attrs("alice", "alice@example.com");
        assert!(validate("Tr0ub4dour-x9Qz", &a).is_empty());
    }

    #[test]
    fn quick_ratio_matches_difflib_examples() {
        // SequenceMatcher(a='', b='').quick_ratio() == 1.0
        assert_eq!(quick_ratio("", ""), 1.0);
        // Identical strings → 1.0
        assert_eq!(quick_ratio("abc", "abc"), 1.0);
        // Disjoint → 0.0
        assert_eq!(quick_ratio("abc", "xyz"), 0.0);
    }

    #[test]
    fn split_non_word_matches_re_split() {
        assert_eq!(split_non_word("john"), vec!["john"]);
        assert_eq!(split_non_word("a.b"), vec!["a", "b"]);
        assert_eq!(split_non_word(".a"), vec!["", "a"]);
        assert_eq!(split_non_word("a."), vec!["a", ""]);
        assert_eq!(
            split_non_word("john.doe@example.com"),
            vec!["john", "doe", "example", "com"]
        );
    }
}
