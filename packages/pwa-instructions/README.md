# pwa-instructions

Reusable PWA installation guides: browser detection, structured text and simple SVG illustrations, with optional React components.

```sh
npm install pwa-instructions
```

## React

In an app using React 18 or 19:

```jsx
import { InstallInstructions } from 'pwa-instructions/react';

<InstallInstructions
  siteUrl="https://your-domain.com"
  presentation="both"
  fallback={<p>Choose an installation guide for your browser.</p>}
/>
```

Leave `guideId` out for automatic browser selection. Supply a guide ID to choose explicitly. `presentation` accepts `"both"`, `"image"` or `"text"`. The optional `siteUrl` displays your domain in the SVG; it defaults to `example.com`.

The component displays instructions and does not initiate installation. Detection runs after mounting and supports server rendering. Components have no global stylesheet; use `className` to style the guide section.

## JavaScript and other frameworks

```js
import { detectBrowserEnvironment, selectGuide, getIllustration }
  from 'pwa-instructions';

const selection = selectGuide(detectBrowserEnvironment());
if (selection.guide) {
  const illustration = getIllustration(selection.guide, {
    siteUrl: 'https://your-domain.com',
  });
  // Render illustration.src and selection.guide.steps in your interface.
}
```

The main entry point has no React dependency. React is an optional peer dependency used only by `pwa-instructions/react`. Future framework adapters can have their own entry points in the same package.

Detection is a best-effort hint, so retain a manual choice where practical. Automatic matching stays within the same platform, browser and device. Android Chrome and Windows guides are documentation drafts with unverified version coverage; their selection result uses `match: "documentation"`.

SVGs are self-contained data URLs. Where Content Security Policy requires a hosted image, copy `dist/assets/<guide-id>/install.svg` to your public directory and supply `illustrationSrc`. Raw SVG, Markdown and JSON are also exposed through `pwa-instructions/assets/*`. Original reference screenshots are not included.

[API reference](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md) · [Live example](https://npomfret.github.io/pwa-instructions/) · [Source](https://github.com/npomfret/pwa-instructions)

MIT licensed.
