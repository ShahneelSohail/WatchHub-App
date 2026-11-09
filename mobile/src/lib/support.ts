import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from './auth';
import type { Ticket } from './types';

const TICKETS_KEY = ['tickets'];
const ticketKey = (id: number) => ['ticket', id];

export const useTickets = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: TICKETS_KEY, queryFn: () => api.get<Ticket[]>('/support/tickets'), enabled: Boolean(user) });
};

export const useTicket = (id: number) => useQuery({ queryKey: ticketKey(id), queryFn: () => api.get<Ticket>(`/support/tickets/${id}`) });

export const useTicketActions = () => {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: { subject: string; message: string; orderId: number | null }) => api.post<Ticket>('/support/tickets', input),
    onSuccess: ticket => {
      queryClient.setQueryData(ticketKey(ticket.id), ticket);
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
    },
  });
  const reply = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => api.post<Ticket>(`/support/tickets/${id}/messages`, { message }),
    onSuccess: ticket => {
      queryClient.setQueryData(ticketKey(ticket.id), ticket);
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
    },
  });
  return { create, reply };
};
