import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface Category {
  name: string;
  slug: string;
}

/**
 * Nav categories. Rarely change, so cached aggressively — one fetch shared by
 * the AppBar drawer and desktop sidebar instead of a raw `useEffect` per mount.
 */
export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const res = await api.get<Category[] | { results: Category[] }>('categories/');
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
    staleTime: 30 * 60_000,
  });
