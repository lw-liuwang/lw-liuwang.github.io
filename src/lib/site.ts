import snapshot from '../data/github.json';

export const github = snapshot;
export const pathFor = (path = '') => `/${path}${path ? '/' : ''}`;
export const date = (value: string | Date) => new Intl.DateTimeFormat(
  'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
).format(new Date(value));
export const statusLabel = (status: string) => ({
  merged: 'Merged',
  open: 'Open',
  closed: 'Closed',
  draft: 'Draft',
})[status] ?? status;
