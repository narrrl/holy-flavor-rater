import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type {
  FlavorDetailData,
  FlavorDetailRating,
  FlavorDetailReply,
} from '../queries/useFlavorDetail';

const invalidateRatingViews = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  qc.invalidateQueries({ queryKey: queryKeys.publicProfileAll() });
  qc.invalidateQueries({ queryKey: queryKeys.flavorsAll() });
  qc.invalidateQueries({ queryKey: ['flavorDetail'] });
  qc.invalidateQueries({ queryKey: ['communityFeed'] });
};

export interface UpdateRatingInput {
  id: number;
  score: number;
  comment: string | null;
}

export const useUpdateRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, score, comment }: UpdateRatingInput) =>
      api.patch(`ratings/${id}/`, { score, comment }),
    onSuccess: () => invalidateRatingViews(qc),
  });
};

export const useDeleteRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`ratings/${id}/`),
    onSuccess: () => invalidateRatingViews(qc),
  });
};

export interface CreateRatingInput {
  flavor: number;
  score: number;
  comment?: string | null;
  /** Author info for the optimistic row shown on the flavor-detail page before
   *  the server round-trip lands. Omit to skip the optimistic insert. */
  optimistic?: { user: string; user_avatar: string | null };
}

export const useCreateRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flavor, score, comment }: CreateRatingInput) =>
      api.post('ratings/', { flavor, score, comment }),
    onMutate: async ({ flavor, score, comment, optimistic }) => {
      if (!optimistic) return;
      const key = queryKeys.flavorDetail(flavor);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FlavorDetailData>(key);
      if (prev) {
        const temp: FlavorDetailRating = {
          id: -Date.now(), // negative temp id; replaced on refetch
          user: optimistic.user,
          user_avatar: optimistic.user_avatar,
          score,
          comment: comment ?? '',
          created_at: new Date().toISOString(),
          replies: [],
        };
        qc.setQueryData<FlavorDetailData>(key, {
          ...prev,
          ratings: [temp, ...prev.ratings],
          user_rating: score,
        });
      }
      return { key, prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => invalidateRatingViews(qc),
  });
};

export interface ReplyInput {
  ratingId: number;
  text: string;
  /** Flavor id + author for the optimistic reply on the flavor-detail page.
   *  Omit either to skip the optimistic insert. */
  flavorId?: number;
  optimisticUser?: string;
}

export const useCreateReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ratingId, text }: ReplyInput) =>
      api.post(`ratings/${ratingId}/reply/`, { text }),
    onMutate: async ({ ratingId, text, flavorId, optimisticUser }) => {
      if (!flavorId || !optimisticUser) return;
      const key = queryKeys.flavorDetail(flavorId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FlavorDetailData>(key);
      if (prev) {
        const temp: FlavorDetailReply = {
          id: -Date.now(), // negative temp id; replaced on refetch
          user: optimisticUser,
          text,
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<FlavorDetailData>(key, {
          ...prev,
          ratings: prev.ratings.map((r) =>
            r.id === ratingId ? { ...r, replies: [...r.replies, temp] } : r,
          ),
        });
      }
      return { key, prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => invalidateRatingViews(qc),
  });
};

export const useDeleteReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => api.delete(`replies/${replyId}/`),
    onSuccess: () => invalidateRatingViews(qc),
  });
};
