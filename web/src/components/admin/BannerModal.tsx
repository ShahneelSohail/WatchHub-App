'use client';

import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { uploadImages } from '@/lib/uploads';
import { useToast } from '../Providers';
import { cx } from '../ui';
import { Button, Checkbox, FormField, SelectInput, TextField } from './controls';
import { useAction } from './data';
import { Icon } from './icons';
import { FormModal } from './overlays';
import type { AdminBanner, AdminWatch } from './types';

interface BannerForm {
  eyebrow: string;
  title: string;
  watchId: string;
  imageUrl: string;
  isActive: boolean;
}

type BannerErrors = Partial<Record<'eyebrow' | 'title', string>>;

const TITLE_MIN = 3;
const TITLE_MAX = 40;

const initialForm = (banner: AdminBanner | null, watches: AdminWatch[]): BannerForm => ({
  eyebrow: banner?.eyebrow ?? '',
  title: banner?.title ?? '',
  watchId: String(banner?.watchId ?? watches[0]?.id ?? ''),
  imageUrl: banner?.imageUrl ?? watches[0]?.images[0] ?? '',
  isActive: banner?.isActive ?? true,
});

interface BannerModalProps {
  banner: AdminBanner | null;
  watches: AdminWatch[];
  onClose: () => void;
  onDelete: (banner: AdminBanner) => void;
}

export const BannerModal = ({ banner, watches, onClose, onDelete }: BannerModalProps) => {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => initialForm(banner, watches));
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [errors, setErrors] = useState<BannerErrors>({});

  const watch = watches.find(candidate => String(candidate.id) === form.watchId);
  const pool = [...new Set([...(watch?.images ?? []), ...uploaded, form.imageUrl].filter(Boolean))];

  const upload = useMutation({
    mutationFn: (files: FileList) => uploadImages(files),
    onSuccess: urls => {
      setUploaded(current => [...current, ...urls]);
      setForm(current => ({ ...current, imageUrl: urls[0] ?? current.imageUrl }));
    },
    onError: (failure: Error) => toast('error', failure.message),
  });
  const save = useAction(
    () => {
      const payload = { imageUrl: form.imageUrl, eyebrow: form.eyebrow.trim(), title: form.title.trim(), subtitle: banner?.subtitle ?? null, watchId: watch?.id ?? null, link: watch ? `/watches/${watch.slug}` : null, isActive: form.isActive };
      return banner ? api.put(`/admin/banners/${banner.id}`, payload) : api.post('/admin/banners', payload);
    },
    { success: banner ? 'Banner saved' : form.isActive ? 'Banner added to the rotation' : 'Banner added as hidden', onSuccess: onClose }
  );

  const edit = (patch: Partial<BannerForm>) => {
    setForm(current => ({ ...current, ...patch }));
    setErrors({});
  };

  const submit = () => {
    const title = form.title.trim();
    const found: BannerErrors = {
      eyebrow: form.eyebrow.trim() ? undefined : 'Enter a short label, e.g. Nº 05 · New',
      title: title.length < TITLE_MIN ? `Enter a headline, at least ${TITLE_MIN} characters` : title.length > TITLE_MAX ? `Keep the headline under ${TITLE_MAX} characters` : undefined,
    };
    const failures = Object.fromEntries(Object.entries(found).filter(([, message]) => message));
    setErrors(failures);
    if (Object.keys(failures).length === 0) save.mutate(undefined);
  };

  return (
    <FormModal
      title={banner ? 'Edit home banner' : 'New home banner'}
      sub="Shown in the hero rotation on the home page, in the order set on this page."
      cta={banner ? 'Save banner' : 'Add banner'}
      busy={save.isPending || upload.isPending || !form.imageUrl}
      onSubmit={submit}
      onClose={onClose}
      extra={
        banner && (
          <Button variant="danger" size="lg" onClick={() => onDelete(banner)}>
            Delete
          </Button>
        )
      }
    >
      <div className="relative h-[150px] overflow-hidden rounded-card bg-primary-dark">
        {form.imageUrl && <img src={form.imageUrl} alt="" className="absolute top-0 right-0 h-full w-[62%] object-cover" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0d1442_38%,rgb(13_20_66/0)_80%)]" />
        <div className="absolute top-0 bottom-0 left-4 flex w-[60%] flex-col justify-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-white/80 uppercase">{form.eyebrow.trim() || 'Nº 05 · Label'}</span>
          <span className="font-display text-2xl leading-[1.05] text-white">{form.title.trim() || 'Your headline'}</span>
          <span className="text-[11px] text-white/80">Discover → {watch?.name ?? ''}</span>
        </div>
      </div>
      <TextField label="Label" placeholder="Nº 05 · New this season" value={form.eyebrow} error={errors.eyebrow} onChange={event => edit({ eyebrow: event.target.value })} />
      <TextField label="Headline" placeholder="Tidewater 300" aside={`${form.title.length} / ${TITLE_MAX}`} value={form.title} error={errors.title} onChange={event => edit({ title: event.target.value })} />
      <FormField label="Links to">
        <SelectInput value={form.watchId} onChange={event => edit({ watchId: event.target.value, imageUrl: watches.find(candidate => String(candidate.id) === event.target.value)?.images[0] ?? form.imageUrl })}>
          {watches.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {candidate.brand.name}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Image</span>
        <div className="grid grid-cols-5 gap-1.5">
          {pool.map((url, index) => (
            <button key={url} type="button" aria-label={`Use image ${index + 1}`} aria-pressed={form.imageUrl === url} onClick={() => edit({ imageUrl: url })} className={cx('aspect-square cursor-pointer overflow-hidden rounded-card bg-line p-0', form.imageUrl === url ? 'border-2 border-primary' : 'border border-line')}>
              <img src={url} alt="" className="block size-full object-cover" />
            </button>
          ))}
          <button type="button" aria-label="Upload an image" onClick={() => input.current?.click()} className="grid aspect-square cursor-pointer place-items-center rounded-card border border-dashed border-ink-muted bg-page text-link hover:border-primary">
            <Icon name="upload" size={18} />
          </button>
          <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Upload banner image" onChange={event => event.target.files?.length && upload.mutate(event.target.files)} />
        </div>
      </div>
      <Checkbox label="Add to the rotation now" checked={form.isActive} onChange={isActive => edit({ isActive })} />
    </FormModal>
  );
};
