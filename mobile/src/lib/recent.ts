import { useSyncExternalStore } from 'react';

const MAX_RECENT = 5;

let recent: string[] = [];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const rememberSearch = (term: string) => {
  const value = term.trim();
  if (!value) return;
  recent = [value, ...recent.filter(entry => entry.toLowerCase() !== value.toLowerCase())].slice(0, MAX_RECENT);
  listeners.forEach(listener => listener());
};

export const useRecentSearches = (): string[] => useSyncExternalStore(subscribe, () => recent);
