import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { Notification } from '../queries/useNotifications';

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('notifications/mark_all_read/'),
    onSuccess: () => {
      qc.setQueryData<Notification[]>(queryKeys.notifications(), (old) =>
        old?.map((n) => ({ ...n, is_read: true })),
      );
    },
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`notifications/${id}/mark_read/`),
    onSuccess: (_, id) => {
      qc.setQueryData<Notification[]>(queryKeys.notifications(), (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    },
  });
};
