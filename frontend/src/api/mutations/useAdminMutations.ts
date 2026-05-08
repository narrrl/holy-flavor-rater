import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const invalidateAdmin = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['adminStats'] });
  qc.invalidateQueries({ queryKey: ['adminUsers'] });
  qc.invalidateQueries({ queryKey: ['adminJobs'] });
  qc.invalidateQueries({ queryKey: ['adminConfig'] });
};

export const useUpdateAdminConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.patch('admin-custom/config/', { [key]: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminConfig'] });
    },
  });
};

export const useTriggerJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`admin-custom/${id}/trigger_job/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });
};

export const useUpdateJobSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.patch(`admin-custom/${id}/update_job_schedule/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });
};

export const useActivateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`banners/${id}/activate/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['activeBanner'] });
    },
  });
};

export const useToggleBannerEnabled = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`banners/${id}/toggle_enabled/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
  });
};

export const useSendTestEmail = () =>
  useMutation({
    mutationFn: () => api.post('admin-custom/send_test_email/'),
  });

export const useToggleUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string | number; isActive: boolean }) =>
      api.patch(`admin-custom/${id}/user_detail/`, { is_active: !isActive }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['adminUserDetail', String(vars.id)] });
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => api.delete(`admin-custom/${id}/user_detail/`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['adminUserDetail', String(id)] });
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      invalidateAdmin(qc);
    },
  });
};
