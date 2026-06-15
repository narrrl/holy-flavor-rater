import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { SimilarFlavor } from '../types';

/**
 * "People who liked this flavor also liked…" — item-based collaborative filtering
 * (backend `GET /flavors/{id}/similar/`). Public (no auth needed); the result moves
 * slowly with the rating matrix, so a long staleTime is fine.
 */
export const useSimilarFlavors = (flavorId: number | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.similarFlavors(flavorId ?? 0),
    queryFn: async () => {
      const res = await api.get<SimilarFlavor[]>(`flavors/${flavorId}/similar/`);
      return res.data;
    },
    enabled: enabled && flavorId != null,
    staleTime: 5 * 60_000,
  });
