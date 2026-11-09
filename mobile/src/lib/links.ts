import type { Href } from 'expo-router';

const WATCH_LINK = /^\/(?:watches|watch)\/([^/?#]+)/;
const ORDER_LINK = /^\/orders\/(\d+)/;
const TICKET_LINK = /^\/support\/(\d+)/;

export const routeForLink = (link: string | null | undefined): Href | null => {
  if (!link) return null;
  const watch = WATCH_LINK.exec(link);
  if (watch?.[1]) return { pathname: '/watch/[slug]', params: { slug: watch[1] } };
  const order = ORDER_LINK.exec(link);
  if (order?.[1]) return { pathname: '/orders/[id]', params: { id: order[1] } };
  const ticket = TICKET_LINK.exec(link);
  if (ticket?.[1]) return { pathname: '/support/[id]', params: { id: ticket[1] } };
  if (link === '/orders' || link === '/wishlist' || link === '/support' || link === '/faq') return link;
  return null;
};
