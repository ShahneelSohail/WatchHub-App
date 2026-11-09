'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchTerm } from '@/components/admin/chrome';
import { Button, EmptyBlock, buttonClass } from '@/components/admin/controls';
import { useAction } from '@/components/admin/data';
import { Drawer, FormModal } from '@/components/admin/overlays';
import { OrderStatusPill, Pill } from '@/components/admin/pills';
import { DataTable, type Column } from '@/components/admin/table';
import type { AdminOrder } from '@/components/admin/types';
import { initials, shortDate } from '@/components/admin/utils';
import { useAuth } from '@/components/Providers';
import { cx } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { AdminCustomer } from '@/lib/types';

type Dialog = { kind: 'block' | 'role'; customer: AdminCustomer };

const PAGE_SIZE = 20;
const SELF_TITLE = 'You can’t change your own account';

const Avatar = ({ customer, size }: { customer: AdminCustomer; size: string }) => (
  <span className={cx('grid flex-none place-items-center rounded-pill font-bold', size, customer.role === 'ADMIN' ? 'bg-primary text-on-primary' : 'bg-primary-tint text-link')}>{initials(customer.name)}</span>
);

const RolePill = ({ role }: { role: AdminCustomer['role'] }) => (
  <Pill tone={role === 'ADMIN' ? 'delivered' : 'neutral'} square>
    {role === 'ADMIN' ? 'Admin' : 'Customer'}
  </Pill>
);

const StatusPill = ({ blocked }: { blocked: boolean }) => (
  <Pill tone={blocked ? 'red' : 'green'} dot>
    {blocked ? 'Blocked' : 'Active'}
  </Pill>
);

const CustomerDrawer = ({ customer, onClose, onRole, onBlock, isSelf }: { customer: AdminCustomer; onClose: () => void; onRole: () => void; onBlock: () => void; isSelf: boolean }) => {
  const orders = useQuery({ queryKey: ['admin', 'orders', 'customer', customer.id], queryFn: () => api.page<AdminOrder>(withQuery('/admin/orders', { q: customer.email, pageSize: 5 })) });
  return (
    <Drawer title={customer.name} sub={customer.email} onClose={onClose}>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <Avatar customer={customer} size="size-12 text-base" />
          <span className="flex flex-wrap gap-2">
            <RolePill role={customer.role} />
            <StatusPill blocked={customer.isBlocked} />
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Orders', String(customer.orderCount)],
            ['Total spent', formatMoney(customer.totalSpent)],
            ['Joined', shortDate(customer.createdAt)],
            ['Phone', customer.phone ?? 'Not provided'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-card border border-line p-3.5">
              <dt className="text-xs font-semibold tracking-[0.06em] text-ink-secondary uppercase">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isSelf} title={isSelf ? SELF_TITLE : undefined} variant="soft" onClick={onRole}>
            {customer.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
          </Button>
          <Button disabled={isSelf} title={isSelf ? SELF_TITLE : undefined} variant={customer.isBlocked ? 'secondary' : 'danger'} onClick={onBlock}>
            {customer.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Latest orders</h3>
            <Link href={withQuery('/admin/orders', { q: customer.email })} className="text-[13px] font-semibold text-link hover:underline">
              View all
            </Link>
          </div>
          {orders.data?.items.map(order => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="grid grid-cols-[56px_minmax(0,1fr)_auto_72px] items-center gap-3 border-b border-line py-2.5 text-sm hover:bg-page">
              <span className="font-semibold text-link">#{order.id}</span>
              <span className="text-ink-secondary">{shortDate(order.createdAt)}</span>
              <OrderStatusPill status={order.status} />
              <span className="text-right tabular-nums">{formatMoney(order.total)}</span>
            </Link>
          ))}
          {orders.data?.items.length === 0 && <p className="text-sm text-ink-secondary">No orders yet.</p>}
        </section>
      </div>
    </Drawer>
  );
};

export default function AdminCustomersPage() {
  const q = useSearchTerm();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [detail, setDetail] = useState<AdminCustomer | null>(null);

  useEffect(() => setPage(1), [q]);

  const customers = useQuery({
    queryKey: ['admin', 'users', { q, page }],
    queryFn: () => api.page<AdminCustomer>(withQuery('/admin/users', { q, page, pageSize: PAGE_SIZE })),
    placeholderData: keepPreviousData,
  });

  const update = useAction(({ customer, patch }: { customer: AdminCustomer; patch: { isBlocked: boolean } | { role: AdminCustomer['role'] }; message: string }) => api.patch(`/admin/users/${customer.id}`, patch), {
    success: (_, variables) => variables.message,
    onSuccess: (_, variables) => {
      setDialog(null);
      setDetail(current => (current && current.id === variables.customer.id ? { ...current, ...variables.patch } : current));
    },
  });

  const askBlock = (customer: AdminCustomer) => (customer.isBlocked ? update.mutate({ customer, patch: { isBlocked: false }, message: `${customer.name} unblocked` }) : setDialog({ kind: 'block', customer }));
  const guard = (customer: AdminCustomer) => ({ disabled: customer.id === user?.id, title: customer.id === user?.id ? SELF_TITLE : undefined });

  const columns: Column<AdminCustomer>[] = [
    {
      id: 'customer',
      header: 'Customer',
      track: 'minmax(0,1.6fr)',
      sortValue: customer => customer.name,
      cell: customer => (
        <span className={cx('flex min-w-0 items-center gap-3', customer.isBlocked && 'opacity-70')}>
          <Avatar customer={customer} size="size-9 text-[13px]" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{customer.name}</span>
            <span className="truncate text-xs text-ink-secondary">{customer.email}</span>
          </span>
        </span>
      ),
    },
    { id: 'phone', header: 'Phone', track: 'minmax(0,1fr)', cell: customer => <span className="text-ink-secondary">{customer.phone ?? '—'}</span> },
    { id: 'orders', header: 'Orders', track: '80px', align: 'right', sortValue: customer => customer.orderCount, cell: customer => <span className="tabular-nums">{customer.orderCount}</span> },
    { id: 'spent', header: 'Spent', track: '110px', align: 'right', sortValue: customer => customer.totalSpent, cell: customer => <span className="font-medium tabular-nums">{formatMoney(customer.totalSpent)}</span> },
    { id: 'joined', header: 'Joined', track: '112px', sortValue: customer => new Date(customer.createdAt).getTime(), cell: customer => <span className="text-ink-secondary">{shortDate(customer.createdAt)}</span> },
    { id: 'role', header: 'Role', track: '110px', cell: customer => <RolePill role={customer.role} /> },
    { id: 'status', header: 'Status', track: '100px', cell: customer => <StatusPill blocked={customer.isBlocked} /> },
    {
      id: 'actions',
      header: 'Actions',
      track: '236px',
      align: 'right',
      cell: customer => (
        <span className="flex justify-end gap-1.5" onClick={event => event.stopPropagation()}>
          <Link href={withQuery('/admin/orders', { q: customer.email })} className={buttonClass('secondary', 'sm')}>
            Orders
          </Link>
          <Button size="sm" variant="soft" {...guard(customer)} onClick={() => setDialog({ kind: 'role', customer })}>
            {customer.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
          </Button>
          <Button size="sm" variant={customer.isBlocked ? 'secondary' : 'danger'} {...guard(customer)} onClick={() => askBlock(customer)}>
            {customer.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        </span>
      ),
    },
  ];

  const target = dialog?.customer;
  const demote = dialog?.kind === 'role' && target?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        label="Customers"
        noun="customer"
        columns={columns}
        rows={customers.data?.items ?? []}
        rowKey={customer => customer.id}
        minWidth={1180}
        rowHeight="min-h-16"
        loading={customers.isPending}
        onRowClick={setDetail}
        server={customers.data && { page: customers.data.meta.page, totalPages: customers.data.meta.totalPages, total: customers.data.meta.total, onPage: setPage }}
        empty={<EmptyBlock title="No customers match" description="Try another search." />}
      />

      {dialog?.kind === 'block' && target && (
        <FormModal
          title={`Block ${target.name}?`}
          sub="They are signed out and can’t place orders or open tickets. Open orders are not affected."
          cta="Block customer"
          tone="danger"
          busy={update.isPending}
          onSubmit={() => update.mutate({ customer: target, patch: { isBlocked: true }, message: `${target.name} blocked` })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'role' && target && (
        <FormModal
          title={demote ? 'Remove admin access?' : `Make ${target.name} an admin?`}
          sub={demote ? `${target.name} keeps their customer account but loses access to this console.` : 'Admins can edit products, refund orders and manage customers.'}
          cta={demote ? 'Remove access' : 'Make admin'}
          tone={demote ? 'danger' : 'primary'}
          busy={update.isPending}
          onSubmit={() => update.mutate({ customer: target, patch: { role: demote ? 'CUSTOMER' : 'ADMIN' }, message: demote ? `${target.name} is no longer an admin` : `${target.name} is now an admin` })}
          onClose={() => setDialog(null)}
        />
      )}
      {detail && !dialog && (
        <CustomerDrawer
          customer={detail}
          isSelf={detail.id === user?.id}
          onClose={() => setDetail(null)}
          onRole={() => setDialog({ kind: 'role', customer: detail })}
          onBlock={() => askBlock(detail)}
        />
      )}
    </div>
  );
}
