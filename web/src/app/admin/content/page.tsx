'use client';

import { ResourceManager, type ColumnConfig, type FieldConfig } from '@/components/admin/ResourceManager';
import { Badge, PageHeading } from '@/components/ui';
import type { Banner, Faq } from '@/lib/types';

const bannerFields: FieldConfig[] = [
  { name: 'imageUrl', label: 'Image', type: 'image', required: true },
  { name: 'title', label: 'Headline', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'link', label: 'Link', type: 'text', hint: 'A store path such as /watches/pulse-orbit.' },
  { name: 'sortOrder', label: 'Position', type: 'number' },
  { name: 'isActive', label: 'Show on the home page', type: 'checkbox' },
];

const bannerColumns: ColumnConfig<Banner>[] = [
  {
    header: 'Banner',
    cell: banner => (
      <div className="flex items-center gap-3">
        <img src={banner.imageUrl} alt="" className="h-12 w-12 rounded-lg bg-sand object-contain p-1" />
        <span className="font-medium">{banner.title}</span>
      </div>
    ),
  },
  { header: 'Link', cell: banner => <span className="text-muted">{banner.link ?? '-'}</span> },
  { header: 'Position', cell: banner => banner.sortOrder },
  { header: 'Status', cell: banner => (banner.isActive ? <Badge value="PUBLISHED" label="Live" /> : <Badge value="DRAFT" label="Hidden" />) },
];

const faqFields: FieldConfig[] = [
  { name: 'category', label: 'Category', type: 'text', required: true },
  { name: 'question', label: 'Question', type: 'text', required: true },
  { name: 'answer', label: 'Answer', type: 'textarea', required: true },
  { name: 'sortOrder', label: 'Position', type: 'number' },
];

const faqColumns: ColumnConfig<Faq>[] = [
  { header: 'Question', cell: faq => <span className="font-medium">{faq.question}</span> },
  { header: 'Category', cell: faq => faq.category },
  { header: 'Position', cell: faq => faq.sortOrder },
];

export default function AdminContentPage() {
  return (
    <>
      <PageHeading eyebrow="Storefront" title="Banners & FAQs" />
      <div className="space-y-12">
        <ResourceManager<Banner> title="Home banners" singular="Banner" path="/admin/banners" fields={bannerFields} columns={bannerColumns} defaults={{ imageUrl: '', title: '', subtitle: '', link: '', sortOrder: '0', isActive: true }} />
        <ResourceManager<Faq> title="FAQs" singular="FAQ" path="/admin/faqs" fields={faqFields} columns={faqColumns} defaults={{ category: 'General', question: '', answer: '', sortOrder: '0' }} />
      </div>
    </>
  );
}
