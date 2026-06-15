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

type Paginated<T> = { results?: T[]; next?: string | null };

const unwrap = <T>(data: T[] | Paginated<T>): T[] =>
  Array.isArray(data) ? data : (data.results ?? []);

// Backend paginates flavors/ (50/page). Follow `next` to collect every flavor,
// otherwise consumers (e.g. the merge tool) only see the first page.
const fetchAllFlavors = async (): Promise<FlavorListItem[]> => {
  const all: FlavorListItem[] = [];
  let url: string | null = 'flavors/';
  while (url) {
    const res: { data: FlavorListItem[] | Paginated<FlavorListItem> } = await api.get<
      FlavorListItem[] | Paginated<FlavorListItem>
    >(url);
    all.push(...unwrap(res.data));
    const next = Array.isArray(res.data) ? null : (res.data.next ?? null);
    // `next` is an absolute URL; api baseURL already covers the prefix, so use the relative tail.
    url = next ? next.replace(/^.*\/api\//, '') : null;
  }
  return all;
};

export const useFlavorsList = () =>
  useQuery({
    queryKey: queryKeys.flavors({ scope: 'all' }),
    queryFn: fetchAllFlavors,
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
