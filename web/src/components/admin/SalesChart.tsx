import { formatMoney, formatWholeMoney } from '@/lib/format';
import type { Dashboard } from '@/lib/types';

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 60 };

export const SalesChart = ({ days }: { days: Dashboard['salesByDay'] }) => {
  const max = Math.max(...days.map(day => day.revenue), 1);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerWidth / days.length;
  const ticks = [0, 0.5, 1].map(fraction => ({ value: max * fraction, y: PAD.top + innerHeight * (1 - fraction) }));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Revenue over the last 14 days">
      {ticks.map(tick => (
        <g key={tick.y}>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={tick.y} y2={tick.y} className="stroke-line" />
          <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" className="fill-faint text-[11px]">
            {formatWholeMoney(tick.value)}
          </text>
        </g>
      ))}
      {days.map((day, index) => {
        const height = (day.revenue / max) * innerHeight;
        const x = PAD.left + index * slot + slot * 0.2;
        return (
          <g key={day.date}>
            <rect x={x} y={PAD.top + innerHeight - height} width={slot * 0.6} height={height} rx={3} className="fill-navy">
              <title>
                {day.date}: {formatMoney(day.revenue)} from {day.orders} orders
              </title>
            </rect>
            {index % 2 === 0 && (
              <text x={x + slot * 0.3} y={HEIGHT - 8} textAnchor="middle" className="fill-faint text-[11px]">
                {day.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
