import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export interface Notification {
  id: number;
  actor_username: string;
  actor_avatar: string | null;
  notification_type:
    | 'reply'
    | 'mention'
    | 'follow'
    | 'ticket_new'
    | 'ticket_reply'
    | 'profile_comment';
  rating: number | null;
  reply: number | null;
  is_read: boolean;
  created_at: string;
  flavor_name: string | null;
  flavor_id: number | null;
  profile_owner_username: string | null;
}

export interface NotificationContextValue {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, setUser, refetchUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('notifications/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setNotifications(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('access')) {
        fetchNotifications();
        refetchUser();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications, refetchUser]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('notifications/mark_all_read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (user) setUser({ ...user, unread_notifications_count: 0 });
    } catch {
      /* ignore */
    }
  }, [user, setUser]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await api.post(`notifications/${id}/mark_read/`);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
    [user, setUser],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, fetchNotifications, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
