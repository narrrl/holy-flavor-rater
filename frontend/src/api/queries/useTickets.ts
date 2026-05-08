import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export interface TicketMessage {
  id: number;
  username: string;
  text: string;
  created_at: string;
  is_admin: boolean;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: number;
  user: number;
  username: string;
  user_email: string;
  user_avatar: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  messages: TicketMessage[];
}

export const useTickets = () =>
  useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const res = await api.get<Ticket[] | { results: Ticket[] }>('tickets/');
      return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    },
  });
