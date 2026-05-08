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

export interface DashboardData {
  user: { username: string; avatar: string | null };
  rated_count: number;
  missing_count: number;
  missing_flavors: MissingFlavor[];
  my_ratings: RatedItem[];
}
