import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface PublicProfileRating {
  id: number;
  flavor: number;
  flavor_name: string;
  flavor_image: string | null;
  category_name: string;
  score: number;
  comment: string;
  created_at: string;
}

export interface ProfileComment {
  id: number;
  author_username: string;
  author_avatar: string | null;
  text: string;
  created_at: string;
}

export interface MiniUser {
  id: number;
  username: string;
  avatar: string | null;
  is_following?: boolean;
}

export interface ProfileData {
  id: number;
  username: string;
  theme: string;
  avatar: string | null;
  following_count: number;
  followers_count: number;
  is_following: boolean;
  ratings: PublicProfileRating[];
  comments: ProfileComment[];
  followers: MiniUser[];
  following: MiniUser[];
}

export const usePublicProfile = (username: string | undefined) =>
  useQuery({
    queryKey: queryKeys.publicProfile(username ?? ''),
    queryFn: async () => {
      const res = await api.get<ProfileData>(`users/profile/${username}/`);
      return res.data;
    },
    enabled: !!username,
  });
