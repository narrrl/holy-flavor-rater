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

export const useUpdateReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, text }: { replyId: number; text: string }) =>
      api.patch(`replies/${replyId}/`, { text }),
    onSuccess: () => invalidateRatingViews(qc),
  });
};
