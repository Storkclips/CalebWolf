/*
 * Generates dist/sitemap.xml after `vite build`.
 *
 * Static public pages are listed explicitly. Dynamic entities (collections,
 * published blog posts, magazines) are pulled from live content sources:
 * Postgres (via DATABASE_URL / SUPABASE_DB_URL) for collections and posts,
 * and public/magazines/index.json for magazines. If the database isn't
 * reachable at build time, the sitemap still ships with the static pages.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = 'https://calebwolfphotography.com';

const staticPaths = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/collections', priority: '0.9', changefreq: 'weekly' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/blog/stories', priority: '0.7', changefreq: 'weekly' },
  { path: '/magazines', priority: '0.8', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/license', priority: '0.5', changefreq: 'monthly' },
  { path: '/explore', priority: '0.6', changefreq: 'monthly' },
  { path: '/buy-credits', priority: '0.5', changefreq: 'monthly' },
];

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

const parseDbUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || 5432,
      database: u.pathname.slice(1),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      ssl: { rejectUnauthorized: false },
    };
    } catch {
    return null;
  }
};

const fetchCollections = async (db) => {
  if (!db) return [];
  try {
    const client = new pg.Client({ ...db, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const { rows } = await client.query(
      "SELECT slug FROM themes WHERE is_published = true ORDER BY sort_order"
    );
    await client.end();
    return rows.map((r) => `/collections/${r.slug}`);
    } catch (err) {
    console.warn('sitemap: could not fetch collections:', err.message);
    return [];
  }
};

const fetchBlogPosts = async (db) => {
  if (!db) return [];
  try {
    const pg = await import('pg');
    const client = new pg.Client({ ...db, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const now = new Date().toISOString();
    const { rows } = await client.query(
      `SELECT id FROM blog_posts
       WHERE published = true AND is_archived = false
         AND (scheduled_at IS NULL OR scheduled_at <= $1)
       ORDER BY created_at DESC`,
      [now]
    );
    await client.end();
    return rows.map((r) => `/blog/${r.id}`);
    } catch (err) {
    console.warn('sitemap: could not fetch blog posts:', err.message);
    return [];
  }
};

const fetchMagazines = () => {
  const indexPath = resolve('public/magazines/index.json');
  if (!existsSync(indexPath)) return [];
  try {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    const magazines = Array.isArray(index) ? index : (index.magazines ?? []);
    return magazines
      .filter((m) => m.slug && m.slug !== 'example-magazine')
      .map((m) => `/magazines/${m.slug}`);
    } catch (err) {
    console.warn('sitemap: could not read magazines index:', err.message);
    return [];
  }
};

const run = async () => {
  const db = parseDbUrl(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
  const [collections, posts, magazines] = await Promise.all([
    fetchCollections(db),
    fetchBlogPosts(db),
    Promise.resolve(fetchMagazines()),
  ]);

  const entries = [
    ...staticPaths.map((p) => ({ path: p.path, priority: p.priority, changefreq: p.changefreq })),
    ...collections.map((path) => ({ path, priority: '0.8', changefreq: 'weekly' })),
    ...posts.map((path) => ({ path, priority: '0.7', changefreq: 'monthly' })),
    ...magazines.map((path) => ({ path, priority: '0.7', changefreq: 'monthly' })),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const urls = entries.map((e) =>
    [
      '  <url>',
      `    <loc>${xmlEscape(SITE_URL + e.path)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${e.changefreq}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n')
  );

  const xml = `<?xml version="1.1" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  writeFileSync(resolve('dist/sitemap.xml'), xml);
  console.log(`sitemap: wrote ${entries.length} URLs to dist/sitemap.xml`);
};

run();