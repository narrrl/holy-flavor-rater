import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface AdminRating {
  id: number;
  user: string;
  score: number;
  comment: string | null;
  flavor_name: string;
}

export interface AdminReply {
  id: number;
  user: string;
  text: string;
}

export const useAdminRating = (id: string | undefined) =>
  useQuery({
    queryKey: ['adminRating', id],
    queryFn: async () => {
      const res = await api.get<AdminRating>(`ratings/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

export const useAdminReply = (id: string | undefined) =>
  useQuery({
    queryKey: ['adminReply', id],
    queryFn: async () => {
      const res = await api.get<AdminReply>(`replies/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

export interface AdminStats {
  [key: string]: unknown;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  rating_count?: number;
}

export interface AdminJob {
  id: number;
  name: string;
  status?: string;
  schedule?: unknown;
  next_run?: string | null;
}

export interface AdminConfig {
  [key: string]: unknown;
}

export const useAdminStats = () =>
  useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => (await api.get<AdminStats>('admin-custom/stats/')).data,
  });

export const useAdminUsers = () =>
  useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => (await api.get<AdminUserSummary[]>('admin-custom/users/')).data,
  });

export const useAdminJobs = () =>
  useQuery({
    queryKey: ['adminJobs'],
    queryFn: async () => (await api.get<AdminJob[]>('admin-custom/jobs/')).data,
    refetchInterval: 30_000,
  });

export const useAdminConfig = () =>
  useQuery({
    queryKey: ['adminConfig'],
    queryFn: async () => (await api.get<AdminConfig>('admin-custom/config/')).data,
  });

export interface AdminUserDetailData {
  id: number;
  username: string;
  email?: string;
  is_active: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  ratings?: unknown[];
  [key: string]: unknown;
}

export const useAdminUserDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ['adminUserDetail', id],
    queryFn: async () =>
      (await api.get<AdminUserDetailData>(`admin-custom/${id}/user_detail/`)).data,
    enabled: !!id,
  });
