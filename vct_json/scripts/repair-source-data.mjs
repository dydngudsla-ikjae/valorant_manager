import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const correction = {
  id: '2026-nrg-mislabeled-as-mega-minors',
  scope: 'stats/vct_2026/**/*.csv',
  from: 'Mega Minors',
  to: 'NRG',
  expectedOccurrences: 18568,
  evidence: [
    'stats/vct_2026/ids/teams_ids.csv declares NRG as team ID 1034',
    'match titles identify the affected side as NRG',
    'the affected roster is the 2026 NRG roster'
  ]
};

function csvFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? csvFiles(full) : entry.isFile() && entry.name.endsWith('.csv') ? [full] : [];
  });
}

const files = csvFiles(path.join(root, 'stats/vct_2026'));
const affected = [];
let occurrences = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(correction.from).length - 1;
  if (count) {
    affected.push({ file: path.relative(root, file).replaceAll('\\', '/'), occurrences: count });
    occurrences += count;
  }
}

if (occurrences === 0) {
  console.log(JSON.stringify({ status: 'already_applied', correction: correction.id }, null, 2));
  process.exit(0);
}
if (occurrences !== correction.expectedOccurrences) {
  throw new Error(`Refusing correction: expected ${correction.expectedOccurrences} occurrences, found ${occurrences}`);
}

for (const item of affected) {
  const file = path.join(root, item.file);
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.replaceAll(correction.from, correction.to), 'utf8');
}

const report = {
  schemaVersion: 1,
  appliedAt: new Date().toISOString(),
  correction,
  affectedFiles: affected,
  replacedOccurrences: occurrences
};
fs.writeFileSync(path.join(root, 'vct_json/source-corrections-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
