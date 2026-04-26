import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { BannerConfig } from '../types';

export const useActiveBanner = (username: string) =>
  useQuery({
    queryKey: queryKeys.activeBanner(username),
    queryFn: async () => {
      const res = await api.get<BannerConfig>('banners/active/', { params: { username } });
      return res.data;
    },
    enabled: !!username,
    staleTime: 5 * 60_000,
  });
