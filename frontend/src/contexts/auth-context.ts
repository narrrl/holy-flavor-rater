import { createContext } from 'react';

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
  refetchFollowing: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
