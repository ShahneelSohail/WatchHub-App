import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import { WatchBrowser } from '@/components/WatchBrowser';

export const metadata: Metadata = { title: 'Watches' };

export default function WatchesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <WatchBrowser />
    </Suspense>
  );
}
