import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface MainPageRating {
  id: number;
  user: string;
  user_avatar: string | null;
  flavor: number;
  flavor_name: string;
  flavor_image: string | null;
  flavor_category?: string;
  score: number;
  comment: string;
  created_at: string;
  replies?: unknown[];
}

export interface MainPageFlavor {
  id: number;
  name: string;
  category_name: string;
  category_slug: string;
  description: string;
  average_rating: number;
  image_url: string | null;
  is_available: boolean;
  is_legacy: boolean;
  ratings: MainPageRating[];
}

export interface MainPageReview {
  id: number;
  user: string;
  user_avatar: string | null;
  flavor_name: string;
  flavor_image: string | null;
  score: number;
  comment: string;
  created_at: string;
  flavor: number;
}

const unwrap = <T>(data: T[] | { results?: T[] }): T[] =>
  Array.isArray(data) ? data : (data.results ?? []);

export const useTopFlavors = (categorySlug: string | null = null) =>
  useQuery({
    queryKey: queryKeys.flavors({ scope: 'top', category: categorySlug ?? '' }),
    queryFn: async () => {
      const url = categorySlug ? `flavors/top/?category=${categorySlug}` : 'flavors/top/';
      const res = await api.get<MainPageFlavor[] | { results: MainPageFlavor[] }>(url);
      return unwrap(res.data);
    },
  });

export const useNewestFlavors = () =>
  useQuery({
    queryKey: queryKeys.flavors({ scope: 'newest' }),
    queryFn: async () => {
      const res = await api.get<MainPageFlavor[] | { results: MainPageFlavor[] }>(
        'flavors/newest/',
      );
      return unwrap(res.data);
    },
  });

export const useRecentReviews = () =>
  useQuery({
    queryKey: ['recentReviews'],
    queryFn: async () => {
      const res = await api.get<MainPageReview[] | { results: MainPageReview[] }>(
        'ratings/recent/',
      );
      return unwrap(res.data);
    },
  });

export const useFollowingFeedTop = (enabled: boolean) =>
  useQuery({
    queryKey: ['followingFeedTop'],
    queryFn: async () => {
      const res = await api.get<MainPageRating[] | { results: MainPageRating[] }>('ratings/feed/');
      return unwrap(res.data).slice(0, 6);
    },
    enabled,
  });

export const useFlavorSearch = (query: string) =>
  useQuery({
    queryKey: queryKeys.flavors({ scope: 'search', q: query }),
    queryFn: async () => {
      const res = await api.get<MainPageFlavor[] | { results: MainPageFlavor[] }>(
        `flavors/?search=${encodeURIComponent(query)}`,
      );
      return unwrap(res.data);
    },
    enabled: !!query,
  });
