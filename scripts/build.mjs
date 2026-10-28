import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { composeGuides } from "./compose-guides.mjs";
import { loadLabels, publishedLocales } from "./i18n.mjs";
import { writeLocaleOutputs } from "./emit-locales.mjs";
import { checkLocales, reportLocaleChecks } from "./check-locales.mjs";

async function writeChanged(file, value) {
  let old;
  try { old = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (old !== value) await writeFile(file, value);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const packageRoot = path.join(root, "packages/pwa-instructions");
// Incomplete or inconsistent locale data stops the build before anything is composed or written.
const checked = await checkLocales(root);
if (!(await reportLocaleChecks(root, checked))) throw new Error(`Locale checks failed: ${checked.errors.length} error(s); see tmp/check-locales.log`);
await rm(path.join(packageRoot, "dist"), { recursive: true, force: true });
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
const materialized = await composeGuides(root, catalog);
const guides = [];
for (const entry of catalog.guides) {
  const { data, folder, svg, text, steps } = materialized.get(entry.id);
  await writeChanged(path.join(folder, data.illustration.file), svg);
  await writeChanged(path.join(folder, data.textInstructions), text);
  const size = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!size) throw new Error(`Missing SVG viewBox: ${entry.id}`);
  const observed = data.compatibility.observedMajorVersions;
  const documentationOnly = data.compatibility.status === "documentation-only";
  if (!documentationOnly && (!data.compatibility.osVersionRange || !data.compatibility.browserVersionRange)) {
    throw new Error(`Missing compatibility ranges: ${entry.id}`);
  }
  if (documentationOnly && (data.compatibility.osVersionRange !== null || data.compatibility.browserVersionRange !== null ||
      observed[data.platform] !== null || observed[data.browser] !== null)) {
    throw new Error(`Documentation draft must not claim observed versions or ranges: ${entry.id}`);
  }
  guides.push({
    id: data.id, title: data.title, label: data.label ?? data.title, language: data.language,
    platform: data.platform, browser: data.browser, device: data.device,
    versions: { os: data.compatibility.osVersionRange, browser: data.compatibility.browserVersionRange,
      observedOS: observed[data.platform], observedBrowser: observed[data.browser],
      ...(documentationOnly ? { documentationOnly: true } : {}),
      minimumBrowserVersion: data.compatibility.minimumBrowserVersion,
      observedBrowserVersion: data.compatibility.observedVersions?.[data.browser],
      requiresKnownOSVersion: data.compatibility.requiresKnownOSVersion },
    illustration: { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      alt: data.illustration.alt, width: Number(size[1]), height: Number(size[2]) },
    steps, completion: data.completion.description, text,
  });
}
const generated = path.join(packageRoot, "src/core/generated");
await mkdir(generated, { recursive: true });
await writeFile(path.join(generated, "guides.ts"),
  '/* Generated from catalog.json and guides/. Do not edit. */\nimport type { InstallGuide } from "../types.js";\nexport const guides: readonly InstallGuide[] = ' + JSON.stringify(guides, null, 2) + ';\n');
// Only complete locales are built for publishing. Draft locales (and the en-XA pseudo-locale) are composed by tests alone.
const locales = new Map();
for (const tag of publishedLocales(catalog)) locales.set(tag, await composeGuides(root, catalog, tag));
await writeLocaleOutputs({ catalog, locales, english: materialized, generated, assets: path.join(packageRoot, "dist/assets"), labels: await loadLabels(root) });
execFileSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-b", "packages/pwa-instructions"], { cwd: root, stdio: "inherit" });
for (const entry of catalog.guides) {
  const folder = path.dirname(path.join(root, entry.path));
  const target = path.join(packageRoot, "dist/assets", entry.id);
  await mkdir(target, { recursive: true });
  const data = materialized.get(entry.id).data;
  // Published metadata keeps 0.1.0's plain step numbers; the {step:n} placeholders are a source-only detail.
  const metadata = await readFile(path.join(folder, "metadata.json"), "utf8");
  await writeFile(path.join(target, "metadata.json"), metadata.replace(/\{step:(\d+)\}/g, "$1"));
  for (const name of ["install.svg", "instructions.md", ...(data.artworkSource ? [data.artworkSource] : [])]) await cp(path.join(folder, name), path.join(target, name));
}
await cp(path.join(root, "LICENSE"), path.join(packageRoot, "LICENSE"));
console.log(`Built pwa-instructions with core and React entry points, ${guides.length} guide(s) and ${locales.size} extra locale(s).`);
