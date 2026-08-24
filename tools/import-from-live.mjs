/**
 * Converts the HTML snapshots in tools/snapshots/ into MDX pages under
 * src/content/pages/.
 *
 *   node tools/import-from-live.mjs
 *
 * Each top-level `.block` in the source markup maps onto one of the block
 * components in src/components/blocks/. Prose inside a block is converted to
 * markdown; images and internal links are rewritten to local paths.
 *
 * This is a one-shot importer kept in the repo so the conversion is
 * reproducible — day-to-day editing happens in the generated .mdx files.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOTS = join(ROOT, 'tools', 'snapshots');
const OUT = join(ROOT, 'src', 'content', 'pages');

const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/* ------------------------------------------------------------------ paths */

/** Maps a media URL from the live site onto its vendored local path. */
function localAsset(url) {
  if (!url) return url;
  const clean = url.split('?')[0];

  if (clean.includes('grip-media-storage')) {
    const parts = new URL(clean).pathname.replace(/^\//, '').split('/');
    const last = parts[parts.length - 1];
    const dot = last.lastIndexOf('.');
    // A few store keys carry no extension; they are all JPEGs.
    const ext = dot > 0 ? last.slice(dot) : '.jpg';
    const stem = dot > 0 ? last.slice(0, dot) : last;
    // store/media/<id>/media/<variant>-<hash>.<ext>
    const name =
      parts.length >= 4 && parts[1] === 'media'
        ? `media-${parts[2]}-${stem.split('-')[0]}${ext}`
        : last;
    return `/assets/media/${name}`;
  }

  // Sprockets digests: name-<64 hex>.ext -> name.ext
  const stripped = clean.replace(/-[0-9a-f]{64}(\.[A-Za-z0-9]+)$/, '$1');
  if (stripped.startsWith('/assets/team/')) return stripped;
  if (stripped.startsWith('/assets/')) {
    return `/assets/site/${stripped.split('/').pop()}`;
  }
  return stripped;
}

/** Rewrites links: absolute self-links become root-relative. */
function localLink(href) {
  if (!href) return href;
  return href.replace(/^https?:\/\/grip\.health(?=\/pages\/)/, '');
}

function isExternal(href) {
  return /^https?:\/\//.test(href) && !href.startsWith('https://grip.health/pages/');
}

/* ------------------------------------------------- html -> markdown prose */

/** Escapes the characters MDX would otherwise treat as syntax. */
function escapeText(text) {
  return text.replace(/([<>{}])/g, '\\$1');
}

const BUTTON_VARIANTS = [
  ['btn-orange', 'orange'],
  ['btn-purple', 'purple'],
  ['btn-dark-blue', 'dark-blue'],
  ['btn-white', 'white'],
  ['btn-green', 'green'],
  ['btn-lila', 'lila'],
  ['btn-primary', 'primary'],
  ['btn-secondary', 'secondary'],
];

function buttonVariant(cls = '') {
  for (const [needle, variant] of BUTTON_VARIANTS) {
    if (cls.includes(needle)) return variant;
  }
  return 'secondary';
}

/** Converts inline nodes (text, <a>, <strong>, <em>, <br>) to markdown. */
function inline($, nodes) {
  let out = '';
  nodes.each((_, node) => {
    if (node.type === 'text') {
      out += escapeText(node.data.replace(/\s+/g, ' '));
      return;
    }
    if (node.type !== 'tag') return;

    const el = $(node);
    switch (node.tagName) {
      case 'br':
        // Markdown hard break: exactly two trailing spaces.
        out = `${out.replace(/[ \t]+$/, '')}  \n`;
        break;
      case 'strong':
      case 'b':
        out += `**${inline($, el.contents()).trim()}**`;
        break;
      case 'em':
      case 'i':
        out += `*${inline($, el.contents()).trim()}*`;
        break;
      case 'a': {
        const href = localLink(el.attr('href') ?? '');
        const label = inline($, el.contents()).trim();
        out += label ? `[${label}](${href})` : '';
        break;
      }
      default:
        out += inline($, el.contents());
    }
  });
  return out;
}

/**
 * Converts a block's inner HTML to markdown, returning an array of lines.
 * `<a class="btn">` links become <Button> components rather than plain links.
 */
function prose($, container, { skip = [] } = {}) {
  const parts = [];

  container.children().each((_, node) => {
    if (node.type !== 'tag') return;
    const el = $(node);

    if (skip.some((sel) => el.is(sel))) return;

    switch (node.tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4': {
        const level = '#'.repeat(Number(node.tagName[1]));
        const text = inline($, el.contents()).trim();
        if (text) parts.push(`${level} ${text}`);
        break;
      }

      case 'p': {
        // A paragraph that is just a pill link becomes a <Button>.
        const anchors = el.children('a.btn');
        if (anchors.length > 0 && el.text().trim() === anchors.text().trim()) {
          anchors.each((_, a) => {
            const link = $(a);
            const href = localLink(link.attr('href') ?? '');
            const variant = buttonVariant(link.attr('class') ?? '');
            const ext = isExternal(href) ? ' external' : '';
            const buttonAttrs = `${attr('href', href)} ${attr('variant', variant)}`;
            parts.push(`<Button ${buttonAttrs}${ext}>${link.text().trim()}</Button>`);
          });
          break;
        }
        const text = inline($, el.contents()).trim();
        if (text) parts.push(text);
        break;
      }

      case 'ul':
      case 'ol': {
        const ordered = node.tagName === 'ol';
        const items = [];
        el.children('li').each((i, li) => {
          const marker = ordered ? `${i + 1}.` : '-';
          const text = inline($, $(li).contents()).trim().replace(/\n/g, ' ');
          if (text) items.push(`${marker} ${text}`);
        });
        if (items.length) parts.push(items.join('\n'));
        break;
      }

      case 'img': {
        const imgAttrs = [
          'class="img-responsive img-rounded"',
          attr('src', localAsset(el.attr('src') ?? '')),
          attr('alt', el.attr('alt') ?? ''),
        ].join(' ');
        parts.push(`<img ${imgAttrs} />`);
        break;
      }

      case 'div':
        // Unwrap incidental wrappers (e.g. .half-width inside a text block).
        parts.push(...prose($, el, { skip }));
        break;

      default: {
        const text = inline($, el.contents()).trim();
        if (text) parts.push(text);
      }
    }
  });

  return parts;
}

/** Indents a markdown body so it reads as nested inside a JSX block. */
function indent(lines, spaces = 2) {
  const pad = ' '.repeat(spaces);
  return lines
    .map((line) =>
      line
        .split('\n')
        .map((l) => (l.trim() ? pad + l : ''))
        .join('\n')
    )
    .join('\n\n');
}

/**
 * Renders a JSX attribute as an expression container, so quotes, braces and
 * other syntax inside the value cannot break out of the attribute.
 */
function attr(name, value) {
  return `${name}={${JSON.stringify(String(value))}}`;
}

function wrap(tag, attrs, body) {
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  if (!body.length) return `${open}</${tag}>`;
  return `${open}\n${indent(body)}\n</${tag}>`;
}

/** Pulls a background-image url() out of an inline style attribute. */
function bgImage(style = '') {
  const match = style.match(/url\((.*?)\)/);
  return match ? localAsset(match[1].trim()) : undefined;
}

/* ------------------------------------------------------- block conversion */

function convertBlock($, el) {
  const cls = el.attr('class') ?? '';
  const has = (name) => cls.split(/\s+/).includes(name);

  // News index grid — rendered from the content collection, not the snapshot.
  if (el.find('.block-news').length) {
    const heading = el.children('h2').first().text().trim();
    return `<NewsGrid${heading ? ` ${attr('heading', heading)}` : ''} />`;
  }

  // Landing hero. The spacer that follows is emitted by <Hero /> itself.
  if (has('block-header-home')) {
    const heading = el.find('h1').first().text().trim();
    const image = bgImage(el.attr('style'));
    const lead = prose($, el.find('.home-description').first(), { skip: ['h1'] });
    return wrap('Hero', `${attr('heading', heading)} ${attr('image', image)}`, lead);
  }

  // Skip: emitted by <Hero /> or by the news route.
  if (has('block-header-home-spacer')) return null;
  if (has('block-news-header') || has('block-news-image') || has('block-news-social')) return null;

  if (has('block-news-text')) {
    // The date / back-link row is rendered by <NewsMeta /> in the route.
    const body = prose($, el, { skip: ['.news-info'] });
    if (!body.length) return null;
    const columns = el.find('.block-text-columns').length > 0;
    const half = el.children('.half-width').length > 0;
    const attrs = [columns && 'columns', half && 'width="half"'].filter(Boolean).join(' ');
    return wrap('NewsText', attrs, body);
  }

  if (has('block-header')) {
    const h1 = el.find('h1').first();
    const half = (h1.attr('class') ?? '').includes('half-width');
    return `<PageHeader ${attr('heading', h1.text().trim())}${half ? ' half' : ''} />`;
  }

  if (has('block-header-image')) {
    const img = el.find('img').first();
    const attrs = [
      attr('src', localAsset(img.attr('src'))),
      attr('alt', img.attr('alt') ?? ''),
    ].join(' ');
    return `<HeaderImage ${attrs} />`;
  }

  if (has('block-card')) {
    const img = el.children('img.card-image').first();
    const content = el.find('.card-content').first();
    const heading = content.children('h2').first().text().trim();
    const body = prose($, content, { skip: ['h2'] });
    const attrs = [
      heading && attr('heading', heading),
      img.length && attr('image', localAsset(img.attr('src'))),
      img.length && attr('alt', img.attr('alt') ?? ''),
    ]
      .filter(Boolean)
      .join(' ');
    return wrap('Card', attrs, body);
  }

  if (has('block-people')) {
    const heading = el.children('h2').first().text().trim();
    const people = [];
    el.find('.person').each((_, node) => {
      const person = $(node);
      const img = person.find('.person-image img').first();
      people.push({
        name: person.find('.person-name').text().trim(),
        company: person.find('.person-company').text().trim() || undefined,
        image: img.length ? localAsset(img.attr('src')) : undefined,
        href: person.find('a').first().attr('href') || undefined,
      });
    });
    const json = JSON.stringify(people, null, 2)
      .split('\n')
      .map((l, i) => (i === 0 ? l : `  ${l}`))
      .join('\n');
    return `<People${heading ? ` ${attr('heading', heading)}` : ''} people={${json}} />`;
  }

  // Dark banner.
  const banner = el.children('.block-banner').first();
  if (banner.length) {
    const heading = banner.children('h2').first().text().trim();
    const media = banner.children('img.banner-media').first();
    const body = prose($, banner, { skip: ['h2', 'img.banner-media'] });
    const attrs = [
      heading && attr('heading', heading),
      media.length && attr('media', localAsset(media.attr('src'))),
      media.length && attr('mediaAlt', media.attr('alt') ?? ''),
    ]
      .filter(Boolean)
      .join(' ');
    return wrap('Banner', attrs, body);
  }

  // The rule's closing flourish plus its device artwork.
  if (el.children('.block-line-switch').length) {
    const ending = (el.children('.block-line-ending').attr('class') ?? '').match(
      /ending-on-(\w+)/
    );
    const body = prose($, el.children('.half-width').first());
    return wrap('LineEnding', attr('ending', ending ? ending[1] : 'home'), body);
  }

  if (has('block-columns')) {
    const img = el.find('.image-column img').first();
    const video = el.find('.image-column video').first();
    const textColumn = el.find('.text-column').first();
    // Derive the order from the DOM: the modifier class is not always present.
    const columns = el.children('.block-column');
    const side =
      columns.index(el.children('.image-column').first()) <
      columns.index(el.children('.text-column').first())
        ? 'left'
        : 'right';
    const body = prose($, textColumn);

    // The media column holds either an image or a poster-backed <video>.
    const media = video.length
      ? [
          attr('video', localAsset(video.find('source').first().attr('src'))),
          attr('poster', localAsset(video.attr('poster'))),
        ]
      : [attr('image', localAsset(img.attr('src'))), attr('alt', img.attr('alt') ?? '')];

    const attrs = [
      ...media,
      attr('side', side),
      has('block-lined') && 'lined',
      has('news-block') && 'news',
    ]
      .filter(Boolean)
      .join(' ');
    return wrap('Columns', attrs, body);
  }

  if (has('block-lined')) {
    const body = prose($, el.children('.half-width').first());
    const buttons = [];
    el.children('.block-line-button').each((_, node) => {
      const button = $(node);
      const link = button.find('a').first();
      const color = (button.attr('class') ?? '').includes('orange-line') ? 'orange' : 'blue';
      const buttonAttrs = `${attr('href', localLink(link.attr('href')))} ${attr('color', color)}`;
      buttons.push(`<LineButton ${buttonAttrs}>${link.text().trim()}</LineButton>`);
    });

    if (buttons.length) {
      body.push(`<div slot="buttons">\n${indent(buttons)}\n</div>`);
    }
    return wrap('Lined', '', body);
  }

  if (el.find('.block-text-columns').length) {
    return wrap('TextColumns', '', prose($, el));
  }

  if (has('block-center')) {
    return wrap('TextBlock', 'center', prose($, el));
  }

  // Plain text block: half-width measure when the source wraps it that way.
  const body = prose($, el);
  if (!body.length) return null;
  const half = el.children('.half-width').length > 0;
  return wrap('TextBlock', half ? 'width="half"' : 'width="full"', body);
}

/* ---------------------------------------------------------- page assembly */

function parseDutchDate(text) {
  const match = text.trim().match(/^(\d{1,2})\s+([a-zé]+)\s+(\d{4})$/i);
  if (!match) return undefined;
  const month = DUTCH_MONTHS.indexOf(match[2].toLowerCase());
  if (month < 0) return undefined;
  const day = String(match[1]).padStart(2, '0');
  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${day}`;
}

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function convertPage(html) {
  const $ = cheerio.load(html);

  const rawTitle = $('title').text().trim();
  const title = rawTitle.replace(/^Grip\s*[–-]\s*/, '');
  const description = $('meta[name="description"]').attr('content') ?? '';
  const ogImage = $('meta[property="og:image"]').attr('content');

  const isNews = $('.block-news-header').length > 0;
  const crumb = $('.breadcrumbs .current').last().text().trim();
  const activeNav = $('.website-bar-menuitem.active').attr('href')?.replace('/pages/', '');

  // News articles: masthead image and publication date come from the markup.
  const newsImage = isNews ? bgImage($('.block-news-image').attr('style')) : undefined;
  const date = isNews ? parseDutchDate($('.news-publish-date').first().text()) : undefined;

  const frontmatter = [`title: ${yamlString(title)}`];
  if (description) frontmatter.push(`description: ${yamlString(description)}`);
  if (isNews) frontmatter.push('type: news');
  if (date) frontmatter.push(`date: ${date}`);

  const image = isNews ? newsImage : ogImage ? localAsset(ogImage) : undefined;
  if (image) frontmatter.push(`image: ${yamlString(image)}`);
  if (isNews) {
    const alt = $('.block-news-image img').attr('alt');
    if (alt) frontmatter.push(`imageAlt: ${yamlString(alt)}`);
  }
  if (crumb && crumb !== title) frontmatter.push(`crumb: ${yamlString(crumb)}`);
  if (activeNav && !isNews) frontmatter.push(`nav: ${yamlString(activeNav)}`);

  const body = [];
  $('.website-main-content')
    .children('.block')
    .each((_, node) => {
      const out = convertBlock($, $(node));
      if (out) body.push(out);
    });

  return `---\n${frontmatter.join('\n')}\n---\n\n${body.join('\n\n')}\n`;
}

/* ------------------------------------------------------------------- main */

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SNAPSHOTS).filter((f) => f.endsWith('.html'));
let written = 0;

for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  const mdx = convertPage(readFileSync(join(SNAPSHOTS, file), 'utf8'));
  writeFileSync(join(OUT, `${slug}.mdx`), mdx);
  written += 1;
  console.log(`  ${slug}.mdx  (${mdx.split('\n').length} lines)`);
}

console.log(`\nWrote ${written} MDX pages to src/content/pages/`);
