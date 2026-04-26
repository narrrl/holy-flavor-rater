import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface FlavorDetailReply {
  id: number;
  user: string;
  text: string;
  created_at: string;
}

export interface FlavorDetailRating {
  id: number;
  user: string;
  user_avatar: string | null;
  score: number;
  comment: string;
  created_at: string;
  replies: FlavorDetailReply[];
}

export interface FlavorDetailData {
  id: number;
  name: string;
  category_name: string;
  category_slug: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: FlavorDetailRating[];
  image_url: string | null;
  image_urls: string[];
  rating_distribution: Record<string, number>;
  is_available: boolean;
  is_legacy: boolean;
  shop_url: string | null;
}

export const useFlavorDetail = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.flavorDetail(id ?? ''),
    queryFn: async () => {
      const res = await api.get<FlavorDetailData>(`flavors/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });
