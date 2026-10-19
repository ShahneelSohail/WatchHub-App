'use client';

import { useQuery } from '@tanstack/react-query';
import { LinkButton, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Faq } from '@/lib/types';

export default function FaqPage() {
  const faqs = useQuery({ queryKey: ['faqs'], queryFn: () => api.get<Faq[]>('/faqs') });
  const groups = Object.entries(
    (faqs.data ?? []).reduce<Record<string, Faq[]>>((byCategory, faq) => ({ ...byCategory, [faq.category]: [...(byCategory[faq.category] ?? []), faq] }), {})
  );

  return (
    <>
      <PageHeading eyebrow="Help centre" title="Frequently asked questions" />
      {faqs.isPending ? (
        <Spinner />
      ) : (
        <div className="max-w-3xl space-y-10">
          {groups.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 font-serif text-xl text-navy">{category}</h2>
              <div className="divide-y divide-line rounded-2xl border border-line bg-ivory">
                {items.map(faq => (
                  <details key={faq.id} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                      {faq.question}
                      <span className="text-xl text-gold transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          <p className="text-sm text-muted">Still stuck?</p>
          <LinkButton href="/support">Contact support</LinkButton>
        </div>
      )}
    </>
  );
}
