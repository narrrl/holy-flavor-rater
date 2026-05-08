import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';

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

export const useNotificationsQuery = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: async () => {
      const res = await api.get('notifications/', {
        ...({ skipAuthRedirect: true } as object),
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      return data as Notification[];
    },
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
