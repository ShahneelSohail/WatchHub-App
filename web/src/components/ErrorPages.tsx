'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from './Icon';
import { Button, Input, LinkButton } from './ui';

export const NotFoundContent = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const search = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="wrap flex flex-col items-center gap-4 py-12 text-center md:py-16">
      <span className="animate-rise font-display text-[96px] leading-none tracking-[-0.02em] text-primary md:text-[148px]">404</span>
      <h1 className="font-display text-[30px] leading-[1.15] font-medium">This page has stopped ticking</h1>
      <p className="max-w-[420px] text-[15px] leading-relaxed text-ink-secondary">The link may be old, or the watch may no longer be in our catalogue. Try a search instead.</p>
      <form onSubmit={search} className="flex w-full max-w-[440px] gap-2" role="search">
        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search watches" aria-label="Search watches" className="h-[52px]" />
        <Button type="submit" size="lg">
          Search
        </Button>
      </form>
      <div className="flex flex-wrap justify-center gap-2.5">
        <LinkButton href="/" variant="outline" size="lg">
          Go to home
        </LinkButton>
        <LinkButton href="/faq" variant="secondary" size="lg">
          Help centre
        </LinkButton>
      </div>
    </div>
  );
};

export const ServerErrorContent = ({ reset }: { reset: () => void }) => {
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      reset();
    }, 600);
  };

  return (
    <div className="wrap flex flex-col items-center gap-4 py-12 text-center md:py-16">
      <span className="grid h-[88px] w-[88px] animate-pop place-items-center rounded-full bg-danger-surface text-danger">
        <Icon name="alert" size={40} strokeWidth={1.5} />
      </span>
      <h1 className="font-display text-[30px] leading-[1.15] font-medium">Something went wrong on our side</h1>
      <p className="max-w-[440px] text-[15px] leading-relaxed text-ink-secondary">Your bag and account are safe. Try again in a moment. If it keeps happening, contact support.</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button size="lg" loading={retrying} onClick={retry} className="min-w-[140px]">
          {retrying ? 'Retrying' : 'Try again'}
        </Button>
        <LinkButton href="/support" variant="outline" size="lg">
          Contact support
        </LinkButton>
      </div>
    </div>
  );
};
