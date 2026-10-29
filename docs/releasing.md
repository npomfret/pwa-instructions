# Releasing pwa-instructions

Publish one public package from your personal npm account. No organisation is required. The main entry point contains detection and guide data; `/react` adds the optional React components.

Releases use [release-it](https://github.com/release-it/release-it), configured in `packages/pwa-instructions/.release-it.json`.

1. Run `npm login` and complete the browser sign-in. `npm whoami` confirms the account.
2. Make sure no other build or test run is in progress, and that `main` is pushed and clean.
3. Run `npm run release -- <increment>`, where `<increment>` is `patch`, `minor`, `major` or an exact version such as `0.2.0`. Add `--dry-run` first to see every step without changing anything.

The release:

1. Checks that you are logged in to npm and allowed to publish, that the new version is not on the registry yet, that you are on `main` with a clean working tree, and that the branch has an upstream.
2. Runs `npm run check` (build, typecheck and tests, including checks of the packed entry points). A failure stops the release before anything changes.
3. Sets the new version in `packages/pwa-instructions/package.json` and in the example's dependency, and refreshes `package-lock.json`.
4. Commits `release: pwa-instructions <version>`, creates the annotated tag `v<version>`, and pushes both.
5. Runs `npm publish`. When npm asks for a one-time password or browser authentication, complete it yourself.

It asks you to confirm each step. Then confirm the registry version with `npm view pwa-instructions version`, and check that a fresh consumer can install it and import both `pwa-instructions` and `pwa-instructions/react` when React is present.

Published versions cannot be replaced with different contents. Make a new version for later changes. Package files are explicitly limited to compiled JavaScript, declarations, guide assets, the README and the licence; reference screenshots, build caches and the release configuration are excluded.

See npm's [publishing guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/) and [authentication requirements](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).

## Changes since 0.1.0

Take the next release notes from this list, then clear it.

- **Locales:** eight locales ship as `pwa-instructions/locales/<tag>` modules and `dist/assets/<id>/<tag>/`: `es`, `fr`, `de`, `pt-BR`, `it`, `ja`, `ko` and `zh-Hans`. Every guide is fully translated in each, including the artwork, which is re-spaced so localized labels fit.
- **React:** `InstallInstructions` and `InstallGuideView` no longer render the `<h2>` ("Illustrated guide: ...", "Text instructions: ...", "Documentation draft") or its `aria-labelledby`, nor the `<p>` with `guide.completion`. They render the image and the numbered steps. Add your own heading and closing text; `guide.completion` and `guide.title` are still on the guide. Documentation-only guides are identified by `selection.match === "documentation"` and `guide.versions.documentationOnly`.
- **`instructions.md`:** now the title, the intro and the numbered steps only. The completion sentence and the lines linking `install.svg` and `metadata.json` are gone. `completion` stays in the guide data and `metadata.json`.
- **SVG header hidden by default:** the heading and subtitle at the top of each SVG are not drawn in `install.svg`, `dist/assets`, the bundled guides or the locale modules. The `viewBox` now starts at `y=72` and `illustration.width`/`height` describe the cropped image (72 shorter). Opt back in with `getIllustration(guide, { header: true })` or `illustrationHeader` on the components; the header text is carried as `illustration.header`.
- **Interface strings:** `LocaleUI` is now `{ website }`. `textInstructions`, `illustratedGuide`, `documentationDraft`, `heading`, `devices`, `platforms` and `browsers` are removed, as are the Markdown template strings in the locale data.
