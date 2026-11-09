export const pluralize = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

export const matchesQuery = (query: string, ...fields: (string | number | null | undefined)[]): boolean => {
  const needle = query.trim().toLowerCase();
  return !needle || fields.some(field => String(field ?? '').toLowerCase().includes(needle));
};

const csvCell = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export const downloadCsv = (filename: string, header: string[], rows: (string | number)[][]) => {
  const body = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const shortDate = (value: string | Date): string => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const shortTime = (value: string): string => {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
