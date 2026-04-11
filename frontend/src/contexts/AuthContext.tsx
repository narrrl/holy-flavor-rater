import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import api, { clearTokens } from '../lib/api';

export interface AuthUser {
  username: string;
  avatar: string | null;
  unread_notifications_count: number;
  is_superuser: boolean;
  theme?: string;
  language?: string;
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
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [following, setFollowing] = useState<FollowingEntry[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const refetchUser = useCallback(async () => {
    const token = localStorage.getItem('access');
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }
    try {
      const res = await api.get('users/me/');
      if (res.data?.username) {
        setUser(res.data);
        if (res.data.theme) localStorage.setItem('theme', res.data.theme);
        if (res.data.language) i18n.changeLanguage(res.data.language);
        try {
          const followRes = await api.get('users/following_list/');
          const data = Array.isArray(followRes.data)
            ? followRes.data
            : followRes.data.results || [];
          setFollowing(data);
        } catch {
          /* ignore */
        }
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

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setFollowing([]);
    i18n.changeLanguage(navigator.language.split('-')[0] || 'en');
    window.location.href = '/';
  }, [i18n]);

  return (
    <AuthContext.Provider value={{ user, setUser, following, loadingUser, refetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
