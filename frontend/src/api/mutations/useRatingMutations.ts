import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

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
}

export const useCreateRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRatingInput) => api.post('ratings/', input),
    onSuccess: () => invalidateRatingViews(qc),
  });
};

export interface ReplyInput {
  ratingId: number;
  text: string;
}

export const useCreateReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ratingId, text }: ReplyInput) =>
      api.post(`ratings/${ratingId}/reply/`, { text }),
    onSuccess: () => invalidateRatingViews(qc),
  });
};

export const useDeleteReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => api.delete(`replies/${replyId}/`),
    onSuccess: () => invalidateRatingViews(qc),
  });
};
