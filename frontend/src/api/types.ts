import type { components } from './schema';

export type Schemas = components['schemas'];

// Re-exported from generated OpenAPI schema.
// Regenerate with `npm run openapi:sync` after backend serializer changes.
export type Banner = Schemas['Banner'];
export type Category = Schemas['Category'];
export type Flavor = Schemas['Flavor'];
export type Notification = Schemas['Notification'];
export type Rating = Schemas['Rating'];
export type Reply = Schemas['Reply'];
export type Ticket = Schemas['Ticket'];
export type TicketMessage = Schemas['TicketMessage'];
export type User = Schemas['User'];

// `BannerConfig` was the legacy alias for the Banner schema; kept for callers.
export type BannerConfig = Banner;
// `RatedItem` was the legacy alias for Rating in dashboard payload.
export type RatedItem = Rating;

// Custom (non-DRF-serialized) shapes for endpoints without a serializer_class.
export interface MissingFlavor {
  id: number;
  name: string;
  image_url: string | null;
  category_name: string;
  category_slug: string;
  average_rating: number;
  followed_average_rating?: number;
  is_legacy?: boolean;
  is_available?: boolean;
}

export interface FavoriteCategory {
  name: string;
  slug: string;
  count: number;
}

export interface DashboardStats {
  average_score: number | null;
  /** Count per score, keyed "1".."10". */
  score_distribution: Record<string, number>;
  favorite_category: FavoriteCategory | null;
  ratings_this_month: number;
  category_count: number;
}

export interface Recommendation {
  id: number;
  name: string;
  image_url: string | null;
  category_name: string;
  category_slug: string;
  average_rating: number | null;
  is_legacy: boolean;
  is_available: boolean;
  predicted_score: number;
  /** "N tasters like you" count (cf) or rating count (popular). */
  contributing_neighbours: number;
  /** "cf" | "popular" — frontend picks the reason copy. */
  reason: 'cf' | 'popular';
}

export interface DashboardData {
  user: { username: string; avatar: string | null };
  rated_count: number;
  missing_count: number;
  my_ratings: RatedItem[];
  stats: DashboardStats;
}

/** Item-based "people who liked this flavor also liked…" card. */
export interface SimilarFlavor {
  id: number;
  name: string;
  image_url: string | null;
  category_name: string;
  category_slug: string;
  average_rating: number | null;
  is_legacy: boolean;
  is_available: boolean;
  /** Adjusted-cosine similarity to the target flavor, in (0, 1]. */
  similarity: number;
  /** Users who rated both this flavor and the target. */
  co_raters: number;
}
