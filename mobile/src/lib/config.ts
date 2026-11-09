export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4100';

export const imageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
};
