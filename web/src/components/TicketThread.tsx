'use client';

import { useState, type FormEvent } from 'react';
import { formatDateTime } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import { Button, ErrorState, Textarea, cx } from './ui';

export const TicketThread = ({ ticket, onReply, replyLabel = 'Send reply', asCustomer }: { ticket: Ticket; onReply: (message: string) => Promise<unknown>; replyLabel?: string; asCustomer?: boolean }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const closed = ticket.status === 'CLOSED';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onReply(message);
      setMessage('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <ul className="flex min-h-[260px] flex-col gap-3.5 bg-page p-5">
        {ticket.messages?.map(entry => {
          const staff = entry.author.role === 'ADMIN';
          return (
            <li key={entry.id} className={cx('flex max-w-[86%] flex-col gap-1.5 animate-rise', staff ? 'items-start self-start' : 'items-end self-end')}>
              <span className="text-xs text-ink-secondary">
                {staff ? 'WatchHub support' : asCustomer ? 'You' : entry.author.name} · {formatDateTime(entry.createdAt)}
              </span>
              <div className={cx('rounded-card border px-3.5 py-3 text-sm leading-[1.55] whitespace-pre-wrap', staff ? 'border-line bg-surface text-ink' : 'border-primary bg-primary text-on-primary')}>{entry.message}</div>
            </li>
          );
        })}
      </ul>
      {closed ? (
        <p className="border-t border-line bg-success-surface px-5 py-4 text-sm text-success-ink">This ticket is closed.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2.5 border-t border-line px-5 pt-3.5 pb-[18px]">
          <Textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={2} rows={3} placeholder="Write a reply" aria-label="Message" />
          {error && <ErrorState message={error} />}
          <div className="flex justify-end">
            <Button type="submit" loading={sending} disabled={!message.trim()}>
              {replyLabel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
