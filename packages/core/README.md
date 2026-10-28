# @pwa-instructions/core

Framework-independent instructions and SVG artwork for installing web apps. Includes browser detection and guide selection; no React dependency or runtime network requests.

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

Safari 26+ hides the real iOS version; a matching Safari browser version can select the iPhone layout with `match: 'browser-version'`. Newer releases reuse the latest known layout until a newer guide supersedes it, reported as `match: 'newer-version'`. The `versions` bounds are inclusive, with `max: null` meaning no recorded replacement yet.

Included guides cover iPhone Safari, Brave via Safari, Chrome, and Mac Safari. Reference versions are user-reported, with Apple documentation supporting the Mac route. Brave additionally requires version 1.97 or later and a known matching OS; hidden version details request manual selection. The final confirmation is described in text and is not illustrated yet.

SVG URLs use `data:image/svg+xml`. If your Content Security Policy excludes data images, serve `dist/assets/<guide-id>/install.svg` from your own origin instead. Raw SVG, Markdown and JSON also ship under the `@pwa-instructions/core/assets/*` exports. No original screenshots are included in the npm package.

MIT licensed. Source: https://github.com/npomfret/pwa-instructions
