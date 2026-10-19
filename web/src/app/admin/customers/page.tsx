'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth, useToast } from '@/components/Providers';
import { Badge, Button, DataTable, EmptyState, Input, PageHeading, Pagination, Spinner } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import type { AdminCustomer } from '@/lib/types';

export default function AdminCustomersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);

  const customers = useQuery({ queryKey: ['admin', 'customers', q, page], queryFn: () => api.page<AdminCustomer>(withQuery('/admin/users', { q, page, pageSize: 12 })), placeholderData: previous => previous });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: number; isBlocked?: boolean; role?: string }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      toast('success', 'Account updated.');
    },
    onError: (error: Error) => toast('error', error.message),
  });

  return (
    <>
      <PageHeading eyebrow="People" title="Customers" />
      <Input
        value={search}
        onChange={event => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search by name or email"
        aria-label="Search customers"
        className="mb-4 max-w-xs"
      />
      {customers.isPending ? (
        <Spinner />
      ) : customers.data?.items.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <>
          <DataTable headers={['Customer', 'Joined', 'Orders', 'Spent', 'Status', '']}>
            {customers.data?.items.map(customer => (
              <tr key={customer.id}>
                <td>
                  <p className="font-medium">
                    {customer.name} {customer.role === 'ADMIN' && <Badge value="CONFIRMED" label="Admin" />}
                  </p>
                  <p className="text-xs text-faint">{customer.email}</p>
                </td>
                <td className="text-muted">{formatDate(customer.createdAt)}</td>
                <td>{customer.orderCount}</td>
                <td>{formatMoney(customer.totalSpent)}</td>
                <td>{customer.isBlocked ? <Badge value="CANCELLED" label="Blocked" /> : <Badge value="PUBLISHED" label="Active" />}</td>
                <td className="text-right whitespace-nowrap">
                  {customer.id !== me?.id && (
                    <>
                      <Button variant="ghost" className="px-3 py-1" onClick={() => update.mutate({ id: customer.id, isBlocked: !customer.isBlocked })}>
                        {customer.isBlocked ? 'Unblock' : 'Block'}
                      </Button>
                      <Button variant="ghost" className="px-3 py-1" onClick={() => update.mutate({ id: customer.id, role: customer.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN' })}>
                        {customer.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          {customers.data && <Pagination meta={customers.data.meta} onChange={setPage} />}
        </>
      )}
    </>
  );
}
