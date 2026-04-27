import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * httpOnly-cookie auth: the backend sets `access_token` + `refresh_token` cookies
 * on login. We don't read or write them from JS — `withCredentials` is enough.
 */

/** One-time migration: remove the legacy localStorage tokens (DRF and old JWT). */
export function clearLegacyToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
  withCredentials: true,
});

type RetriableConfig = AxiosRequestConfig & {
  _retry?: boolean;
  /** When true, a 401 that survives refresh will silently reject instead of
   *  navigating to /login. Use for background probes (e.g. /users/me/) so
   *  anonymous visitors aren't bounced off public pages. */
  skipAuthRedirect?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    await axios.post(`${api.defaults.baseURL}auth/token/refresh/`, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const url = original.url ?? '';
    if (url.includes('auth/token/') || url.includes('auth/logout/')) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise = refreshPromise ?? refreshAccessToken();
    const ok = await refreshPromise;
    refreshPromise = null;

    if (!ok) {
      if (
        !original.skipAuthRedirect &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    return api(original);
  },
);

export default api;
