// Generated card: one fixed look for every source.
// With a cover (square/portrait share image), the cover sits on the left and the text on the right.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PALETTE = {
  background: '#0F172A',
  surface: '#1E293B',
  accent: '#F59E0B',
  text: '#F8FAFC',
};

export type Cover = { image: Buffer; ext: string; width: number; height: number };

const WIDTH = 1280;
const HEIGHT = 720;
const MAX_LINES = 4;

// The fonts sit beside this file rather than in node_modules, and are found
// from the project root, which is where both the local site and the hosted
// function run from. vercel.json names the folder so it is shipped.
const fontDir = join(process.cwd(), 'api', '_thumbnail', 'fonts');
const font = (file: string, weight: 500 | 700) => ({
  name: 'Inter',
  data: readFileSync(join(fontDir, file)),
  weight,
  style: 'normal' as const,
});
const fonts = [
  font('inter-latin-700-normal.woff', 700),
  font('inter-latin-ext-700-normal.woff', 700),
  font('inter-latin-500-normal.woff', 500),
];

/** Largest of `sizes` at which the title wraps into MAX_LINES or fewer within `usable` px. */
function fitFontSize(title: string, usable: number, sizes: number[]): number {
  for (const size of sizes) {
    const charsPerLine = Math.floor(usable / (size * 0.56));
    let lines = 1;
    let used = 0;
    let wordTooLong = false;
    for (const word of title.split(/\s+/)) {
      if (word.length > charsPerLine) wordTooLong = true;
      if (used && used + 1 + word.length > charsPerLine) {
        lines++;
        used = word.length;
      } else {
        used += (used ? 1 : 0) + word.length;
      }
    }
    if (lines <= MAX_LINES && !wordTooLong) return size;
  }
  return sizes[sizes.length - 1];
}

const el = (type: string, style: object, children?: unknown, extra: object = {}) => ({
  type,
  props: { style, children, ...extra },
});

/** Accent bar + title on top, label at the bottom, in a column of the given size. */
function textColumn(title: string, label: string, width: number, height: number, sizes: number[], labelSize: number) {
  return el('div', { width, height, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, [
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { width: 112, height: 10, borderRadius: 5, background: PALETTE.accent, marginBottom: 40 }),
      el(
        'div',
        {
          display: 'block',
          lineClamp: MAX_LINES,
          color: PALETTE.text,
          fontSize: fitFontSize(title, width, sizes),
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: '-0.02em',
        },
        title,
      ),
    ]),
    el('div', { display: 'block', lineClamp: 1, color: PALETTE.accent, fontSize: labelSize, fontWeight: 500 }, label),
  ]);
}

export async function renderCard(title: string, label: string, cover?: Cover): Promise<Buffer> {
  let content;
  if (cover) {
    const pad = 72;
    const gap = 56;
    const coverHeight = HEIGHT - pad * 2;
    const coverWidth = Math.round(Math.min(coverHeight, (coverHeight * cover.width) / cover.height));
    const mime = cover.ext === 'jpg' ? 'image/jpeg' : `image/${cover.ext}`;
    content = el('div', { display: 'flex', margin: pad, width: WIDTH - pad * 2, height: coverHeight }, [
      el('img', { width: coverWidth, height: coverHeight, objectFit: 'cover', borderRadius: 16, marginRight: gap }, undefined, {
        src: `data:${mime};base64,${cover.image.toString('base64')}`,
        width: coverWidth,
        height: coverHeight,
      }),
      textColumn(title, label, WIDTH - pad * 2 - coverWidth - gap, coverHeight, [72, 64, 56, 48, 42], 30),
    ]);
  } else {
    // Explicit inner box: padding on the outer box would widen it past the canvas.
    const pad = 88;
    content = el(
      'div',
      { display: 'flex', margin: pad },
      textColumn(title, label, WIDTH - pad * 2, HEIGHT - pad * 2, [96, 84, 72, 64, 56], 34),
    );
  }

  const tree = el(
    'div',
    { width: WIDTH, height: HEIGHT, display: 'flex', background: PALETTE.background, fontFamily: 'Inter' },
    content,
  );
  const svg = await satori(tree as never, { width: WIDTH, height: HEIGHT, fonts });
  return Buffer.from(new Resvg(svg).render().asPng());
}
