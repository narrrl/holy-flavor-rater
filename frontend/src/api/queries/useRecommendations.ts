import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { Recommendation } from '../types';

/**
 * "Tasters like you also liked…" — user-based collaborative filtering with a
 * popularity cold-start fallback (backend `GET /users/recommendations/`). Enabled
 * only when logged in; recommendations shift slowly, so a long staleTime is fine.
 */
export const useRecommendations = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.recommendations(),
    queryFn: async () => {
      const res = await api.get<Recommendation[]>('users/recommendations/');
      return res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });

/**
 * Public "popular picks" — the recommender's Bayesian-popularity ranking over the
 * whole catalog (backend `GET /flavors/popular/`), used for logged-out front-page
 * discovery. Same payload shape as {@link useRecommendations}; every row is
 * `reason: "popular"`. Popularity shifts slowly, so a long staleTime is fine.
 */
export const usePopularRecommendations = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.popularRecommendations(),
    queryFn: async () => {
      const res = await api.get<Recommendation[]>('flavors/popular/');
      return res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
