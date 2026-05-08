import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { queryKeys } from '../keys';
import type { DashboardData } from '../types';

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      const res = await api.get<DashboardData>('users/dashboard/');
      return res.data;
    },
  });
