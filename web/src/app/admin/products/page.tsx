'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/Providers';
import { Badge, Button, DataTable, EmptyState, Input, LinkButton, PageHeading, Pagination, Select, Spinner } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { formatMoney } from '@/lib/format';
import type { Watch } from '@/lib/types';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const key = ['admin', 'watches', q, status, page];

  const watches = useQuery({ queryKey: key, queryFn: () => api.page<Watch>(withQuery('/admin/watches', { q, status, page, pageSize: 10 })), placeholderData: previous => previous });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/watches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'watches'] });
      toast('success', 'Product deleted.');
    },
    onError: (error: Error) => toast('error', error.message),
  });

  return (
    <>
      <PageHeading eyebrow="Catalogue" title="Products" action={<LinkButton href="/admin/products/new">Add product</LinkButton>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={event => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="max-w-44"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </div>
      {watches.isPending ? (
        <Spinner />
      ) : watches.data?.items.length === 0 ? (
        <EmptyState title="No products found" />
      ) : (
        <>
          <DataTable headers={['Product', 'SKU', 'Price', 'Stock', 'Status', '']}>
            {watches.data?.items.map(watch => (
              <tr key={watch.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <img src={watch.images[0]} alt="" className="h-12 w-12 rounded-lg bg-sand object-contain p-1" />
                    <div>
                      <Link href={`/admin/products/${watch.id}`} className="font-medium hover:text-navy">
                        {watch.name}
                      </Link>
                      <p className="text-xs text-faint">
                        {watch.brand.name} · {watch.category.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-muted">{watch.sku}</td>
                <td>{formatMoney(watch.salePrice ?? watch.price)}</td>
                <td className={watch.stock <= 3 ? 'font-medium text-amber-700' : ''}>{watch.stock}</td>
                <td>
                  <Badge value={watch.status} />
                </td>
                <td className="text-right whitespace-nowrap">
                  <LinkButton href={`/admin/products/${watch.id}`} variant="ghost" className="px-3 py-1">
                    Edit
                  </LinkButton>
                  <Button variant="ghost" className="px-3 py-1 hover:text-red-700" onClick={() => window.confirm(`Delete ${watch.name}?`) && remove.mutate(watch.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
          {watches.data && <Pagination meta={watches.data.meta} onChange={setPage} />}
        </>
      )}
    </>
  );
}
