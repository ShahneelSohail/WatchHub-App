import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ICON_PATHS = {
  search: [circle(11, 11, 6.5), 'M16 16l4.5 4.5'],
  bag: ['M5 8h14l-1 12H6z', 'M9 8V6a3 3 0 016 0v2'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z'],
  home: ['M4 11l8-6 8 6v9H4z', 'M10 20v-5h4v5'],
  watch: [circle(12, 12, 5.5), 'M9 6.8L9.8 3h4.4l.8 3.8M9 17.2l.8 3.8h4.4l.8-3.8M12 10v2l1.3 1'],
  logo: [circle(12, 12, 9), 'M12 6.5V12l3.5 2'],
  user: [circle(12, 8.5, 3.5), 'M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5'],
  bell: ['M6 16V11a6 6 0 0112 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 004 0'],
  back: ['M15 5l-7 7 7 7'],
  forward: ['M9 5l7 7-7 7'],
  down: ['M6 9l6 6 6-6'],
  close: ['M6 6l12 12M18 6L6 18'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12l5 5 9-10'],
  truck: ['M3 6h11v10H3zM14 9h4l3 3v4h-7', circle(7, 18, 1.6), circle(17, 18, 1.6)],
  shield: ['M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z', 'M9 12l2 2 4-4'],
  lock: ['M5 10h14v10H5z', 'M8 10V7a4 4 0 018 0v3'],
  rotate: ['M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3', 'M18 3v4h-4M6 21v-4h4'],
  arrowRight: ['M5 12h14M13 6l6 6-6 6'],
  arrowUpRight: ['M7 17L17 7M9 7h8v8'],
  sliders: ['M4 7h10M18 7h2M4 17h4M12 17h8', circle(16, 7, 2), circle(10, 17, 2)],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'],
  limited: ['M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8 9.5 8z'],
  clock: [circle(12, 12, 8.5), 'M12 7.5V12l3 2'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6'],
  alert: [circle(12, 12, 9), 'M12 7.5v5.5M12 16.5h.01'],
  mail: ['M3 5h18v14H3z', 'M3.5 6l8.5 7 8.5-7'],
  tag: ['M3 12V4h8l10 10-8 8zM7.5 8.5h.01'],
  box: ['M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7'],
  message: ['M4 5h16v11H9l-5 4z'],
  expand: ['M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6'],
  searchEmpty: [circle(11, 11, 6.5), 'M16 16l4.5 4.5M8.5 11h5'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export const Icon = ({ name, size = 20, color = colors.ink, strokeWidth = 1.7, fill = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {ICON_PATHS[name].map(d => (
      <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </Svg>
);
