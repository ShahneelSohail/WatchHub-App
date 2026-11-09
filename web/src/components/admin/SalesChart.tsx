'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { cx } from '../ui';
import type { Analytics, AnalyticsRange } from './types';

const TICKS = 4;
const CHART_HEIGHT = 220;
const MAX_LABELS = 7;

const niceStep = (rawStep: number): number => {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;
  return (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) * magnitude;
};

const compactMoney = (value: number): string => (value >= 1000 ? `$${value / 1000}k` : `$${value}`);

const labelFor = (range: AnalyticsRange, date: string): string =>
  new Date(date).toLocaleDateString('en-GB', range === '12m' ? { month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const SalesChart = ({ series, range }: { series: Analytics['series']; range: AnalyticsRange }) => {
  const [hover, setHover] = useState<number | null>(null);
  const step = niceStep(Math.max(...series.map(point => point.revenue), 1) / TICKS);
  const top = step * TICKS;
  const labelEvery = Math.ceil(series.length / MAX_LABELS);
  const columns = { gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` };

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2.5">
      <div className="-mt-1.5 flex flex-col justify-between text-right text-[11px] text-ink-secondary" style={{ height: CHART_HEIGHT }}>
        {Array.from({ length: TICKS + 1 }, (_, index) => (
          <span key={index}>{compactMoney(top - index * step)}</span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div
          role="list"
          aria-label={`Revenue per ${range === '12m' ? 'month' : 'day'}`}
          onMouseLeave={() => setHover(null)}
          className="relative grid items-end gap-2 border-b border-line bg-[repeating-linear-gradient(180deg,var(--color-page)_0_1px,transparent_1px_55px)]"
          style={{ ...columns, height: CHART_HEIGHT }}
        >
          {series.map((point, index) => (
            <div
              key={point.date}
              role="listitem"
              tabIndex={0}
              aria-label={`${labelFor(range, point.date)}: ${formatMoney(point.revenue)}`}
              onMouseEnter={() => setHover(index)}
              onFocus={() => setHover(index)}
              onBlur={() => setHover(null)}
              className="relative flex h-full items-end outline-none"
            >
              <div className={cx('w-full transition-[background-color,height] duration-500', hover === index ? 'bg-primary-hover' : 'bg-primary')} style={{ height: `${(point.revenue / top) * 100}%` }} />
              {hover === index && (
                <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 animate-fade rounded-card bg-primary-dark px-2.5 py-1.5 text-xs whitespace-nowrap text-white" style={{ bottom: `calc(${(point.revenue / top) * 100}% + 8px)` }}>
                  <span className="font-semibold">{formatMoney(point.revenue)}</span> · {labelFor(range, point.date)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-2 text-center text-[11px] text-ink-secondary" style={columns}>
          {series.map((point, index) => (
            <span key={point.date} className="whitespace-nowrap">
              {index % labelEvery === labelEvery - 1 || index === series.length - 1 ? labelFor(range, point.date) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
