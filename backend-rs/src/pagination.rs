//! DRF `PageNumberPagination` compatibility: `{ count, next, previous, results }`
//! with `page` query param and a fixed page size (DRF default 50; the flavor
//! list uses that default).

use serde::Serialize;

use crate::web::RequestCtx;

pub const DEFAULT_PAGE_SIZE: u64 = 50;

#[derive(Serialize)]
pub struct Paginated<T: Serialize> {
    pub count: u64,
    pub next: Option<String>,
    pub previous: Option<String>,
    pub results: Vec<T>,
}

/// Parse the `page` query value (DRF is 1-indexed; defaults to 1).
pub fn parse_page(raw: Option<&str>) -> u64 {
    raw.and_then(|s| s.parse::<u64>().ok())
        .filter(|p| *p >= 1)
        .unwrap_or(1)
}

fn with_page(ctx: &RequestCtx, page: u64) -> String {
    // Split off existing query, drop any prior `page=`, then re-add.
    let (path, query) = match ctx.full_path.split_once('?') {
        Some((p, q)) => (p, q),
        None => (ctx.full_path.as_str(), ""),
    };
    let mut pairs: Vec<String> = query
        .split('&')
        .filter(|kv| !kv.is_empty() && !kv.starts_with("page="))
        .map(|kv| kv.to_string())
        .collect();
    if page > 1 {
        pairs.push(format!("page={page}"));
    }
    let q = pairs.join("&");
    let rel = if q.is_empty() {
        path.to_string()
    } else {
        format!("{path}?{q}")
    };
    ctx.absolute(&rel)
}

impl<T: Serialize> Paginated<T> {
    pub fn build(ctx: &RequestCtx, results: Vec<T>, count: u64, page: u64, page_size: u64) -> Self {
        let total_pages = count.div_ceil(page_size.max(1));
        let next = if page < total_pages {
            Some(with_page(ctx, page + 1))
        } else {
            None
        };
        let previous = if page > 1 {
            Some(with_page(ctx, page - 1))
        } else {
            None
        };
        Paginated {
            count,
            next,
            previous,
            results,
        }
    }
}
