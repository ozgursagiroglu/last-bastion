import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const publicDir = join(root, 'public');

const CANONICAL = 'https://ozgursagiroglu.github.io/last-bastion/';
const OG_IMAGE = `${CANONICAL}og-image.png`;
const REPO = 'https://github.com/ozgursagiroglu/last-bastion';
const TITLE = 'Last Bastion — Tower Defense Built with arbab & ExodeUI';
const DESCRIPTION =
  'Free browser tower defense: 10 levels, 5 towers, 3 difficulties. Built by parallel AI agents with arbab and rendered entirely with the ExodeUI runtime.';

const html = readFileSync(join(root, 'index.html'), 'utf8');

function decode(text: string): string {
  return text.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

/** Attributes of every `<tag ...>` in index.html. */
function tags(tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map((m) =>
    Object.fromEntries([...(m[1] ?? '').matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map((a) => [a[1] ?? '', decode(a[2] ?? '')])),
  );
}

/** Content of the meta tag with this name or property. */
function meta(key: string): string | undefined {
  return tags('meta').find((t) => t.name === key || t.property === key)?.content;
}

function link(rel: string): Record<string, string>[] {
  return tags('link').filter((t) => t.rel === rel);
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ImageSize {
  width: number;
  height: number;
}

function pngSize(file: string): ImageSize {
  const data = readFileSync(file);
  if (data.toString('latin1', 1, 4) !== 'PNG' || data.toString('latin1', 12, 16) !== 'IHDR') throw new Error(`${file} is not a PNG`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function webpSize(file: string): ImageSize {
  const data = readFileSync(file);
  if (data.toString('latin1', 0, 4) !== 'RIFF' || data.toString('latin1', 8, 12) !== 'WEBP') throw new Error(`${file} is not a WebP`);
  const chunk = data.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
  throw new Error(`${file}: unknown WebP chunk '${chunk}'`);
}

/** A URL index.html references, as a file in the repo: public files are served from the site root. */
function localFile(url: string): string {
  const path = url.replace(/^\//, '');
  return path.startsWith('src/') ? join(root, path) : join(publicDir, path);
}

describe('index.html head', () => {
  it('has the title and description', () => {
    expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')).toBe(TITLE);
    expect(meta('description')).toBe(DESCRIPTION);
  });

  it('has keywords, author, robots, colors and the canonical URL', () => {
    const keywords = (meta('keywords') ?? '').split(',').map((k) => k.trim());
    expect(keywords).toEqual(['tower defense', 'browser game', 'html5 game', 'typescript', 'exodeui', 'arbab', 'claude code', 'ai agents', 'multi-agent']);
    expect(meta('author')).toBe('Özgür Sağıroğlu');
    expect(meta('robots')).toBe('index,follow');
    expect(meta('theme-color')).toBe('#14110f');
    expect(meta('color-scheme')).toBe('dark');
    expect(link('canonical').map((l) => l.href)).toEqual([CANONICAL]);
  });

  it('has Open Graph tags with absolute URLs under the canonical URL', () => {
    expect(meta('og:type')).toBe('website');
    expect(meta('og:site_name')).toBe('Last Bastion');
    expect(meta('og:title')).toBe(TITLE);
    expect(meta('og:description')).toBe(DESCRIPTION);
    expect(meta('og:url')).toBe(CANONICAL);
    expect(meta('og:image')).toBe(OG_IMAGE);
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('og:image:alt')?.length).toBeGreaterThan(20);
    expect(meta('og:locale')).toBe('en_US');
  });

  it('has Twitter card tags', () => {
    expect(meta('twitter:card')).toBe('summary_large_image');
    expect(meta('twitter:title')).toBe(TITLE);
    expect(meta('twitter:description')).toBe(DESCRIPTION);
    expect(meta('twitter:image')).toBe(OG_IMAGE);
    expect(meta('twitter:image:alt')).toBe(meta('og:image:alt'));
  });

  it('links the icons and the manifest', () => {
    const icons = link('icon').map((l) => [l.sizes, l.href]);
    expect(icons).toEqual([
      ['32x32', 'favicon-32.png'],
      ['16x16', 'favicon-16.png'],
    ]);
    expect(link('apple-touch-icon').map((l) => l.href)).toEqual(['apple-touch-icon.png']);
    expect(link('manifest').map((l) => l.href)).toEqual(['manifest.webmanifest']);
  });

  it('references only local assets that exist', () => {
    const urls = [
      ...tags('link').map((t) => t.href ?? ''),
      ...tags('script').map((t) => t.src ?? ''),
      ...[...html.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1] ?? ''),
    ].filter((u) => u !== '' && !/^https?:/.test(u));
    expect(urls).toContain('/fonts/LilitaOne-Regular.ttf');
    for (const url of urls) expect(existsSync(localFile(url)), url).toBe(true);
  });
});

describe('index.html structured data', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const data: unknown = JSON.parse(blocks[0]?.[1] ?? 'null');
  const graph = isRecord(data) && Array.isArray(data['@graph']) ? data['@graph'].filter(isRecord) : [];
  const node = (type: string): Record<string, unknown> => {
    const found = graph.find((n) => n['@type'] === type);
    if (!found) throw new Error(`no ${type} node`);
    return found;
  };
  const author = { '@id': `${CANONICAL}#author` };

  it('is one schema.org block with the four nodes', () => {
    expect(blocks).toHaveLength(1);
    expect(isRecord(data) && data['@context']).toBe('https://schema.org');
    expect(graph.map((n) => n['@type'])).toEqual(['VideoGame', 'SoftwareSourceCode', 'Person', 'FAQPage']);
  });

  it('describes the game', () => {
    expect(node('VideoGame')).toMatchObject({
      '@id': `${CANONICAL}#game`,
      name: 'Last Bastion',
      url: CANONICAL,
      description: DESCRIPTION,
      image: OG_IMAGE,
      genre: ['Tower defense', 'Strategy'],
      gamePlatform: 'Web browser',
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      playMode: 'SinglePlayer',
      numberOfPlayers: 1,
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { price: '0', priceCurrency: 'USD' },
      author,
      sameAs: REPO,
    });
  });

  it('describes the source code and its author', () => {
    expect(node('SoftwareSourceCode')).toMatchObject({
      '@id': `${CANONICAL}#source`,
      name: 'Last Bastion source code',
      codeRepository: REPO,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'Web browser (ExodeUI runtime)',
      license: 'https://opensource.org/licenses/MIT',
      author,
    });
    expect(node('Person')).toEqual({ '@type': 'Person', ...author, name: 'Özgür Sağıroğlu', url: 'https://github.com/ozgursagiroglu' });
  });

  it('answers the five questions', () => {
    const questions = node('FAQPage').mainEntity;
    expect(Array.isArray(questions)).toBe(true);
    const qa = (Array.isArray(questions) ? questions : []).filter(isRecord).map((q) => ({
      name: q.name,
      answer: isRecord(q.acceptedAnswer) ? q.acceptedAnswer.text : undefined,
    }));
    expect(qa.map((q) => q.name)).toEqual([
      'What is Last Bastion?',
      'How was Last Bastion built?',
      'What is ExodeUI?',
      'How much did it cost and how long did it take?',
      'How do I play?',
    ]);
    for (const q of qa) expect(typeof q.answer === 'string' && q.answer.length > 60, String(q.name)).toBe(true);
    expect(qa[1]?.answer).toContain('arbab');
    expect(qa[2]?.answer).toContain('King Sunny');
    expect(qa[3]?.answer).toContain(REPO);
  });
});

describe('index.html body', () => {
  it('has a visually hidden heading and description for crawlers and screen readers', () => {
    expect(html).toMatch(/<h1 class="visually-hidden">[^<]*Last Bastion[^<]*<\/h1>/);
    expect(html).toMatch(/<section class="visually-hidden"[^>]*>[\s\S]*How to play[\s\S]*<\/section>/);
    expect(html).not.toMatch(/\.visually-hidden\s*\{[^}]*display:\s*none/);
    for (const url of [REPO, 'https://github.com/ozgursagiroglu/arbab', 'https://www.exodeui.com/']) expect(html).toContain(`href="${url}"`);
  });

  it('keeps the game container and shows the essentials without JavaScript', () => {
    expect(html).toContain('<main id="app" aria-label="Last Bastion game"></main>');
    expect(html).toMatch(/<noscript>[\s\S]*Click a stone pad[\s\S]*<\/noscript>/);
  });
});

describe('public files', () => {
  it('has a manifest whose icons exist at their declared sizes', () => {
    const manifest = readJson(join(publicDir, 'manifest.webmanifest'));
    expect(manifest).toMatchObject({
      name: 'Last Bastion',
      short_name: 'Last Bastion',
      start_url: '.',
      scope: '.',
      display: 'fullscreen',
      orientation: 'landscape',
      background_color: '#14110f',
      theme_color: '#14110f',
    });
    const icons = isRecord(manifest) && Array.isArray(manifest.icons) ? manifest.icons.filter(isRecord) : [];
    expect(icons.map((i) => i.sizes)).toEqual(['192x192', '512x512']);
    for (const icon of icons) {
      const size = pngSize(join(publicDir, String(icon.src)));
      expect(`${size.width}x${size.height}`).toBe(icon.sizes);
    }
  });

  it('has a robots.txt and a sitemap pointing at the canonical URL', () => {
    const robots = readFileSync(join(publicDir, 'robots.txt'), 'utf8');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(new RegExp(`^Sitemap: ${CANONICAL}sitemap\\.xml$`, 'm'));
    expect(readFileSync(join(publicDir, 'sitemap.xml'), 'utf8')).toContain(`<loc>${CANONICAL}</loc>`);
  });

  it('has the Open Graph image and the icons at their sizes', () => {
    const sizes: Record<string, number> = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180, 'favicon-32.png': 32, 'favicon-16.png': 16 };
    expect(pngSize(join(publicDir, 'og-image.png'))).toEqual({ width: 1200, height: 630 });
    for (const [file, size] of Object.entries(sizes)) expect(pngSize(join(publicDir, file)), file).toEqual({ width: size, height: size });
  });
});

describe('README media', () => {
  const boards = ['title', 'level-select', 'wave-start', 'battle', 'meadow', 'desert', 'snow', 'volcano', 'build-menu', 'victory'];
  const sheets = ['towers', 'enemies'];

  it('has every screenshot as a WebP under 400 KB', () => {
    for (const name of [...boards, ...sheets]) {
      const file = join(root, 'docs', 'media', `${name}.webp`);
      expect(statSync(file).size, name).toBeLessThanOrEqual(400 * 1024);
      const size = webpSize(file);
      if (boards.includes(name)) expect(size, name).toEqual({ width: 1280, height: 720 });
      else expect(size.width * size.height, name).toBeGreaterThan(0);
    }
  });
});
