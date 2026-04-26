import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface CurrentUserLite {
  username: string;
  is_superuser: boolean;
}

/**
 * Reads /users/me/ for cases where we need a quick "is this me / am I admin"
 * check outside of AuthContext. Disabled when not authenticated.
 */
export const useCurrentUserLite = () =>
  useQuery({
    queryKey: ['currentUserLite'],
    queryFn: async () => {
      const res = await api.get<CurrentUserLite>('users/me/', {
        // Stale access tokens are common; never bounce a public page reader
        // to /login because of a background "am I logged in?" check.
        ...({ skipAuthRedirect: true } as object),
      });
      return res.data;
    },
    enabled: !!localStorage.getItem('access'),
    staleTime: 60_000,
  });
