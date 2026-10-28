import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

test('one packed package supports a React-free core and the optional React entry point', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'pwa-instructions-package-'));
  try {
    const [pack] = JSON.parse(execFileSync('npm', ['pack', '--workspace', 'pwa-instructions',
      '--ignore-scripts', '--json', '--cache', path.join(temporary, 'cache'), '--pack-destination', temporary],
    { cwd: root, encoding: 'utf8' }));
    const files = pack.files.map(file => file.path);
    for (const expected of ['dist/core/index.js', 'dist/core/index.d.ts', 'dist/react/index.js',
      'dist/react/index.d.ts', 'dist/assets/ios-safari-iphone-layout-1/install.svg', 'LICENSE', 'README.md']) {
      assert.ok(files.includes(expected), expected);
    }
    assert.ok(files.every(file => !/source-images|node_modules|\.tsbuildinfo$|\.(?:png|jpe?g)$/.test(file)));

    const consumer = path.join(temporary, 'consumer');
    const nodeModules = path.join(consumer, 'node_modules');
    const installed = path.join(nodeModules, 'pwa-instructions');
    await mkdir(installed, { recursive: true });
    await writeFile(path.join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
    execFileSync('tar', ['-xzf', path.join(temporary, pack.filename), '-C', installed, '--strip-components=1']);
    const manifest = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'pwa-instructions');
    assert.equal(manifest.peerDependenciesMeta.react.optional, true);
    assert.equal(manifest.dependencies, undefined);

    // This process has no React available in its module tree.
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { guides, detectEnvironment, selectGuide } from 'pwa-instructions';
      assert.ok(guides.length > 0);
      const environment = detectEnvironment({userAgent: 'Mozilla/5.0 (Macintosh) Version/27.0 Safari/605.1.15'});
      assert.equal(selectGuide(environment).guide.id, 'macos-safari-desktop-layout-1');
      assert.ok(import.meta.resolve('pwa-instructions/assets/ios-safari-iphone-layout-1/install.svg').endsWith('install.svg'));
      await assert.rejects(import('pwa-instructions/react'), {code: 'ERR_MODULE_NOT_FOUND'});
    `], { cwd: consumer, stdio: 'pipe' });

    // Supply only the app's React peers, then exercise the archive's React code.
    for (const name of ['react', 'react-dom']) {
      await symlink(path.dirname(require.resolve(`${name}/package.json`)), path.join(nodeModules, name),
        process.platform === 'win32' ? 'junction' : 'dir');
    }
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { guides } from 'pwa-instructions';
      import { InstallInstructions } from 'pwa-instructions/react';
      for (const guide of guides) {
        const html = renderToStaticMarkup(createElement(InstallInstructions, {guideId: guide.id, siteUrl: 'my-app.example'}));
        assert.equal((html.match(/<li>/g) ?? []).length, guide.steps.length);
        assert.ok(html.includes('my-app.example'));
      }
    `], { cwd: consumer, stdio: 'pipe' });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
