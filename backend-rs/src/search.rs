//! Port of `api/services/search.py` (category-keyword extraction + relevance).

/// (keyword, category-slug) pairs, matched as substrings of the query.
const CATEGORY_KEYWORDS: &[(&str, &str)] = &[
    ("iced tea", "iced-tea"),
    ("eistee", "iced-tea"),
    ("energy", "energy"),
    ("hydration", "hydration"),
    ("milkshake", "milkshake"),
];

/// Returns (matched category slug, remaining query with keyword removed).
pub fn extract_category_slug(query: &str) -> (Option<String>, String) {
    let lowered = query.to_lowercase();
    let lowered = lowered.trim();
    for (kw, slug) in CATEGORY_KEYWORDS {
        if lowered.contains(kw) {
            let remaining = lowered.replace(kw, "");
            return (Some(slug.to_string()), remaining.trim().to_string());
        }
    }
    (None, lowered.to_string())
}

/// Significant (len > 2) words from the remaining query, for icontains matching.
pub fn query_words(remaining: &str) -> Vec<String> {
    remaining
        .split_whitespace()
        .filter(|w| w.len() > 2)
        .map(|w| w.to_string())
        .collect()
}

pub fn score_relevance(name: &str, query: &str) -> i32 {
    let name = name.to_lowercase();
    if name == query {
        3
    } else if name.starts_with(query) {
        2
    } else if name.contains(query) {
        1
    } else {
        0
    }
}
