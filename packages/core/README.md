# @pwa-instructions/core

Framework-independent instructions and SVG artwork for installing web apps. Includes browser detection and guide selection; no React dependency or runtime network requests.

[API reference](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md) — function arguments, return values, selection states and guide data.

```js
import { detectBrowserEnvironment, selectGuide, guides } from '@pwa-instructions/core';
const result = selectGuide(detectBrowserEnvironment());
if (result.guide) {
  console.log(result.guide.steps); // Text for your own UI
  console.log(result.guide.illustration.src); // Self-contained SVG image URL
}
// Explicit selection works on any device:
const preview = selectGuide(null, { guideId: guides[0].id });
```

`detectEnvironment({ userAgent, maxTouchPoints, standalone })` is pure and can parse a supplied UA on a server. `detectBrowserEnvironment()` returns null on a server. Detection is a hint: browsers can disguise their identity. Always provide a manual choice in the host app.

`selectGuide(environment, { guideId?, guides? })` returns `status`, `guide`, `match`, `reason` and `environment`. Status is `matched`, `unsupported`, `needs-selection` or `installed`. A manual guide ID bypasses detection. Unsupported environments get no substitute guide.

Safari 26+ hides the real iOS version; a matching Safari browser version can select the iPhone layout with `match: 'browser-version'`. Newer releases reuse the latest known layout until a newer guide supersedes it, reported as `match: 'newer-version'`. For recorded layouts, the `versions` bounds are inclusive, with `max: null` meaning no recorded replacement yet. Documentation drafts instead have `versions.os` and `versions.browser` set to `null`, and `documentationOnly: true`.

Included guides cover iPhone Safari, Brave via Safari, iPhone Chrome, Mac Safari, Mac Chrome, Android Chrome, Windows Chrome, and Windows Edge. Reference versions are user-reported or recorded from the source owner's computer, with vendor documentation supporting the Mac routes. Brave additionally requires version 1.97 or later and a known matching OS; hidden version details request manual selection. The iPhone final confirmation is described in text; Mac confirmations are illustrated. Mac Chrome includes reopening from `chrome://apps` in its completion text.

SVG URLs use `data:image/svg+xml`. If your Content Security Policy excludes data images, serve `dist/assets/<guide-id>/install.svg` from your own origin instead. Raw SVG, Markdown and JSON also ship under the `@pwa-instructions/core/assets/*` exports. No original screenshots are included in the npm package.

MIT licensed. Source: https://github.com/npomfret/pwa-instructions


## Customize the displayed domain

The React adapter accepts `siteUrl="https://your-domain.com/path"` on `InstallInstructions` and `InstallGuideView`. The SVG displays only `your-domain.com`; it does not navigate there. Leaving the option empty uses `example.com`. Invalid URLs also use the default. Long domains are fitted inside the address bar.

Framework-independent code can use `getIllustration(guide, { siteUrl })` from the core. It returns a new illustration with the personalized `src` and alternative text. The shared guide remains unchanged. This option customizes bundled SVGs; an explicit `illustrationSrc` takes precedence. Colour customization is not implemented.

Android Chrome and both Windows guides are documentation drafts. They have no claimed OS/browser versions or version bounds; those fields are `null`. The selector reports `match: "documentation"` and a verification note. A compatible recorded layout takes priority over an unversioned draft.
