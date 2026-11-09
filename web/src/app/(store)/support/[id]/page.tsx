'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { TicketPanel } from '@/components/TicketPanel';

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <div className="flex max-w-3xl flex-col gap-5">
        <Link href="/support" className="self-start text-sm font-medium text-primary">
          ← Support
        </Link>
        <TicketPanel id={id} />
      </div>
    </RequireAuth>
  );
}
