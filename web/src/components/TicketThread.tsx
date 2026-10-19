'use client';

import { useState, type FormEvent } from 'react';
import { formatDateTime } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import { Button, Card, ErrorState, Textarea } from './ui';

export const TicketThread = ({ ticket, onReply, replyLabel = 'Send reply' }: { ticket: Ticket; onReply: (message: string) => Promise<unknown>; replyLabel?: string }) => {
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
    <div className="space-y-4">
      <ul className="space-y-3">
        {ticket.messages?.map(entry => (
          <li key={entry.id} className={entry.author.role === 'ADMIN' ? 'pl-8' : 'pr-8'}>
            <Card className={entry.author.role === 'ADMIN' ? 'border-navy/30 bg-navy/5' : ''}>
              <p className="text-xs text-faint">
                <span className="font-medium text-ink">{entry.author.role === 'ADMIN' ? 'WatchHub support' : entry.author.name}</span> · {formatDateTime(entry.createdAt)}
              </p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{entry.message}</p>
            </Card>
          </li>
        ))}
      </ul>
      {closed ? (
        <p className="text-sm text-muted">This ticket is closed.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={2} placeholder="Write a message" aria-label="Message" />
          {error && <ErrorState message={error} />}
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending…' : replyLabel}
          </Button>
        </form>
      )}
    </div>
  );
};
