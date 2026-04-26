import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const invalidateMe = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['me'] });
  qc.invalidateQueries({ queryKey: ['currentUserLite'] });
};

export const useUpdateAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.post<{ avatar: string }>('users/update_avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => invalidateMe(qc),
  });
};

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Record<string, unknown>) => api.patch('users/update_preferences/', prefs),
    onSuccess: () => invalidateMe(qc),
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; email: string }) =>
      api.patch<{ message?: string }>('users/update_profile/', input),
    onSuccess: () => invalidateMe(qc),
  });
};

export const useConfirmEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<{ email: string }>('users/confirm_email/', { code }),
    onSuccess: () => invalidateMe(qc),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (input: { old_password: string; new_password: string }) =>
      api.post('users/change_password/', input),
  });

export const useRequestAccountDeletion = () =>
  useMutation({
    mutationFn: () => api.post('users/request_account_deletion/'),
  });

export const useConfirmAccountDeletion = () =>
  useMutation({
    mutationFn: (code: string) => api.post('users/confirm_account_deletion/', { code }),
  });
