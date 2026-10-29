# pwa-instructions

Reusable PWA installation guides: browser detection, structured text and simple SVG illustrations, with optional React components.

```sh
npm install pwa-instructions
```

<img src="https://raw.githubusercontent.com/npomfret/pwa-instructions/main/guides/ios/safari/iphone/layout-1/install.svg" width="280" alt="Four illustrated steps for iPhone Safari: open the Page Menu, tap Share, tap View More, then tap Add to Home Screen." />

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

Leave `guideId` out for automatic browser selection. Supply a guide ID to choose explicitly. `presentation` accepts `"both"`, `"image"` or `"text"`. The optional `siteUrl` displays your domain in the SVG; it defaults to `example.com`. The component renders only the image and the numbered steps; add your own heading and closing text (`guide.completion`). `illustrationHeader` (and `getIllustration(guide, { header: true })`) draws the heading and subtitle in the image, which are hidden by default.

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

The package has no runtime dependencies. The main entry point has no React dependency. React is an optional peer dependency used only by `pwa-instructions/react`. Future framework adapters can have their own entry points in the same package.

Detection is a best-effort hint, so retain a manual choice where practical. Automatic matching stays within the same platform, browser and device. Android Chrome and Windows guides are documentation drafts with unverified version coverage; their selection result uses `match: "documentation"`.

SVGs are self-contained data URLs. Where Content Security Policy requires a hosted image, copy `dist/assets/<guide-id>/install.svg` to your public directory and supply `illustrationSrc`. Raw SVG, Markdown and JSON are also exposed through `pwa-instructions/assets/*`. Original reference screenshots are not included.

## Localization

Guides are English unless you ask for a locale. 38 complete translations are published: `es`, `fr`, `de`, `pt-BR`, `it`, `ja`, `ko`, `zh-Hans`, `nl`, `pl`, `sv`, `da`, `nb`, `fi`, `ru`, `uk`, `tr`, `cs`, `sk`, `hu`, `ro`, `hr`, `el`, `pt-PT`, `es-419`, `fr-CA`, `zh-Hant`, `zh-HK`, `id`, `ms`, `th`, `vi`, `hi`, `ca`, `he`, `ar`, `bg` and `sl`, covering every guide, the artwork and the control names. Locale data is opt-in, so you only bundle what you use:

```js
import { registerLocale, selectGuide, detectBrowserEnvironment } from 'pwa-instructions';
import es from 'pwa-instructions/locales/es';

registerLocale('es', es);
const { guide, locale } = selectGuide(detectBrowserEnvironment(), { locale: 'es-MX' });
// locale: { requested: 'es-MX', resolved: 'es', fallback: false }
```

A locale that is not registered, or lacks a guide, gives that whole guide in English with `fallback: true`; guides are never half translated. The React components take the same `locale` prop. See the [API reference](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md#localization) for resolution rules, `browserLocale` and `detectUILocale()`.

The prose follows `locale`, but control names such as "Share" must match the user's browser. Pass `browserLocale: detectUILocale()` (after mounting) to take `uiLabel`, the quoted menu items and the artwork's labels from the browser's language; it defaults to `locale`. An English page with a non-English browser also needs `import en from 'pwa-instructions/locales/en'`. See [Localization](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md#localization).

British and US English: the English labels are the British ones (`en` is `en-GB`). `browserLocale: 'en-US'`, or `locale: 'en-US'` on its own, shows the US labels such as "Cast, save, and share" and "Summarize" with the same English prose; register `pwa-instructions/locales/en` to get them. See [Localization](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md#localization).

[API reference](https://github.com/npomfret/pwa-instructions/blob/main/docs/api.md) · [Live example](https://npomfret.github.io/pwa-instructions/) · [Source](https://github.com/npomfret/pwa-instructions)

MIT licensed.
