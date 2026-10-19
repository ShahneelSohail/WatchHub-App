'use client';

import { ResourceManager, type ColumnConfig, type FieldConfig } from '@/components/admin/ResourceManager';
import { PageHeading } from '@/components/ui';
import type { Brand, Category } from '@/lib/types';

const brandFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'logoUrl', label: 'Logo', type: 'image' },
];

const categoryFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'imageUrl', label: 'Image', type: 'image' },
];

const columns = <T extends Brand | Category>(): ColumnConfig<T>[] => [
  { header: 'Name', cell: row => <span className="font-medium">{row.name}</span> },
  { header: 'Description', cell: row => <span className="text-muted">{row.description ?? '-'}</span> },
  { header: 'Watches', cell: row => (row as { _count?: { watches: number } })._count?.watches ?? 0 },
];

export default function AdminCatalogPage() {
  return (
    <>
      <PageHeading eyebrow="Catalogue" title="Brands & categories" />
      <div className="space-y-12">
        <ResourceManager<Brand> title="Brands" singular="Brand" path="/admin/brands" fields={brandFields} columns={columns<Brand>()} defaults={{ name: '', description: '', logoUrl: '' }} />
        <ResourceManager<Category> title="Categories" singular="Category" path="/admin/categories" fields={categoryFields} columns={columns<Category>()} defaults={{ name: '', description: '', imageUrl: '' }} />
      </div>
    </>
  );
}
