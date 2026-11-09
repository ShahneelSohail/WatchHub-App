'use client';

import { ServerErrorContent } from '@/components/ErrorPages';

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ServerErrorContent reset={reset} />;
}
