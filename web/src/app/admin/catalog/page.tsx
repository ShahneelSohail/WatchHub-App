'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Button, Skeleton, TextInput } from '@/components/admin/controls';
import { useAction } from '@/components/admin/data';
import type { TaxonomyItem } from '@/components/admin/types';
import { pluralize } from '@/components/admin/utils';
import { cx } from '@/components/ui';
import { api } from '@/lib/api';

interface TaxonomyConfig {
  title: string;
  path: string;
  subtitle: (count: number) => string;
  placeholder: string;
  imageKey: 'logoUrl' | 'imageUrl';
  meta: (item: TaxonomyItem) => string;
}

const productCount = (item: TaxonomyItem) => pluralize(item._count.watches, 'product');

const CONFIGS: TaxonomyConfig[] = [
  {
    title: 'Brands',
    path: '/admin/brands',
    subtitle: count => `${count} houses`,
    placeholder: 'New brand name',
    imageKey: 'logoUrl',
    meta: item => [item.description, productCount(item)].filter(Boolean).join(' · '),
  },
  {
    title: 'Categories',
    path: '/admin/categories',
    subtitle: count => `${count} categories`,
    placeholder: 'New category name',
    imageKey: 'imageUrl',
    meta: item => `${productCount(item)} · shown in Shop by category`,
  },
];

const ROW_BUTTON = 'h-8 px-2.5 text-xs';

const TaxonomyColumn = ({ config }: { config: TaxonomyConfig }) => {
  const items = useQuery({ queryKey: ['admin', config.path], queryFn: () => api.get<TaxonomyItem[]>(config.path) });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [added, setAdded] = useState('');

  const rename = useAction((item: TaxonomyItem) => api.put(`${config.path}/${item.id}`, { name: draft.trim(), description: item.description, [config.imageKey]: item[config.imageKey] ?? null }), {
    success: () => `Renamed to ${draft.trim()}`,
    onSuccess: () => setEditingId(null),
  });
  const add = useAction(() => api.post(config.path, { name: added.trim() }), { success: () => `${added.trim()} added`, onSuccess: () => setAdded('') });
  const remove = useAction((item: TaxonomyItem) => api.delete(`${config.path}/${item.id}`), { success: (_, item) => `${item.name} deleted` });

  const startEdit = (item: TaxonomyItem) => {
    setEditingId(item.id);
    setDraft(item.name);
  };

  const duplicate = (name: string, ignoreId?: number) => items.data?.some(item => item.id !== ignoreId && item.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold">{config.title}</h2>
        <span className="text-[13px] text-ink-secondary">{items.data ? config.subtitle(items.data.length) : ''}</span>
      </div>
      {items.isError && (
        <div className="p-5">
          <Alert tone="red" role="alert">
            {items.error.message}
          </Alert>
        </div>
      )}
      {items.isPending && (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-11" />
          ))}
        </div>
      )}
      {items.data?.map(item => {
        const editing = editingId === item.id;
        const image = item[config.imageKey];
        const inUse = item._count.watches > 0;
        return (
          <div key={item.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-line px-5 py-3">
            {image ? <img src={image} alt="" className="size-11 rounded-card bg-line object-cover" /> : <span className="grid size-11 place-items-center rounded-card bg-primary-tint font-display text-xl text-link">{item.name[0]}</span>}
            <span className="flex min-w-0 flex-col gap-0.5">
              {editing ? (
                <TextInput value={draft} onChange={event => setDraft(event.target.value)} aria-label="Name" className="h-9 text-sm" autoFocus />
              ) : (
                <span className="text-[15px] font-medium">{item.name}</span>
              )}
              <span className="truncate text-xs text-ink-secondary">{config.meta(item)}</span>
            </span>
            <span className="flex gap-1.5">
              {editing ? (
                <>
                  <Button size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" disabled={!draft.trim() || duplicate(draft, item.id) || rename.isPending} onClick={() => rename.mutate(item)}>
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="soft" className={ROW_BUTTON} onClick={() => startEdit(item)}>
                    Rename
                  </Button>
                  <Button size="sm" variant="danger" className={cx(ROW_BUTTON, inUse && 'opacity-40')} aria-disabled={inUse} title={inUse ? `Move ${pluralize(item._count.watches, 'product')} first` : 'Delete'} onClick={() => !inUse && remove.mutate(item)}>
                    Delete
                  </Button>
                </>
              )}
            </span>
          </div>
        );
      })}
      <form
        className="flex gap-2 px-5 py-3.5"
        onSubmit={event => {
          event.preventDefault();
          if (added.trim() && !duplicate(added)) add.mutate(undefined);
        }}
      >
        <TextInput value={added} onChange={event => setAdded(event.target.value)} placeholder={config.placeholder} aria-label={config.placeholder} className="h-[38px] flex-1 text-sm" />
        <Button type="submit" variant="primary" disabled={!added.trim() || Boolean(duplicate(added)) || add.isPending} title={duplicate(added) ? `${added.trim()} already exists` : undefined}>
          Add
        </Button>
      </form>
      <p className="px-5 pb-3.5 text-xs text-ink-secondary">An item with products can’t be deleted. Move its products first.</p>
    </section>
  );
};

export default function AdminCatalogPage() {
  return (
    <div className="grid grid-cols-2 items-start gap-5 max-xl:grid-cols-1">
      {CONFIGS.map(config => (
        <TaxonomyColumn key={config.path} config={config} />
      ))}
    </div>
  );
}
