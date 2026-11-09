'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, withQuery } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { cx } from '../ui';
import { useSearchTerm } from './chrome';
import { Alert, Button, Skeleton, Tabs, TextArea } from './controls';
import { useAction } from './data';
import { PRIORITY_DOTS, PRIORITY_LABELS, TicketStatusPill } from './pills';
import type { AdminTicket, AdminTicketMessage, AdminTicketPriority, AdminTicketStatus, TicketMessageKind } from './types';
import { shortTime } from './utils';

type Tab = 'open' | 'pending' | 'resolved' | 'all';
type Mode = 'reply' | 'note';

const TAB_STATUSES: Record<Tab, string | undefined> = { open: 'OPEN', pending: 'PENDING,IN_PROGRESS', resolved: 'RESOLVED,CLOSED', all: undefined };
const STATUS_OPTIONS: { value: AdminTicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];
const PRIORITY_OPTIONS: { value: AdminTicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];
const COUNT_GROUPS: Record<Exclude<Tab, 'all'>, AdminTicketStatus[]> = { open: ['OPEN'], pending: ['PENDING', 'IN_PROGRESS'], resolved: ['RESOLVED', 'CLOSED'] };

const MESSAGE_STYLES: Record<TicketMessageKind, { box: string; align: string }> = {
  CUSTOMER: { box: 'border-line bg-surface', align: 'self-start items-start' },
  ADMIN: { box: 'border-primary-tint bg-primary-tint', align: 'self-end items-end' },
  INTERNAL: { box: 'border-dashed border-pill-amber-bd bg-pill-amber-bg', align: 'self-end items-end' },
};

const selectClass = 'h-9 cursor-pointer rounded-card border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary-tint';

const senderLabel = (message: AdminTicketMessage, customer: string) =>
  message.kind === 'CUSTOMER' ? customer : message.kind === 'ADMIN' ? `${message.author.name} · WatchHub` : `Internal note · ${message.author.name}`;

const Thread = ({ id }: { id: number }) => {
  const [mode, setMode] = useState<Mode>('reply');
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const ticket = useQuery({ queryKey: ['admin', 'tickets', id], queryFn: () => api.get<AdminTicket>(`/admin/tickets/${id}`) });

  const update = useAction((patch: { status: AdminTicketStatus } | { priority: AdminTicketPriority }) => api.patch(`/admin/tickets/${id}`, patch), {
    success: (_, patch) => ('status' in patch ? `#${id} marked ${patch.status.toLowerCase()}` : `Priority set to ${patch.priority.toLowerCase()}`),
  });
  const send = useAction(() => api.post(`/admin/tickets/${id}/messages`, { message: draft.trim(), kind: mode === 'note' ? 'INTERNAL' : 'ADMIN' }), {
    success: mode === 'note' ? 'Note added' : 'Reply sent',
    onSuccess: () => setDraft(''),
  });

  const messageCount = ticket.data?.messages?.length;
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [messageCount, id]);

  if (ticket.isError)
    return (
      <div className="p-6">
        <Alert tone="red" role="alert">
          {ticket.error.message}
        </Alert>
      </div>
    );
  if (!ticket.data)
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-24" />
      </div>
    );

  const data = ticket.data;
  const note = mode === 'note';
  const firstName = data.user.name.split(' ')[0];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-[18px]">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-2xl leading-[1.15]">{data.subject}</span>
          <span className="flex flex-wrap gap-1.5 text-[13px] text-ink-secondary">
            <span>#{data.id}</span>·<span>{data.user.name}</span>·<span>{data.user.email}</span>
            {data.order && (
              <>
                ·
                <Link href={`/admin/orders/${data.order.id}`} className="font-semibold text-link hover:underline">
                  Order #{data.order.id}
                </Link>
              </>
            )}
          </span>
        </div>
        <div className="flex flex-none gap-2">
          {[
            { label: 'Status', value: data.status === 'IN_PROGRESS' ? 'PENDING' : data.status, options: STATUS_OPTIONS, change: (value: string) => update.mutate({ status: value as AdminTicketStatus }) },
            { label: 'Priority', value: data.priority === 'MEDIUM' ? 'NORMAL' : data.priority, options: PRIORITY_OPTIONS, change: (value: string) => update.mutate({ priority: value as AdminTicketPriority }) },
          ].map(field => (
            <label key={field.label} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">{field.label}</span>
              <select value={field.value} onChange={event => field.change(event.target.value)} className={selectClass}>
                {field.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-page p-6">
        {data.messages?.map(message => (
          <div key={message.id} className={cx('flex max-w-[72%] animate-rise flex-col gap-1.5', MESSAGE_STYLES[message.kind].align)}>
            <span className="text-xs text-ink-secondary">
              {senderLabel(message, data.user.name)} · {formatDateTime(message.createdAt)}
            </span>
            <div className={cx('rounded-card border px-3.5 py-3 text-sm leading-[1.55] whitespace-pre-wrap', MESSAGE_STYLES[message.kind].box)}>{message.message}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className={cx('flex flex-col gap-2.5 border-t border-line px-6 pt-3.5 pb-[18px]', note ? 'bg-pill-amber-bg' : 'bg-surface')}>
        <div role="radiogroup" aria-label="Composer mode" className="flex self-start overflow-hidden rounded-card border border-line">
          {([['reply', 'Reply to customer'], ['note', 'Internal note']] as const).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)} className={cx('h-8 cursor-pointer px-3.5 text-[13px] font-medium', mode === value ? 'bg-primary text-on-primary' : 'bg-surface text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <TextArea rows={3} value={draft} onChange={event => setDraft(event.target.value)} aria-label={note ? 'Internal note' : 'Reply'} placeholder={note ? 'Only your team can see internal notes' : `Write to ${firstName}`} className="resize-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-secondary">{note ? 'Not sent to the customer.' : 'Sent to the customer. Status moves to Pending until they reply.'}</span>
          <Button variant="primary" size="lg" disabled={draft.trim().length < 2 || send.isPending} onClick={() => send.mutate(undefined)}>
            {note ? 'Add note' : 'Send reply'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const TicketConsole = () => {
  const router = useRouter();
  const pathname = usePathname();
  const q = useSearchTerm();
  const selectedParam = Number(useSearchParams().get('id')) || null;
  const [tab, setTab] = useState<Tab>('open');

  const tickets = useQuery({
    queryKey: ['admin', 'tickets', 'list', { tab, q }],
    queryFn: () => api.page<AdminTicket>(withQuery('/admin/tickets', { status: TAB_STATUSES[tab], q, pageSize: 60 })),
    placeholderData: keepPreviousData,
  });
  const counts = (tickets.data?.meta as unknown as { counts?: Partial<Record<AdminTicketStatus, number>> } | undefined)?.counts;
  const countOf = (statuses: AdminTicketStatus[]) => statuses.reduce((sum, status) => sum + (counts?.[status] ?? 0), 0);
  const list = tickets.data?.items ?? [];
  const selectedId = selectedParam ?? list[0]?.id ?? null;

  return (
    <div className="grid h-[calc(100vh-136px)] min-h-[580px] grid-cols-[360px_minmax(0,1fr)] rounded-card border border-line bg-surface max-xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <Tabs
            label="Ticket status"
            compact
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'open', label: 'Open', count: counts && countOf(COUNT_GROUPS.open) },
              { value: 'pending', label: 'Pending', count: counts && countOf(COUNT_GROUPS.pending) },
              { value: 'resolved', label: 'Resolved', count: counts && countOf(COUNT_GROUPS.resolved) },
              { value: 'all', label: 'All', count: counts && countOf(Object.values(COUNT_GROUPS).flat()) },
            ]}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.isPending && (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map(index => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          )}
          {list.map(ticket => (
            <button
              key={ticket.id}
              type="button"
              aria-current={ticket.id === selectedId}
              onClick={() => router.replace(withQuery(pathname, { id: ticket.id, q }))}
              className={cx('flex w-full cursor-pointer flex-col gap-1.5 border-b border-line px-4 py-3.5 text-left hover:bg-page', ticket.id === selectedId && 'bg-primary-tint hover:bg-primary-tint')}
            >
              <span className="flex w-full justify-between gap-2">
                <span className="truncate text-sm font-semibold">{ticket.subject}</span>
                <span className="flex-none text-xs text-ink-secondary">{shortTime(ticket.updatedAt)}</span>
              </span>
              <span className="text-[13px] text-ink-secondary">
                #{ticket.id} · {ticket.user.name}
              </span>
              <span className="flex items-center gap-2">
                <TicketStatusPill status={ticket.status} />
                <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <span className={cx('size-2 rounded-pill', PRIORITY_DOTS[ticket.priority])} />
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              </span>
            </button>
          ))}
          {tickets.data && list.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-secondary">No tickets in this view.</p>}
        </div>
      </div>
      {selectedId ? <Thread key={selectedId} id={selectedId} /> : <p className="grid place-items-center text-sm text-ink-secondary">Select a ticket to read the conversation.</p>}
    </div>
  );
};
