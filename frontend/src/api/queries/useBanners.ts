import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface BannerListItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  is_enabled?: boolean;
}

export const useBannersList = () =>
  useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await api.get<BannerListItem[] | { results: BannerListItem[] }>('banners/');
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
    staleTime: 5 * 60_000,
  });
