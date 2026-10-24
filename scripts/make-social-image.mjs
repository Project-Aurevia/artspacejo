// Regenerates public/og-image.png (1200x630) and public/apple-touch-icon.png (180x180)
// from vector sources, so the social preview always matches the brand mark.
//
//   node scripts/make-social-image.mjs
//
// Dev-time only (uses macOS QuickLook to rasterise SVG). The generated PNGs are committed,
// so neither CI nor the production server ever needs to run this.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'artspace-img-'));

const INK = '#161616';
const CREAM = '#F0E4D6';
const GOLD = '#C9A45C';
const TERRA = '#CB6B47';

// The mark from src/Logo.jsx (viewBox 0 0 100 130).
const mark = (x, y, scale) => `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M50 4C80 4 96 22 96 48V126H76V50C76 34 66 22 50 22Z" fill="${CREAM}"/>
    <path d="M8 126V62L30 76V108Q30 126 14 126Z" fill="${GOLD}"/>
    <path d="M10 50C10 30 24 14 44 14C30 24 28 40 44 52C60 62 78 70 70 100C66 114 56 122 44 126C60 108 62 88 44 76C24 64 10 62 10 50Z" fill="${GOLD}"/>
    <circle cx="48" cy="38" r="11" fill="${TERRA}"/>
  </g>`;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="32" y="32" width="1136" height="566" rx="26" fill="none" stroke="${GOLD}" stroke-opacity=".22" stroke-width="2"/>
  ${mark(110, 129, 2.86)}
  <text x="450" y="258" font-family="Georgia, 'Times New Roman', serif" font-size="24" letter-spacing="8" fill="${GOLD}">ART SPACE</text>
  <text x="450" y="352" font-family="Georgia, 'Times New Roman', serif" font-size="94" fill="${CREAM}">Art Space</text>
  <text x="450" y="424" font-family="'Geeza Pro', 'Al Bayan', Georgia, serif" font-size="50" fill="${CREAM}" fill-opacity=".85">مساحة الفن</text>
  <line x1="450" y1="466" x2="700" y2="466" stroke="${GOLD}" stroke-width="2" stroke-opacity=".7"/>
  <text x="450" y="524" font-family="Georgia, 'Times New Roman', serif" font-size="26" letter-spacing="1" fill="${CREAM}" fill-opacity=".6">Signage · Printing · Social Media · Marketing</text>
  <text x="450" y="562" font-family="Georgia, 'Times New Roman', serif" font-size="22" letter-spacing="3" fill="${GOLD}">AMMAN — JORDAN</text>
</svg>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${INK}"/>
  ${mark(33, 15, 1.15)}
</svg>`;

const rasterise = (svg, name, size) => {
  const src = path.join(TMP, `${name}.svg`);
  fs.writeFileSync(src, svg);
  const out = path.join(TMP, 'out');
  fs.mkdirSync(out, { recursive: true });
  execFileSync('qlmanage', ['-t', '-s', String(size), '-o', out, src], { stdio: 'ignore' });
  const png = path.join(out, `${name}.svg.png`);
  if (!fs.existsSync(png)) throw new Error(`QuickLook did not render ${name}.svg — run this on macOS.`);
  return png;
};

const emit = (png, dest, crop) => {
  if (crop) execFileSync('sips', ['-c', String(crop[0]), String(crop[1]), png, '--out', png], { stdio: 'ignore' });
  fs.copyFileSync(png, dest);
  const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', dest], { encoding: 'utf8' })
    .split('\n').filter((l) => l.includes('pixel')).map((l) => l.trim()).join(', ');
  console.log(`${path.relative(ROOT, dest)} — ${info}`);
};

emit(rasterise(ogSvg, 'og-image', 1200), path.join(PUBLIC, 'og-image.png'), [630, 1200]);
emit(rasterise(iconSvg, 'apple-touch-icon', 180), path.join(PUBLIC, 'apple-touch-icon.png'));

fs.rmSync(TMP, { recursive: true, force: true });
