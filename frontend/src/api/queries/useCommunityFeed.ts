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

export const useFollowedTopFlavors = () =>
  useQuery({
    queryKey: ['followedTopFlavors'],
    queryFn: async () => {
      const res = await api.get<FollowedTopFlavor[]>('flavors/followed_top/');
      return Array.isArray(res.data) ? res.data.slice(0, 5) : [];
    },
  });
