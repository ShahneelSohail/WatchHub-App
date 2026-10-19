'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, DataTable, EmptyState, PageHeading, Pagination, Select, Spinner } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDate, titleCase } from '@/lib/format';
import type { Ticket, TicketStatus } from '@/lib/types';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminTicketsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const tickets = useQuery({ queryKey: ['admin', 'tickets', status, page], queryFn: () => api.page<Ticket>(withQuery('/admin/tickets', { status, page, pageSize: 12 })), placeholderData: previous => previous });

  return (
    <>
      <PageHeading eyebrow="Customer care" title="Support tickets" />
      <Select
        value={status}
        onChange={event => {
          setStatus(event.target.value);
          setPage(1);
        }}
        aria-label="Filter by status"
        className="mb-4 max-w-48"
      >
        <option value="">All tickets</option>
        {STATUSES.map(entry => (
          <option key={entry} value={entry}>
            {titleCase(entry)}
          </option>
        ))}
      </Select>
      {tickets.isPending ? (
        <Spinner />
      ) : tickets.data?.items.length === 0 ? (
        <EmptyState title="No tickets found" />
      ) : (
        <>
          <DataTable headers={['Ticket', 'Customer', 'Updated', 'Priority', 'Status']}>
            {tickets.data?.items.map(ticket => (
              <tr key={ticket.id}>
                <td>
                  <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-navy hover:underline">
                    #{ticket.id} {ticket.subject}
                  </Link>
                </td>
                <td>{ticket.user?.name}</td>
                <td className="text-muted">{formatDate(ticket.updatedAt)}</td>
                <td>
                  <Badge value={ticket.priority} />
                </td>
                <td>
                  <Badge value={ticket.status} />
                </td>
              </tr>
            ))}
          </DataTable>
          {tickets.data && <Pagination meta={tickets.data.meta} onChange={setPage} />}
        </>
      )}
    </>
  );
}
