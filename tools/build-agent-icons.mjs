// Rebuilds public/img/agents/<slug>.png from the official Riot assets in
// images/Characters/, instead of the base64 blobs originally embedded in
// the single-file HTML (see tools/extract-inline.mjs).
//
// images/Characters/<uuid>_small.png is still 1024x1024 (~800KB) despite
// the name — the CSS only ever displays these at 16px (.agicon), so we
// downsize to 64px (4x headroom for retina) before writing them out.
//
// images/ is a large untracked data source (see PLAN.md) — this script
// only ever reads from it, never writes to it.
//
// Run: node tools/build-agent-icons.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogPath = path.join(root, 'images', 'PublicContentCatalog.json');
const charactersDir = path.join(root, 'images', 'Characters');
const outDir = path.join(root, 'public', 'img', 'agents');
const OUT_SIZE = 64;

function slug(name) {
  return name.toLowerCase().replace(/\//g, '').replace(/[^a-z0-9]/g, '');
}

if (!existsSync(catalogPath)) {
  throw new Error(`Missing ${catalogPath} — this script needs the local images/ data source (see PLAN.md).`);
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const uuidBySlug = new Map();
for (const c of catalog.characters) uuidBySlug.set(slug(c.name.defaultText), c.id);

// Only rebuild icons for agents the app actually already ships (the files
// dropped in by extract-inline.mjs), so a catalog agent the roster doesn't
// use (e.g. unreleased) is never silently pulled in.
const targetSlugs = readdirSync(outDir)
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace(/\.png$/, ''));

let ok = 0, missing = [];
for (const s of targetSlugs) {
  const uuid = uuidBySlug.get(s);
  if (!uuid) { missing.push(s); continue; }
  const src = path.join(charactersDir, `${uuid}_small.png`);
  if (!existsSync(src)) { missing.push(`${s} (${uuid}_small.png not found)`); continue; }
  await sharp(src).resize(OUT_SIZE, OUT_SIZE, { fit: 'cover' }).png().toFile(path.join(outDir, `${s}.png`));
  ok++;
}

console.log(`Rebuilt ${ok} agent icons at ${OUT_SIZE}x${OUT_SIZE} from images/Characters/.`);
if (missing.length) console.log('Could not resolve:', missing);
