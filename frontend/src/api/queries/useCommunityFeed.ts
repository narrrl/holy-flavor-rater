import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface FeedReply {
  id: number;
  user: string;
  text: string;
  created_at: string;
}

export interface FeedRating {
  id: number;
  user: string;
  user_id: number;
  user_avatar: string | null;
  flavor: number;
  flavor_name: string;
  flavor_image: string | null;
  category_name: string;
  category_slug: string;
  score: number;
  comment: string;
  created_at: string;
  replies: FeedReply[];
  reactions?: Record<string, number>;
  my_reactions?: string[];
}

export interface FollowedUser {
  id: number;
  username: string;
  avatar: string | null;
}

export interface FollowedTopFlavor {
  id: number;
  name: string;
  image_url: string | null;
  average_rating: number;
}

export interface CommunityFeedResult {
  ratings: FeedRating[];
  totalPages: number;
}

export const useCommunityFeed = (page: number) =>
  useQuery({
    queryKey: queryKeys.communityFeed({ page }),
    queryFn: async (): Promise<CommunityFeedResult> => {
      const res = await api.get<{ results?: FeedRating[]; count?: number } | FeedRating[]>(
        `ratings/feed/?page=${page}`,
      );
      if (Array.isArray(res.data)) {
        return { ratings: res.data, totalPages: 1 };
      }
      const ratings = res.data.results ?? [];
      const totalPages = Math.ceil((res.data.count ?? 0) / 10) || 1;
      return { ratings, totalPages };
    },
    placeholderData: (prev) => prev,
  });

export interface ActivityItem {
  kind: 'new_flavor' | 'milestone';
  id: string;
  created_at: string;
  flavor_id: number;
  flavor_name: string;
  flavor_image: string | null;
  category_name: string;
  category_slug: string;
  milestone?: number;
  rating_count?: number;
}

export interface ActivityResult {
  items: ActivityItem[];
  totalPages: number;
}

/** Community activity stream — new-flavor drops + rating milestones, paginated. */
export const useActivityFeed = (page: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.communityActivity({ page }),
    queryFn: async (): Promise<ActivityResult> => {
      const res = await api.get<{ results?: ActivityItem[]; count?: number } | ActivityItem[]>(
        `activity/?page=${page}`,
      );
      if (Array.isArray(res.data)) {
        return { items: res.data, totalPages: 1 };
      }
      const items = res.data.results ?? [];
      const totalPages = Math.ceil((res.data.count ?? 0) / 10) || 1;
      return { items, totalPages };
    },
    enabled,
    placeholderData: (prev) => prev,
  });

export type DiscoverSort = 'recent' | 'top';

export interface DiscoverParams {
  page: number;
  sort: DiscoverSort;
  category: string | null;
  enabled?: boolean;
}

/**
 * Global Discover feed (`ratings/discover/`) — paginated, sortable (recent|top),
 * filterable by category slug. Unlike `useRecentRatings` this is a real paginated
 * feed, so the Discover tab gets sort + filter + pages.
 */
export const useDiscoverFeed = ({ page, sort, category, enabled = true }: DiscoverParams) =>
  useQuery({
    queryKey: queryKeys.communityDiscover({ page, sort, category: category ?? '' }),
    queryFn: async (): Promise<CommunityFeedResult> => {
      const qs = new URLSearchParams({ page: String(page), sort });
      if (category) qs.set('category', category);
      const res = await api.get<{ results?: FeedRating[]; count?: number } | FeedRating[]>(
        `ratings/discover/?${qs.toString()}`,
      );
      if (Array.isArray(res.data)) {
        return { ratings: res.data, totalPages: 1 };
      }
      const ratings = res.data.results ?? [];
      const totalPages = Math.ceil((res.data.count ?? 0) / 10) || 1;
      return { ratings, totalPages };
    },
    enabled,
    placeholderData: (prev) => prev,
  });

export const useRecentRatings = (enabled = true) =>
  useQuery({
    queryKey: ['recentRatings'],
    queryFn: async (): Promise<FeedRating[]> => {
      const res = await api.get<FeedRating[] | { results: FeedRating[] }>('ratings/recent/');
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
    enabled,
  });

export const useFollowingList = () =>
  useQuery({
    queryKey: ['followingList'],
    queryFn: async () => {
      const res = await api.get<FollowedUser[] | { results: FollowedUser[] }>(
        'users/following_list/',
      );
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
  });

export interface SuggestedUser {
  id: number;
  username: string;
  avatar: string | null;
  followers_count: number;
  is_following: boolean;
}

/** Who-to-follow: most-active raters the caller doesn't follow yet (max 5). */
export const useSuggestedUsers = (enabled = true) =>
  useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: async (): Promise<SuggestedUser[]> => {
      const res = await api.get<SuggestedUser[] | { results: SuggestedUser[] }>('users/suggested/');
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
    enabled,
  });

export const useFollowedTopFlavors = () =>
  useQuery({
    queryKey: ['followedTopFlavors'],
    queryFn: async () => {
      const res = await api.get<FollowedTopFlavor[]>('flavors/followed_top/');
      return Array.isArray(res.data) ? res.data.slice(0, 5) : [];
    },
  });
