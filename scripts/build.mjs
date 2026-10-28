import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { composeGuides } from "./compose-guides.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const name of ["core", "react"]) {
  await rm(path.join(root, "packages", name, "dist"), { recursive: true, force: true });
}
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
const materialized = await composeGuides(root, catalog);
const guides = [];
for (const entry of catalog.guides) {
  const source = path.join(root, entry.path);
  const { data, svg, text, steps } = materialized.get(entry.id);
  const size = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!size) throw new Error(`Missing SVG viewBox: ${entry.id}`);
  const observed = data.compatibility.observedMajorVersions;
  if (!data.compatibility.osVersionRange || !data.compatibility.browserVersionRange) {
    throw new Error(`Missing compatibility ranges: ${entry.id}`);
  }
  guides.push({
    id: data.id, title: data.title, label: data.label ?? data.title, language: data.language,
    platform: data.platform, browser: data.browser, device: data.device,
    versions: { os: data.compatibility.osVersionRange, browser: data.compatibility.browserVersionRange,
      observedOS: observed[data.platform], observedBrowser: observed[data.browser],
      minimumBrowserVersion: data.compatibility.minimumBrowserVersion,
      observedBrowserVersion: data.compatibility.observedVersions?.[data.browser],
      requiresKnownOSVersion: data.compatibility.requiresKnownOSVersion },
    illustration: { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      alt: data.illustration.alt, width: Number(size[1]), height: Number(size[2]) },
    steps, completion: data.completion.description, text,
  });
}
const generated = path.join(root, "packages/core/src/generated");
await mkdir(generated, { recursive: true });
await writeFile(path.join(generated, "guides.ts"),
  '/* Generated from catalog.json and guides/. Do not edit. */\nimport type { InstallGuide } from "../types.js";\nexport const guides: readonly InstallGuide[] = ' + JSON.stringify(guides, null, 2) + ';\n');
execFileSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-b", "packages/core", "packages/react"], { cwd: root, stdio: "inherit" });
for (const entry of catalog.guides) {
  const folder = path.dirname(path.join(root, entry.path));
  const target = path.join(root, "packages/core/dist/assets", entry.id);
  await mkdir(target, { recursive: true });
  const data = materialized.get(entry.id).data;
  for (const name of ["metadata.json", "install.svg", "instructions.md", ...(data.artworkSource ? [data.artworkSource] : [])]) await cp(path.join(folder, name), path.join(target, name));
}
for (const name of ["core", "react"]) await cp(path.join(root, "LICENSE"), path.join(root, "packages", name, "LICENSE"));
console.log(`Built core and React packages with ${guides.length} guide(s).`);
