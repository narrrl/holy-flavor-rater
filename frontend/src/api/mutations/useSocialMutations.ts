import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export const useFollowToggle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, currentlyFollowing }: { userId: number; currentlyFollowing: boolean }) =>
      api.post(`users/${userId}/${currentlyFollowing ? 'unfollow' : 'follow'}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicProfileAll() });
    },
  });
};

export const useAddProfileComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, text }: { userId: number; text: string }) =>
      api.post(`users/${userId}/add_comment/`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicProfileAll() });
    },
  });
};

export const useDeleteProfileComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, commentId }: { userId: number; commentId: number }) =>
      api.delete(`users/${userId}/delete_comment/${commentId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicProfileAll() });
    },
  });
};
