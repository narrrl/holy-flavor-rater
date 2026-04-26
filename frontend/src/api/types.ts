export interface Reply {
  id: number;
  user: string;
  text: string;
  created_at: string;
}

export interface RatedItem {
  id: number;
  flavor: number;
  flavor_name: string;
  flavor_image: string | null;
  category_name: string;
  category_slug: string;
  score: number;
  comment: string | null;
  created_at: string;
  replies: Reply[];
  is_legacy?: boolean;
  is_available?: boolean;
}

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

export interface BannerConfig {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  settings: Record<string, unknown> | null;
}

export interface NotificationItem {
  id: number;
  verb: string;
  actor: string;
  target: string | null;
  url: string | null;
  is_read: boolean;
  created_at: string;
}
