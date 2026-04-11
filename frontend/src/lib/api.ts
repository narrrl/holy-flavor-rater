import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';

const ACCESS_KEY = 'access';
const REFRESH_KEY = 'refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** One-time migration: remove the legacy DRF TokenAuth key from localStorage. */
export function clearLegacyToken(): void {
  localStorage.removeItem('token');
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

api.interceptors.request.use((config) => {
  const access = getAccessToken();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;

  try {
    const res = await axios.post(`${api.defaults.baseURL}auth/token/refresh/`, { refresh });
    const newAccess = res.data.access as string;
    const newRefresh = res.data.refresh as string | undefined;
    setTokens(newAccess, newRefresh);
    return newAccess;
  } catch {
    clearTokens();
    return null;
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
    if (url.includes('auth/token/')) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise = refreshPromise ?? refreshAccessToken();
    const newAccess = await refreshPromise;
    refreshPromise = null;

    if (!newAccess) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    original.headers = {
      ...(original.headers ?? {}),
      Authorization: `Bearer ${newAccess}`,
    };
    return api(original);
  },
);

export default api;
