from django.db.models import Q, QuerySet

from api.models import Flavor

CATEGORY_KEYWORDS: dict[str, str] = {
    "iced tea": "iced-tea",
    "eistee": "iced-tea",
    "energy": "energy",
    "hydration": "hydration",
    "milkshake": "milkshake",
}


def extract_category_slug(query: str) -> tuple[str | None, str]:
    lowered = query.lower().strip()
    for keyword, slug in CATEGORY_KEYWORDS.items():
        if keyword in lowered:
            return slug, lowered.replace(keyword, "").strip()
    return None, lowered


def filter_flavors_by_query(queryset: QuerySet[Flavor], query: str) -> QuerySet[Flavor]:
    slug, remaining = extract_category_slug(query)
    if slug:
        queryset = queryset.filter(category__slug=slug)
    if remaining:
        word_query = Q()
        for word in remaining.split():
            if len(word) > 2:
                word_query |= Q(name__icontains=word) | Q(description__icontains=word)
        if word_query:
            queryset = queryset.filter(word_query)
    return queryset


def score_relevance(name: str, query: str) -> int:
    name_lower = name.lower()
    if name_lower == query:
        return 3
    if name_lower.startswith(query):
        return 2
    if query in name_lower:
        return 1
    return 0
