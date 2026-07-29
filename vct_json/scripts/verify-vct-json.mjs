import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA = join(ROOT, 'data');

async function listJsonl(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await listJsonl(path));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(path);
  }
  return found;
}

const report = JSON.parse(await readFile(join(ROOT, 'validation-report.json'), 'utf8'));
let rows = 0;
const failures = [];
for (const path of await listJsonl(DATA)) {
  let line = 0;
  const input = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const text of input) {
    line++; rows++;
    try {
      const record = JSON.parse(text);
      if (!record._source?.file || !Number.isInteger(record._source?.line) || !record.refs || !record.values) throw new Error('record contract failed');
    } catch (error) {
      failures.push({ path, line, error: error.message });
      if (failures.length >= 20) break;
    }
  }
  if (failures.length >= 20) break;
}

const expected = report.counters.outputRows;
const result = { verifiedAt: new Date().toISOString(), expectedRows: expected, actualRows: rows, validJson: failures.length === 0, rowCountMatches: rows === expected, failures };
await writeFile(join(ROOT, 'verification-result.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
if (!result.validJson || !result.rowCountMatches) process.exitCode = 1;
