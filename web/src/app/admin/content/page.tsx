'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BannerModal } from '@/components/admin/BannerModal';
import { Alert, Button, IconButton, Panel, Skeleton, Switch, TextArea, TextInput } from '@/components/admin/controls';
import { useAction, useAllWatches } from '@/components/admin/data';
import { Icon } from '@/components/admin/icons';
import { FormModal } from '@/components/admin/overlays';
import type { AdminBanner, AdminFaq } from '@/components/admin/types';
import { cx } from '@/components/ui';
import { api } from '@/lib/api';

const DEFAULT_GROUP = 'General';

interface FaqDraft {
  id: number | null;
  category: string;
  question: string;
  answer: string;
}

const swap = <T,>(list: T[], index: number, offset: number): T[] => {
  const next = [...list];
  const target = index + offset;
  [next[index], next[target]] = [next[target] as T, next[index] as T];
  return next;
};

const bannerPayload = (banner: AdminBanner, isActive: boolean) => ({
  imageUrl: banner.imageUrl,
  eyebrow: banner.eyebrow,
  title: banner.title,
  subtitle: banner.subtitle,
  link: banner.link,
  watchId: banner.watchId,
  isActive,
});

const BannersPanel = () => {
  const banners = useQuery({ queryKey: ['admin', 'banners'], queryFn: () => api.get<AdminBanner[]>('/admin/banners') });
  const watches = useAllWatches().data ?? [];
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  const list = banners.data ?? [];
  const reorder = useAction((ids: number[]) => api.put('/admin/banners/reorder', { ids }), { success: 'Banner order saved' });
  const toggle = useAction((banner: AdminBanner) => api.put(`/admin/banners/${banner.id}`, bannerPayload(banner, !banner.isActive)), {
    success: (_, banner) => `${banner.title ?? 'Banner'} ${banner.isActive ? 'hidden from home' : 'added to rotation'}`,
  });
  const remove = useAction((banner: AdminBanner) => api.delete(`/admin/banners/${banner.id}`), {
    success: 'Banner deleted',
    onSuccess: () => {
      setDeleting(null);
      setEditing(null);
    },
  });

  const move = (index: number, offset: number) => reorder.mutate(swap(list, index, offset).map(banner => banner.id));
  let position = 0;

  return (
    <Panel
      title="Home banners"
      subtitle="Active banners rotate every 6 seconds, in this order"
      flush
      action={
        <Button variant="outline" size="sm" className="h-[34px] px-3 text-[13px]" onClick={() => setEditing('new')}>
          + Add banner
        </Button>
      }
    >
      {banners.isError && (
        <div className="p-5">
          <Alert tone="red" role="alert">
            {banners.error.message}
          </Alert>
        </div>
      )}
      {banners.isPending && (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-[72px]" />
          ))}
        </div>
      )}
      {list.map((banner, index) => {
        if (banner.isActive) position += 1;
        return (
          <div key={banner.id} onClick={() => setEditing(banner)} className={cx('grid cursor-pointer grid-cols-[28px_128px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-line px-5 py-3 hover:bg-page', !banner.isActive && 'opacity-60')}>
            <span className="text-center text-[13px] font-semibold text-ink-muted">{banner.isActive ? position : '–'}</span>
            <span className="relative h-[72px] w-32 overflow-hidden rounded-card bg-primary-dark">
              <img src={banner.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
              <span className="absolute inset-0 bg-[linear-gradient(90deg,rgb(13_20_66/0.85),rgb(13_20_66/0))]" />
              <span className="absolute right-2 bottom-2 left-2 font-display text-[13px] leading-[1.1] text-white">{banner.title}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="truncate text-[11px] font-semibold tracking-[0.1em] text-ink-secondary uppercase">{banner.eyebrow}</span>
              <span className="truncate text-[15px] font-medium">{banner.title}</span>
              <span className="truncate text-xs text-ink-secondary">Links to {banner.watch?.name ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1.5" onClick={event => event.stopPropagation()}>
              <IconButton icon="arrowUp" label={`Move ${banner.title} up`} framed disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)} />
              <IconButton icon="arrowDown" label={`Move ${banner.title} down`} framed disabled={index === list.length - 1 || reorder.isPending} onClick={() => move(index, 1)} />
              <span className="ml-1.5">
                <Switch label={`Active ${banner.title}`} checked={banner.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(banner)} />
              </span>
            </span>
          </div>
        );
      })}
      {banners.data?.length === 0 && <p className="px-5 py-8 text-center text-sm text-ink-secondary">No banners yet. Add one to feature a watch on the home page.</p>}
      {editing && <BannerModal banner={editing === 'new' ? null : editing} watches={watches} onClose={() => setEditing(null)} onDelete={setDeleting} />}
      {deleting && <FormModal title={`Delete ${deleting.title ?? 'this banner'}?`} sub="It is removed from the home page rotation." cta="Delete banner" tone="danger" busy={remove.isPending} onSubmit={() => remove.mutate(deleting)} onClose={() => setDeleting(null)} />}
    </Panel>
  );
};

const FaqPanel = () => {
  const faqs = useQuery({ queryKey: ['admin', 'faqs'], queryFn: () => api.get<AdminFaq[]>('/admin/faqs') });
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [error, setError] = useState('');

  const save = useAction(
    (faq: FaqDraft) => {
      const existing = faqs.data?.find(candidate => candidate.id === faq.id);
      const payload = { question: faq.question.trim(), answer: faq.answer.trim(), category: faq.category, isActive: existing?.isActive ?? true };
      return faq.id === null ? api.post('/admin/faqs', payload) : api.put(`/admin/faqs/${faq.id}`, payload);
    },
    { success: 'FAQ saved', onSuccess: () => setDraft(null) }
  );
  const toggle = useAction((faq: AdminFaq) => api.put(`/admin/faqs/${faq.id}`, { question: faq.question, answer: faq.answer, category: faq.category, isActive: !faq.isActive }), {
    success: (_, faq) => (faq.isActive ? 'Question hidden from the FAQ page' : 'Question shown on the FAQ page'),
  });
  const reorder = useAction((ids: number[]) => api.put('/admin/faqs/reorder', { ids }), { success: 'Question order saved' });
  const remove = useAction((faq: AdminFaq) => api.delete(`/admin/faqs/${faq.id}`), { success: 'Question deleted', onSuccess: () => setDraft(null) });

  const list = faqs.data ?? [];
  const categories = [...new Set([...list.map(faq => faq.category), ...(list.length === 0 ? [DEFAULT_GROUP] : [])])];

  const move = (faq: AdminFaq, offset: number) => {
    const group = list.filter(candidate => candidate.category === faq.category);
    const index = group.findIndex(candidate => candidate.id === faq.id);
    const reordered = swap(group, index, offset);
    reorder.mutate(categories.flatMap(category => (category === faq.category ? reordered : list.filter(candidate => candidate.category === category))).map(item => item.id));
  };

  const finish = () => {
    if (!draft) return;
    if (!draft.question.trim() || !draft.answer.trim()) return setError(draft.question.trim() ? 'Enter an answer' : 'Enter a question');
    save.mutate(draft);
  };

  const open = (next: FaqDraft) => {
    setError('');
    setDraft(next);
  };

  const editor = (faq: AdminFaq | null) =>
    draft && (
      <div className="flex animate-rise flex-col gap-2.5 px-3.5 pb-3.5">
        <TextInput value={draft.question} onChange={event => setDraft({ ...draft, question: event.target.value })} aria-label="Question" placeholder="Question" className="h-[38px] text-sm" aria-invalid={Boolean(error) && !draft.question.trim()} />
        <TextArea rows={3} value={draft.answer} onChange={event => setDraft({ ...draft, answer: event.target.value })} aria-label="Answer" placeholder="Answer" aria-invalid={Boolean(error) && !draft.answer.trim()} />
        {error && (
          <span role="alert" className="text-xs text-danger-ink">
            {error}
          </span>
        )}
        <div className="flex justify-between">
          {faq ? (
            <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(faq)}>
              Delete
            </Button>
          ) : (
            <Button size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="sm" className="px-3.5" disabled={save.isPending} onClick={finish}>
            Done
          </Button>
        </div>
      </div>
    );

  return (
    <Panel title="FAQs" subtitle="Shown on the FAQ page, grouped as below" flush>
      {faqs.isError && (
        <div className="p-5">
          <Alert tone="red" role="alert">
            {faqs.error.message}
          </Alert>
        </div>
      )}
      {faqs.isPending && (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      )}
      {faqs.data &&
        categories.map(category => {
          const group = list.filter(faq => faq.category === category);
          return (
            <div key={category}>
              <div className="flex items-center justify-between px-5 pt-3.5 pb-1.5">
                <span className="text-xs font-semibold tracking-[0.1em] text-link uppercase">{category}</span>
                <button type="button" onClick={() => open({ id: null, category, question: '', answer: '' })} className="cursor-pointer text-[13px] font-semibold text-link hover:underline">
                  + Question
                </button>
              </div>
              {group.map((faq, index) => {
                const isOpen = draft?.id === faq.id;
                return (
                  <div key={faq.id} className={cx('mx-3 mb-2 rounded-card border bg-surface', isOpen ? 'border-primary' : 'border-line', !faq.isActive && !isOpen && 'opacity-60')}>
                    <div className="flex items-center gap-1.5 pr-3">
                      <button type="button" aria-expanded={isOpen} onClick={() => (isOpen ? setDraft(null) : open({ id: faq.id, category: faq.category, question: faq.question, answer: faq.answer }))} className="flex min-h-12 flex-1 cursor-pointer items-center justify-between gap-3 px-3.5 text-left text-sm font-medium">
                        <span>{faq.question}</span>
                        <Icon name="chevronDown" size={14} className={cx('flex-none transition-transform duration-200', isOpen && 'rotate-180')} />
                      </button>
                      <IconButton icon="arrowUp" label="Move question up" disabled={index === 0 || reorder.isPending} onClick={() => move(faq, -1)} />
                      <IconButton icon="arrowDown" label="Move question down" disabled={index === group.length - 1 || reorder.isPending} onClick={() => move(faq, 1)} />
                      <Switch label={`Shown ${faq.question}`} checked={faq.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(faq)} />
                    </div>
                    {isOpen && editor(faq)}
                  </div>
                );
              })}
              {draft?.id === null && draft.category === category && (
                <div className="mx-3 mb-2 rounded-card border border-primary bg-surface pt-3.5">{editor(null)}</div>
              )}
            </div>
          );
        })}
      <div className="h-2" />
    </Panel>
  );
};

export default function AdminContentPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start gap-5 max-xl:grid-cols-1">
      <BannersPanel />
      <FaqPanel />
    </div>
  );
}
