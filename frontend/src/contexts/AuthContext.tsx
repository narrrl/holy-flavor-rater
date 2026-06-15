import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import api, { type RetriableConfig } from '../lib/api';

export interface AuthUser {
  username: string;
  avatar: string | null;
  unread_notifications_count: number;
  is_superuser: boolean;
  theme?: string;
  language?: string;
  drawer_anchor?: 'left' | 'right';
}

export interface FollowingEntry {
  id: number;
  username: string;
  avatar: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  following: FollowingEntry[];
  loadingUser: boolean;
  refetchUser: () => Promise<void>;
  refetchFollowing: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [following, setFollowing] = useState<FollowingEntry[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  // Following list rarely changes: fetched on login and after a follow/unfollow
  // mutation — NOT on the 60s badge poll (that only needs `users/me/`).
  const refetchFollowing = useCallback(async () => {
    try {
      const followRes = await api.get('users/following_list/');
      const data = Array.isArray(followRes.data) ? followRes.data : followRes.data.results || [];
      setFollowing(data);
    } catch {
      /* ignore */
    }
  }, []);

  const refetchUser = useCallback(async () => {
    try {
      const res = await api.get('users/me/', {
        skipAuthRedirect: true,
      } as RetriableConfig);
      if (res.data?.username) {
        setUser(res.data);
        if (res.data.theme) localStorage.setItem('theme', res.data.theme);
        if (res.data.language) i18n.changeLanguage(res.data.language);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, [i18n]);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  // Sync following list with login state: load once on login, clear on logout.
  // Keyed on username so it doesn't re-run on every badge-count refresh.
  useEffect(() => {
    if (user?.username) {
      refetchFollowing();
    } else {
      setFollowing([]);
    }
  }, [user?.username, refetchFollowing]);

  const logout = useCallback(async () => {
    try {
      await api.post('auth/logout/');
    } catch {
      /* ignore — cookies still get cleared on server when refresh expires */
    }
    setUser(null);
    setFollowing([]);
    i18n.changeLanguage(navigator.language.split('-')[0] || 'en');
    window.location.href = '/';
  }, [i18n]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, following, loadingUser, refetchUser, refetchFollowing, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
