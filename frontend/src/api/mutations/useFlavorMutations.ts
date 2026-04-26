import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

export interface UpdateFlavorInput {
  id: string | number;
  data: Record<string, unknown> | FormData;
  isFormData?: boolean;
}

export const useUpdateFlavor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, isFormData }: UpdateFlavorInput) =>
      api.patch(
        `flavors/${id}/`,
        data,
        isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.flavorDetail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.flavorsAll() });
    },
  });
};
