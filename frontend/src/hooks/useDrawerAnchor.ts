import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './useAuth';

export type DrawerAnchor = 'left' | 'right';

const STORAGE_KEY = 'drawer-anchor';

const readLocal = (): DrawerAnchor => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'left' ? 'left' : 'right';
};

export interface UseDrawerAnchorResult {
  anchor: DrawerAnchor;
  setAnchor: (anchor: DrawerAnchor) => Promise<void>;
}

export const useDrawerAnchor = (): UseDrawerAnchorResult => {
  const { user, refetchUser } = useAuth();
  const [anchor, setAnchorState] = useState<DrawerAnchor>(
    (user?.drawer_anchor as DrawerAnchor) ?? readLocal(),
  );

  // Adopt the server-side preference when it loads/changes. Derived during
  // render (tracking the previously-applied value) so it doesn't cost an extra
  // effect pass; the localStorage mirror is written in the effect below.
  const [appliedAnchor, setAppliedAnchor] = useState(user?.drawer_anchor);
  if (user?.drawer_anchor && user.drawer_anchor !== appliedAnchor) {
    setAppliedAnchor(user.drawer_anchor);
    setAnchorState(user.drawer_anchor);
  }

  useEffect(() => {
    if (user?.drawer_anchor) localStorage.setItem(STORAGE_KEY, user.drawer_anchor);
  }, [user?.drawer_anchor]);

  const setAnchor = useCallback(
    async (next: DrawerAnchor) => {
      setAnchorState(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (user) {
        try {
          await api.patch('users/update_preferences/', { drawer_anchor: next });
          await refetchUser();
        } catch {
          /* fall back to local-only persistence */
        }
      }
    },
    [user, refetchUser],
  );

  return { anchor, setAnchor };
};
