import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { FlavorListItem } from './useFlavorsList';

export const useCategoryFlavors = (slug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.flavors({ category: slug ?? '' }),
    queryFn: async () => {
      const res = await api.get<FlavorListItem[] | { results: FlavorListItem[] }>(
        `flavors/?category__slug=${slug}`,
      );
      const data = res.data;
      return Array.isArray(data) ? data : (data.results ?? []);
    },
    enabled: !!slug,
  });
