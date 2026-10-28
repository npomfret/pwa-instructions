import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULT_LOCALE, loadLabels } from './i18n.mjs';

/** Labels not verified within this many days are listed as due for another look. */
export const STALE_DAYS = 365;

/** Every `{surface, id, tag, verified}` whose `_src` date is more than a year before `now`, oldest first. */
export function staleLabels(labels, now = new Date()) {
  const cutoff = now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const stale = [];
  for (const [surface, entries] of labels) {
    for (const [id, entry] of Object.entries(entries)) {
      for (const [tag, source] of Object.entries(entry._src ?? {})) {
        if (tag !== DEFAULT_LOCALE && !(Date.parse(source.verified) >= cutoff)) stale.push({ surface, id, tag, verified: source.verified ?? 'never' });
      }
    }
  }
  return stale.sort((a, b) => a.verified.localeCompare(b.verified));
}

const HELP = `List browser labels whose verification is more than a year old.

Usage: node scripts/check-labels.mjs [--help]

Advisory only: always exits 0, and is not part of \`npm run check\`. Labels without a _src record are not listed;
the locale checks report those.

Example: npm run check:labels
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write(HELP); process.exit(0); }
  if (args.length) { process.stderr.write(HELP); process.exit(2); }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const stale = staleLabels(await loadLabels(root));
  for (const { surface, id, tag, verified } of stale) console.log(`${path.join('labels', `${surface}.json`)}: ${id} [${tag}] last verified ${verified}`);
  console.log(`${stale.length} label(s) not verified in the last ${STALE_DAYS} days.`);
}
