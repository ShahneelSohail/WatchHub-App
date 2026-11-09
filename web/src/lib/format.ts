const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const wholeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatWholeMoney = (value: number): string => wholeCurrency.format(value);

export const formatMoney = (value: number): string => (Number.isInteger(value) ? wholeCurrency : currency).format(value);

export const formatDate = (value: string): string => new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const titleCase = (value: string): string => value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase());
