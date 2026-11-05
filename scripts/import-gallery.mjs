/*
 * Import a folder of project photos into the portfolio.
 *
 *   node scripts/import-gallery.mjs --src "/path/to/folder" [--map data/gallery-map.json] [--dry] [--append]
 *
 * Why it groups photos on its own: every file is named `<postId>_<mediaId>_…` (the shape a
 * Facebook download produces). Photos uploaded together — i.e. the same place, the same job —
 * receive consecutive media ids, so a run of nearby ids is one project and a large jump is a
 * new one. That keeps one place's photos together and never mixes two places in a single card.
 *
 * The script never guesses a project name in public: without a map file it writes neutral
 * "Project N" titles that the owner renames in Admin → Website Content. Review
 * data/gallery-report.json (written on every run) to check the split before publishing.
 *
 * Options
 *   --src <dir>    folder holding the photos (required)
 *   --map <file>   JSON with real names/categories/cover choice, one entry per cluster, in order:
 *                  { "projects": [ { "key": "max-pump", "cat": "signage",
 *                                    "title": { "en": "...", "ar": "..." },
 *                                    "desc":  { "en": "...", "ar": "..." },
 *                                    "cover": 2 } ] }
 *   --gap <n>      media-id distance that starts a new project (default 600000000)
 *   --max <px>     longest side of the stored photos (default 1200)
 *   --quality <n>  JPEG quality (default 72)
 *   --append       keep existing projects instead of replacing them
 *   --dry          report only; copy nothing, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback; };
const flag = (name) => argv.includes(`--${name}`);

const SRC = arg('src');
if (!SRC) {
  console.error('Usage: node scripts/import-gallery.mjs --src "/path/to/photos" [--map data/gallery-map.json] [--dry] [--append]');
  process.exit(1);
}
if (!fs.existsSync(SRC)) { console.error(`Folder not found: ${SRC}`); process.exit(1); }

const DATA = process.env.DATA_DIR || path.join(root, 'data');
const MEDIA = path.join(DATA, 'media');
const GAP = Number(arg('gap', 6e8));
const DRY = flag('dry');
// 1200px covers a 4:5 card on a retina screen and still looks sharp in the 5xl viewer;
// the sources are Facebook-compressed already, so re-encoding larger only adds weight.
const MAX_EDGE = Number(arg('max', 1200));
const QUALITY = Number(arg('quality', 72));

/* ---------- read + group ---------- */
const IMG = /\.(jpe?g|png|webp)$/i;
const photos = fs.readdirSync(SRC)
  .filter((f) => IMG.test(f))
  .map((file) => {
    const m = file.match(/_(\d{10,})_/) || file.match(/^(\d{10,})/);
    return { file, id: m ? Number(m[1]) : null };
  })
  .filter((p) => p.id)
  .sort((a, b) => a.id - b.id);

if (!photos.length) { console.error(`No photos with a media id in their name inside ${SRC}`); process.exit(1); }

const clusters = [];
for (const p of photos) {
  const last = clusters[clusters.length - 1];
  if (last && p.id - last[last.length - 1].id <= GAP) last.push(p);
  else clusters.push([p]);
}

/* ---------- optional map (real names) ---------- */
const mapFile = arg('map');
const spec = mapFile && fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')).projects || [] : [];
const slug = (s, i) => String(s || `g${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `g${i + 1}`;

/* ---------- copy + optimise ---------- */
fs.mkdirSync(MEDIA, { recursive: true });
const projects = [];
const report = [];

clusters.forEach((cluster, ci) => {
  const s = spec[ci] || {};
  const key = slug(s.key, ci);
  // Idempotent: drop this project's previous files so a re-run does not leave orphans behind.
  for (const f of fs.readdirSync(MEDIA)) if (f.startsWith(`${key}-`)) fs.unlinkSync(path.join(MEDIA, f));

  const urls = cluster.map((p, k) => {
    const out = `${key}-${String(k + 1).padStart(2, '0')}.jpg`;
    const dest = path.join(MEDIA, out);
    if (!DRY) {
      try {
        execFileSync('sips', ['-Z', String(MAX_EDGE), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), path.join(SRC, p.file), '--out', dest], { stdio: 'ignore' });
      } catch (e) {
        console.error(`  ! could not convert ${p.file}: ${e.message}`);
        return null;
      }
    }
    return `/media/${out}`;
  }).filter(Boolean);

  if (!urls.length) return;
  const coverAt = Math.min(Math.max(Number(s.cover || 1) - 1, 0), urls.length - 1);
  projects.push({
    id: `g${ci + 1}`,
    cat: s.cat || 'signage',
    title: s.title || { en: `Project ${ci + 1}`, ar: `مشروع ${ci + 1}` },
    desc: s.desc || { en: '', ar: '' },
    image: urls[coverAt],
    images: urls.filter((_, k) => k !== coverAt),
  });
  report.push({ cluster: ci + 1, key, photos: cluster.length, firstMediaId: cluster[0].id, lastMediaId: cluster[cluster.length - 1].id, files: cluster.map((p) => p.file), cover: coverAt + 1 });
});

/* ---------- report ---------- */
const reportFile = path.join(DATA, 'gallery-report.json');
if (!DRY) fs.writeFileSync(reportFile, JSON.stringify({ source: SRC, gap: GAP, projects: report }, null, 2));

console.log(`\n  ${photos.length} photos → ${projects.length} projects${DRY ? ' (dry run, nothing written)' : ''}\n`);
for (const r of report) {
  const t = projects[r.cluster - 1]?.title;
  console.log(`  ${String(r.cluster).padStart(2)}. ${r.key.padEnd(14)} ${String(r.photos).padStart(2)} photos   cover #${r.cover}   ${t ? `${t.en} / ${t.ar}` : ''}`);
}

if (DRY) { console.log(`\n  Nothing copied. Map file: ${mapFile || '(none)'}\n`); process.exit(0); }

/* ---------- persist ---------- */
const db = new Database(path.join(DATA, 'artspace.db'));
db.pragma('journal_mode = WAL');
const row = db.prepare('SELECT data FROM settings WHERE id = ?').get('content');
const old = row ? JSON.parse(row.data) : {};
fs.writeFileSync(path.join(DATA, `content-backup-${Date.now()}.json`), JSON.stringify(old, null, 2));
const next = { ...old, projects: flag('append') ? [...(old.projects || []), ...projects] : projects };
db.prepare('INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run('content', JSON.stringify(next));
db.close();

console.log(`  Saved ${projects.length} projects to ${path.join(DATA, 'artspace.db')} (settings.content).`);
console.log(`  Report: ${reportFile}\n  Previous content backed up next to it. Reload the site to see the new portfolio.\n`);
