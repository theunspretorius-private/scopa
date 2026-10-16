import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const SERVER = process.env.SCOPA_SERVER ?? 'http://localhost:8787';

/** Crawlable pages, in sitemap order. */
const PAGES = [
  { path: '/', priority: '1.0' },
  { path: '/how-to-play-scopa/', priority: '0.9' },
  { path: '/it/regole-scopa/', priority: '0.9' },
];

/**
 * SEO: replaces %SITE% in the HTML pages with the public origin (VITE_PUBLIC_URL) so canonical,
 * Open Graph and JSON-LD URLs are absolute, and emits robots.txt and sitemap.xml.
 */
function seo(site: string): Plugin {
  return {
    name: 'scopa-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE%', site),
    generateBundle() {
      if (!site) this.warn('VITE_PUBLIC_URL is not set: SEO URLs will be relative and no sitemap.xml is generated.');
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /m/', site ? `Sitemap: ${site}/sitemap.xml` : ''].join('\n');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.trim()}\n` });
      if (!site) return;
      const today = new Date().toISOString().slice(0, 10);
      const urls = PAGES.map(
        (p) => `  <url><loc>${site}${p.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p.priority}</priority></url>`,
      );
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const site = (loadEnv(mode, process.cwd(), 'VITE_').VITE_PUBLIC_URL || 'https://scopa.afrispeel.co.za').replace(/\/$/, '');
  let musicFiles: string[] = [];
  try {
    musicFiles = readdirSync(resolve(__dirname, 'public/music')).filter((f) => f.endsWith('.mp3'));
  } catch {}
  return {
    define: {
      __MUSIC_FILES__: JSON.stringify(musicFiles),
    },
    plugins: [seo(site)],
    server: {
      host: true,
      proxy: {
        '/api': SERVER,
        '/ws': { target: SERVER.replace(/^http/, 'ws'), ws: true },
      },
    },
    worker: { format: 'es' },
    build: {
      target: 'es2020',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          rules: resolve(__dirname, 'how-to-play-scopa/index.html'),
          regole: resolve(__dirname, 'it/regole-scopa/index.html'),
        },
      },
    },
    test: { include: ['tests/**/*.test.ts'] },
  };
});
