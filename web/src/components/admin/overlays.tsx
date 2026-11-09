'use client';

import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { cx } from '../ui';
import { Button, IconButton } from './controls';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const useDialog = (onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    (focusables()[1] ?? focusables()[0])?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return closeRef.current();
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, []);

  return ref;
};

interface ShellProps {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, sub, onClose, children }: ShellProps) => {
  const ref = useDialog(onClose);
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-60 animate-fade bg-primary-dark/45" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-1/2 left-1/2 z-61 flex max-h-[calc(100vh-40px)] w-[480px] max-w-[calc(100%-40px)] -translate-x-1/2 -translate-y-1/2 animate-fade flex-col overflow-y-auto rounded-card border border-line bg-surface shadow-dialog"
      >
        <div className="flex items-start justify-between gap-3 pt-5 pr-5 pl-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl leading-tight">{title}</span>
            {sub && <span className="text-sm leading-normal text-ink-secondary">{sub}</span>}
          </div>
          <IconButton icon="close" label="Close" size={36} iconSize={18} onClick={onClose} />
        </div>
        {children}
      </div>
    </>
  );
};

interface FormModalProps extends Omit<ShellProps, 'children'> {
  cta: string;
  back?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onSubmit: () => void;
  extra?: ReactNode;
  children?: ReactNode;
}

export const FormModal = ({ cta, back = 'Cancel', tone = 'primary', busy = false, onSubmit, extra, children, ...shell }: FormModalProps) => {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Modal {...shell}>
      <form onSubmit={submit} noValidate>
        {children && <div className="flex flex-col gap-3.5 px-6 py-5">{children}</div>}
        <div className={cx('flex items-center gap-2 px-6 pt-4 pb-5', children ? 'border-t border-line' : 'pt-5')}>
          {extra}
          <span className="flex-1" />
          <Button size="lg" onClick={shell.onClose}>
            {back}
          </Button>
          <Button size="lg" type="submit" variant={tone === 'danger' ? 'destructive' : 'primary'} disabled={busy}>
            {cta}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const Drawer = ({ title, sub, onClose, children }: ShellProps) => {
  const ref = useDialog(onClose);
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-60 animate-fade bg-primary-dark/35" />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-y-0 right-0 z-61 flex w-[480px] max-w-full animate-fade flex-col border-l border-line bg-surface shadow-dialog">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[26px] leading-tight">{title}</span>
            {sub && <span className="text-sm text-ink-secondary">{sub}</span>}
          </div>
          <IconButton icon="close" label="Close" size={44} iconSize={18} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
};
