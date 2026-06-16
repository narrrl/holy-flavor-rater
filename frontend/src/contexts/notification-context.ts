import { createContext } from 'react';
import type { Notification } from '../api/queries/useNotifications';

export type { Notification };

export interface NotificationContextValue {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);
