import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = path.join(root, 'tests/fixtures/english');
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));

// Fixtures were captured before localization work began. Update them only for an intended English change.
for (const entry of catalog.guides) {
  const folder = path.dirname(path.join(root, entry.path));
  for (const name of ['install.svg', 'instructions.md']) {
    test(`${entry.id} ${name} matches the English snapshot`, async () => {
      assert.equal(await readFile(path.join(folder, name), 'utf8'), await readFile(path.join(fixtures, entry.id, name), 'utf8'));
    });
  }
}

test('generated guide data matches the English snapshot', async () => {
  const generated = await readFile(path.join(root, 'packages/pwa-instructions/src/core/generated/guides.ts'), 'utf8');
  assert.equal(generated, await readFile(path.join(fixtures, 'guides.ts'), 'utf8'));
});
