import { createContext, useCallback, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { queryKeys } from '../api/keys';
import { useNotificationsQuery, type Notification } from '../api/queries/useNotifications';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../api/mutations/useMarkNotifications';

export type { Notification };

export interface NotificationContextValue {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, setUser, refetchUser } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], refetch } = useNotificationsQuery(!!user);
  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation = useMarkNotificationRead();

  // Refetch the auth user on the same 60s cadence so the unread count badge
  // stays in sync with anything that mutated server-side outside this client.
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('access')) {
        refetchUser();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetchUser]);

  const fetchNotifications = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const markAllRead = useCallback(async () => {
    try {
      await markAllMutation.mutateAsync();
      if (user) setUser({ ...user, unread_notifications_count: 0 });
    } catch {
      /* ignore */
    }
  }, [markAllMutation, setUser, user]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await markOneMutation.mutateAsync(id);
        if (user) {
          setUser({
            ...user,
            unread_notifications_count: Math.max(0, user.unread_notifications_count - 1),
          });
        }
      } catch {
        /* ignore */
      }
    },
    [markOneMutation, setUser, user],
  );

  // Clear cached notifications on logout so the next user doesn't briefly
  // see the previous user's data.
  useEffect(() => {
    if (!user) qc.removeQueries({ queryKey: queryKeys.notifications() });
  }, [user, qc]);

  return (
    <NotificationContext.Provider
      value={{ notifications, fetchNotifications, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
