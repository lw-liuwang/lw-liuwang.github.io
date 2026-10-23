import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { pathFor } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const cases = await getCollection('cases', ({ data }) => !data.draft);
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const urls = ['', 'contributions', 'writing'].map((page) => pathFor(page));
  for (const entry of [...cases, ...writing]) {
    urls.push(pathFor(`${entry.collection === 'cases' ? 'contributions' : 'writing'}/${entry.data.slug}`));
  }
  const body = urls.map((url) => `<url><loc>${new URL(url, site).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
