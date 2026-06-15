import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import type { Notification } from '../contexts/NotificationContext';

/**
 * Shared notification-click behaviour for the AppBar and sidebar menus:
 * marks the notification read, runs an optional cleanup (close menu/drawer),
 * then routes via the SPA router (no full page reload).
 */
export const useNotificationClick = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markRead } = useNotifications();

  return useCallback(
    async (notif: Notification, onDone?: () => void) => {
      if (!notif.is_read) await markRead(notif.id);
      onDone?.();
      if (notif.notification_type.startsWith('ticket')) {
        navigate(user?.is_superuser ? '/admin-panel/tickets' : '/support');
      } else if (notif.notification_type === 'profile_comment') {
        navigate(`/profile/${user?.username}`);
      } else if (notif.notification_type === 'follow') {
        navigate(`/profile/${notif.actor_username}`);
      } else if (notif.flavor_id) {
        navigate(`/flavor/${notif.flavor_id}`);
      }
    },
    [navigate, user, markRead],
  );
};
