// Phase 2 (one-shot): split src/styles/all.css into per-screen files along
// the section comments that were already in the original <style> block.
// Purely organizational — same rules, same cascade order, just smaller files.
//
// The draft screen (stance grid + comp editor) and map veto were interleaved
// in the original source (draft, then veto, then comp editor). They're
// pulled apart here: draft.css gets both draft-screen chunks, veto.css
// gets the veto chunk in between. Verified zero selector overlap between
// the veto and comp-editor chunks, so this reordering is cascade-safe.
//
// Run: node tools/split-css.mjs
// Then delete src/styles/all.css and update src/main.js's import.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcPath = path.join(root, 'src', 'styles', 'all.css');
const outDir = path.join(root, 'src', 'styles');

const lines = readFileSync(srcPath, 'utf8').split('\n');
// 1-indexed, inclusive, matching the line numbers as read from the file.
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const files = {
  'base.css':    slice(1, 45),
  'select.css':  slice(46, 68),
  'hub.css':     slice(69, 115),
  'squad.css':   slice(116, 157),
  'match.css':   slice(158, 231),
  'mapview.css': slice(232, 429),
  'box.css':     slice(431, 456),
  'draft.css':   slice(458, 517) + '\n\n' + slice(539, 558),
  'veto.css':    slice(519, 537),
};

// Import order == original source order, so cascade order is unchanged.
const importOrder = ['base.css', 'select.css', 'hub.css', 'squad.css', 'match.css', 'mapview.css', 'box.css', 'draft.css', 'veto.css'];

mkdirSync(outDir, { recursive: true });
for (const name of importOrder) {
  writeFileSync(path.join(outDir, name), files[name].trim() + '\n');
}
writeFileSync(
  path.join(outDir, 'index.css'),
  importOrder.map(name => `@import './${name}';`).join('\n') + '\n',
);

console.log('Wrote', importOrder.length, 'CSS files + index.css to src/styles/');
