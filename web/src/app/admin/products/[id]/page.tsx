'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';
import { EmptyState, ErrorState, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Watch } from '@/lib/types';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const watch = useQuery({ queryKey: ['admin', 'watch', id], queryFn: () => api.get<Watch>(`/admin/watches/${id}`), gcTime: 0 });

  if (watch.isPending) return <Spinner />;
  if (watch.isError) return watch.error.message.includes('not found') ? <EmptyState title="Product not found" /> : <ErrorState message={watch.error.message} />;
  return (
    <>
      <PageHeading eyebrow="Catalogue" title={`Edit ${watch.data.name}`} />
      <ProductForm watch={watch.data} />
    </>
  );
}
