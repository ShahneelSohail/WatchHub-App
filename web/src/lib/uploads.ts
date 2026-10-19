import { api } from './api';

export const uploadImages = (files: FileList | File[]): Promise<string[]> => {
  const body = new FormData();
  Array.from(files).forEach(file => body.append('images', file));
  return api.post<string[]>('/admin/uploads', body);
};
