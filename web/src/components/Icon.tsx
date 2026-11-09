const ICON_PATHS = {
  clock: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 6.5V12l3.5 2',
  search: 'M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M16 16l4.5 4.5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2',
  bell: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0',
  user: 'M8.5 8.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7M9 7h8v8',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M5.4 18a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M15.4 18a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
  shield: 'M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6zM9 12l2 2 4-4',
  lock: 'M6.5 10h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10zM8 10V7a4 4 0 018 0v3',
  rotate: 'M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  sparkle: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8 9.5 8z',
  expand: 'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0M8 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  home: 'M4 11l8-6 8 6v9H4zM10 20v-5h4v5',
  watch: 'M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M9 6.8L9.8 3h4.4l.8 3.8M9 17.2l.8 3.8h4.4l.8-3.8M12 10v2l1.3 1',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  alert: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M12 7.5v5.5M12 16.5h.01',
  message: 'M4 5h16v11H9l-5 4z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  box: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  mail: 'M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5zM3.5 6l8.5 7 8.5-7',
  logOut: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  shop: 'M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export const Icon = ({ name, size = 20, strokeWidth = 1.7, fill = 'none', className }: { name: IconName; size?: number; strokeWidth?: number; fill?: string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={ICON_PATHS[name]} />
  </svg>
);
