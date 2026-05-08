import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface FlavorListRating {
  id: number;
  user: string;
  score: number;
  comment: string;
  created_at: string;
}

export interface FlavorListItem {
  id: number;
  name: string;
  category_name: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: FlavorListRating[];
  image_url: string | null;
  is_available: boolean;
  is_legacy?: boolean;
  shop_url: string | null;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

const unwrap = <T>(data: T[] | { results?: T[] }): T[] =>
  Array.isArray(data) ? data : (data.results ?? []);

export const useFlavorsList = () =>
  useQuery({
    queryKey: queryKeys.flavors({ scope: 'all' }),
    queryFn: async () => {
      const res = await api.get<FlavorListItem[] | { results: FlavorListItem[] }>('flavors/');
      return unwrap(res.data);
    },
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<CategoryItem[] | { results: CategoryItem[] }>('categories/');
      return unwrap(res.data);
    },
    staleTime: 5 * 60_000,
  });
