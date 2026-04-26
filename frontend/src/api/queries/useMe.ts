import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface CurrentUserFull {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  language?: string;
  selected_banner?: number | null;
  is_superuser?: boolean;
  unread_notifications_count?: number;
}

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<CurrentUserFull>('users/me/', {
        ...({ skipAuthRedirect: true } as object),
      });
      return res.data;
    },
    enabled: !!localStorage.getItem('access'),
  });
