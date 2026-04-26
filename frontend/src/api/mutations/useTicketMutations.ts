import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const invalidateTickets = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['tickets'] });
};

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject: string; description: string }) => api.post('tickets/', input),
    onSuccess: () => invalidateTickets(qc),
  });
};

export const useAddTicketMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, text }: { ticketId: number; text: string }) =>
      api.post(`tickets/${ticketId}/add_message/`, { text }),
    onSuccess: () => invalidateTickets(qc),
  });
};

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      api.post(`tickets/${ticketId}/update_status/`, { status }),
    onSuccess: () => invalidateTickets(qc),
  });
};

export const useDeleteTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: number) => api.delete(`tickets/${ticketId}/`),
    onSuccess: () => invalidateTickets(qc),
  });
};
