# API reference

One npm package provides two entry points: `pwa-instructions/react` displays installation instructions, and `pwa-instructions` provides guide data, detection and selection for any JavaScript framework. React is an optional peer dependency and is only needed for the React entry point. Install it with `npm install pwa-instructions`.

## React

```jsx
import { InstallInstructions } from 'pwa-instructions/react';

<InstallInstructions
  siteUrl="https://your-domain.com"
  presentation="both"
  fallback={<p>Choose an installation guide for your browser.</p>}
/>
```

The components render the image and the numbered steps, and nothing else: no heading and no closing sentence. Add your own around them, so the page's wording and markup stay yours. `guide.title`, `guide.label` and `guide.completion` (the closing sentence, in the guide's language) are on the guide, which `selectGuide` returns. A guide based on vendor documentation, with versions unverified, is identified in the data: `selection.match === "documentation"` and `guide.versions.documentationOnly === true`.

Automatic selection is the default: **leave `guideId` out**. Detection runs after mounting, so server rendering and initial hydration agree. The component displays the fallback while detection is pending or no guide is selected. It displays instructions; it does not install the app or open a browser's installation prompt.

### `InstallInstructions` props

All props are optional.

| Prop | Default | Effect |
| --- | --- | --- |
| `guideId` | Omitted | Automatically detect and select a guide. Supply a real guide ID, such as `ios-safari-iphone-layout-1`, to force that guide on any device. There is no special `"auto"` ID. An explicit ID takes precedence over detection and `environment`. |
| `siteUrl` | `example.com` | Display your domain in the bundled SVG. Accepts an HTTP(S) URL or bare domain. Displays the host, including a port when present, and omits credentials, paths, queries and fragments. Blank or invalid input uses the default. |
| `presentation` | `"both"` | `"both"`: SVG and numbered text. `"image"`: SVG. `"text"`: numbered text. |
| `fallback` | `null` | A React node, or a function receiving the selection result, rendered when no guide is available. Use the function to distinguish pending selection, unsupported browsers and an app already running in standalone mode. |
| `environment` | Omitted | Detect in the browser. Supply an `Environment` object to use your own detection, or `null` to disable detection and wait for an explicit `guideId`. |
| `guides` | Bundled guides | A custom array of `InstallGuide` objects used for automatic and explicit selection. |
| `locale` | Omitted (English) | A BCP 47 tag, or tags in order of preference. Shows the guide and image in that language when its data is registered; otherwise the whole guide is English. See [Localization](#localization). |
| `browserLocale` | Same as `locale` | A tag, or tags in order of preference, for the language of the browser or OS interface. It decides the control names (`uiLabel`, the menu items quoted in the text, the labels drawn in the artwork); `locale` still decides the prose. Pass `detectUILocale()` yourself; it is never read automatically. When it differs from the text's language the section gets `data-pwa-browser-locale`. See [Localization](#localization). |
| `localeData` | Omitted | Locale data by tag, used with or instead of `registerLocale`. |
| `className` | Omitted | CSS class on the rendered guide section. Components have no global stylesheet. |
| `illustrationHeader` | `false` | Draw the heading and subtitle ("Add to Home Screen", "iPhone · Safari") at the top of the bundled image, in the guide's language. By default the image starts at the first step. See [The image header](#the-image-header). |
| `illustrationSrc` | Bundled SVG data URL | Override the image URL, for example when your Content Security Policy requires an image hosted on your own origin. This takes precedence over `siteUrl` and `illustrationHeader`; custom images are not personalized. |

Use the exported `guides` array to build a manual selector. Its items have stable `id` values and readable `label` values. Retain a manual choice where practical because browsers can hide their identity or versions.

### `InstallGuideView`

Renders a known guide with no detection or selection. Its required `guide` prop is an `InstallGuide` object. It also accepts `presentation`, `siteUrl`, `illustrationHeader`, `className`, `illustrationSrc`, `locale`, `browserLocale` and `localeData` with the same defaults and behavior above. An English guide is localized by `locale`; a guide already in another language, such as one returned by `selectGuide` with a locale, is shown as it is.

When a locale is requested, or the guide is not English, the section carries `data-pwa-locale` (the language of the text shown) and `lang`, which is left off when it equals the page's `<html lang>`. A guide shown in English because the locale is missing also has `data-pwa-locale-fallback="true"`. Without a locale, the markup is the same as in 0.1.0.

## Framework-independent JavaScript

Import these functions and data from `pwa-instructions`. They are also re-exported by the React entry point.

| Export | Purpose |
| --- | --- |
| `detectBrowserEnvironment()` | Read browser hints and standalone mode. Returns an `Environment`, or `null` outside the browser. Safe to import and call on a server. |
| `detectEnvironment({ userAgent?, maxTouchPoints?, standalone? })` | Pure detection from supplied hints, useful for server code or your own detection inputs. Omitted hints default to an empty user agent, no touch points and `standalone: false`. |
| `selectGuide(environment, { guideId?, guides?, locale?, browserLocale?, localeData? } = {})` | Select the appropriate guide. An explicit `guideId` bypasses automatic matching, including the standalone check. An unknown ID returns no guide. With `locale`, the selected guide is localized. |
| `getIllustration(guide, { siteUrl?, header?, locale?, browserLocale?, localeData? } = {})` | Return the illustration with a customized domain. Returns `{ src, alt, width, height, header? }` without mutating the guide. Externally hosted illustrations are returned unchanged. With `locale`, the artwork and alt text are that locale's. With `header: true`, the heading and subtitle are drawn, and `height` is the taller image's. |
| `resolveLocale(requested, available)` | Pick the tag to use. See [Localization](#localization). |
| `registerLocale(tag, data)` | Make a locale's data available to every call. |
| `getGuideLocales(guide, localeData?)` | The tags that can serve a guide: `"en"` plus every registered locale with data for it. |
| `detectUILocale()` | `navigator.languages[0]`, or `undefined` on the server. |
| `localizeGuide(guide, { locale?, localeData? })` | The localization `selectGuide` applies, for a guide you already hold. Returns `{ guide, locale }`. |
| `getLocaleUI(locale?, localeData?)` | The interface strings for a locale: `{ website }`, the alt-text sentence "Website: {host}." |
| `guides` | Readonly array of bundled guide data. Use it for your own controls, rendering or explicit selection. |

The automatic selection call is `selectGuide(detectBrowserEnvironment())`. Detection, selection and domain customization make no network requests.

### Environment

An `Environment` contains `platform`, `browser`, `device`, `osMajor`, `browserMajor`, optional `browserVersion`, and `standalone`. Unknown versions are `null`; identities may be `"unknown"`. Standalone mode means the site is currently running as an app, not that installation has been detected from an ordinary browser tab.

### Selection result

The result contains `status`, `guide`, `match`, `reason` and `environment`. Check `guide` before rendering; it is `null` whenever no guide was selected. `reason` is an English sentence for developers and logs; do not show it to users. When you pass `locale`, the result also has `reasonCode`, a stable identifier to map to your own text (`guide-chosen`, `guide-not-found`, `needs-environment`, `installed`, `no-guide-for-browser`, `documentation-only`, `version-hidden`, `no-guide-for-version`, `os-hidden`, `os-ambiguous`, `newer-version`, `browser-version` or `version-match`), and `locale` (see below). Calls without `locale`, or with only a `browserLocale` that names the same locale, return exactly the 0.1.0 object.

| `status` | Meaning |
| --- | --- |
| `matched` | A guide was selected. |
| `needs-selection` | Detection is pending, missing or ambiguous; ask the user to choose. |
| `unsupported` | No guide covers the supplied environment or requested ID. |
| `installed` | The site is already running in standalone mode. |

When a guide is selected, `match` explains its basis:

| `match` | Meaning |
| --- | --- |
| `manual` | Selected by an explicit guide ID. |
| `observed` | Major versions match the recorded reference. |
| `browser-version` | Selected using the browser version while the OS version is hidden. |
| `newer-version` | The latest known layout is used for a newer release; controls may have changed. |
| `documentation` | Based on vendor instructions, with device and version compatibility still unverified. |

Otherwise `match` is `null`. Automatic matching stays within the same platform, browser and device; it does not substitute an iPhone guide for a Mac. Compatible recorded layouts take priority over documentation drafts.

## Localization

Guides are English by default and every call without `locale` behaves as in 0.1.0. Each locale is an opt-in module, so bundlers drop the ones you do not import. Guide identity does not depend on language: a guide keeps its `id`, and `selectGuide` stays synchronous.

```js
import { registerLocale, selectGuide, detectUILocale } from 'pwa-instructions';
import es from 'pwa-instructions/locales/es';

registerLocale('es', es);
const selection = selectGuide(environment, { locale: detectUILocale() ?? 'en' });
// selection.guide.language === 'es'; selection.locale: { requested: 'es-MX', resolved: 'es', fallback: false }
```

You can skip registration and pass the same data per call: `{ locale: 'es', localeData: { es } }`. Data passed per call wins over registered data for the same tag. A module's default export is `LocaleData` (`{ guides, ui? }`); `guides` and `ui` are also named exports. 38 locale modules are published (`es`, `fr`, `de`, `pt-BR`, `it`, `ja`, `ko`, `zh-Hans`, `nl`, `pl`, `sv`, `da`, `nb`, `fi`, `ru`, `uk`, `tr`, `cs`, `sk`, `hu`, `ro`, `hr`, `el`, `pt-PT`, `es-419`, `fr-CA`, `zh-Hant`, `zh-HK`, `id`, `ms`, `th`, `vi`, `hi`, `ca`, `he`, `ar`, `bg` and `sl`), plus the opt-in `en` module described below. The `en-XA` pseudo-locale is a test tool and is not published.

`resolveLocale(requested, available)` returns `{ requested, resolved, fallback }`:

- Tags are trimmed, `_` becomes `-`, and they are canonicalized with `Intl.getCanonicalLocales`, so `pt_br` and `PT-br` are `pt-BR`. An invalid tag is skipped.
- A tag falls back by trimming: `pt-BR`, then `pt`, then `en`. English is always available. An array is tried in order.
- A script is never crossed. `zh-Hans` never serves `zh-Hant`; `zh-TW` finds `zh-Hant` but not a bare `zh`.
- `requested` is the first tag asked for, in canonical form, or `null` when none was. `fallback` is `false` when the text is in the language asked for (`pt-BR` served by `pt` counts), and `true` when it is not, including when a later tag in an array was used.

**Fallback is per guide.** A guide is either fully in the locale or fully English, never mixed. A locale serves a guide only if it has that guide and every one of its steps. When a locale is requested and a guide comes back in English, it has `localeFallback: true` and `requestedLocale`, so you can tell even if you keep only the guide. `GuideSelection.locale` and `reasonCode` appear only when `locale` is passed (or a `browserLocale` for another locale than the page's); this keeps calls without it identical to 0.1.0. `getGuideLocales(guide)` lists what can serve a guide, for building a language picker.

**Page language and browser language.** The names of controls in the steps ("Share", "Add to Home Screen") must match what the user's device shows. `detectUILocale()` returns the first of `navigator.languages`, which is a proxy for the browser's interface language and not a guarantee. It returns `undefined` on the server, so call it after mounting to keep hydration consistent. See the next paragraph for `browserLocale`, which sets the control names independently of the prose.

**Browser locale.** Pass `browserLocale` when the page text and the user's browser are in different languages, so the guide says "Compartir" in Spanish prose only if that is what the user's Safari shows. The prose (step titles and descriptions, completion, intro, headings, alt text and Markdown) follows `locale`. The control names follow `browserLocale`, and it defaults to `locale`, so existing calls are unchanged.

```js
import { registerLocale, selectGuide, detectUILocale } from 'pwa-instructions';
import es from 'pwa-instructions/locales/es';
import en from 'pwa-instructions/locales/en'; // only for an English page with a non-English browser

registerLocale('es', es);
registerLocale('en', en);
// After mounting: the page is English, the browser may be Spanish.
const selection = selectGuide(environment, { locale: 'en', browserLocale: detectUILocale() });
// selection.locale.browser: { requested: 'es-MX', resolved: 'es', fallback: false }
```

How it works:

- Each locale module also carries each guide's prose with the `{label:id}` placeholders still in it, and a label table (id to text) for the browser locale and English. At runtime the page locale's templates are filled with the browser locale's labels, `uiLabel` is the first label in each step title, and the label text drawn in the artwork is replaced and fitted (wrapped or squeezed with `textLength`) the way the build fits it. The control inside each step title drawn in the artwork follows the browser locale too; the rest of the title, and the headings, stay in the page language.
- The browser locale is resolved with `resolveLocale` against the locales that have label data for the guide. If it has none, the page locale's labels are used.
- `selection.locale.browser` is `{ requested, resolved, fallback }` and appears only when `browserLocale` was passed and differs from `locale`, or when `locale` is `en-US` (see below). `resolved` is the locale whose labels were used; `fallback` is `true` when no labels were found (or the page has no template data), and the guide then also has `browserLocaleFallback: true` and `requestedBrowserLocale`. A guide with substituted labels has `browserLanguage`.
- An English page with a non-English browser (or a US one) needs the opt-in `pwa-instructions/locales/en` module, which carries the English templates and tagged English artwork. The bundled English guides and the published `install.svg` stay untagged and unchanged, so the module costs nothing unless you import it. Without it the English page keeps its own English control names, and the result reports `fallback: true`.
- **British and US English.** The English labels are the British capture, so `en` means `en-GB` for labels and `en-GB` (or `en_GB`) resolves to it. `en-US` is a label-only variant: it overrides only the labels whose US text differs ("Cast, save, and share", "Summarize", "Add to Bookmarks") and keeps the `en` prose. `browserLocale: "en-US"` (also `en_US`, or an array such as `["en-US", "fr"]`) shows the US labels in the prose, `uiLabel` and the artwork, including the step titles. A page `locale: "en-US"` with no `browserLocale` does too, because `browserLocale` defaults to `locale`; `locale: "en-US"` still resolves to the `en` prose, with `locale.resolved === "en"`. The US labels ship in the opt-in `locales/en` module, since they are English data and need the same templates and tagged artwork; register it (`registerLocale('en', en)`) to get them. Without it `browserLocale: "en-US"` reports `fallback: true` as any missing browser locale does, while a bare `locale: "en-US"` returns the guide exactly as before. `selection.locale.browser` is `{ requested: "en-US", resolved: "en-US", fallback: false }` when the US labels were used, and `resolved: "en"` for a guide whose labels do not differ. Plain `en`, `en-GB` and calls without a locale are unchanged.
- `getIllustration(guide, { browserLocale, siteUrl })` applies the same artwork substitution, together with the site URL, to a copy; the guide is not mutated. With only a `browserLocale`, the page is the language the guide is already in.
- Locale modules are about a quarter larger because they carry the templates, label tables and tagged artwork; import only the locales you serve.

React does not read `detectUILocale()` for you, so server and client output agree. Pass it after mounting, for example `const [browser, setBrowser] = useState(); useEffect(() => setBrowser(detectUILocale()), []);` and `<InstallInstructions locale="es" browserLocale={browser} />`. `detectUILocale()` is a proxy for the browser's interface language, not a guarantee.

`getIllustration` with a `locale` uses that locale's artwork and replaces the English " Website: host." sentence on the alt text with the locale's own wording, so the alt text is not half translated. The components draw no text of their own, so the only interface string is that alt-text sentence, `getLocaleUI(locale).website`.

### Guide data and assets

Each `InstallGuide` contains its `id`, `title`, `label`, `language`, `platform`, `browser`, `device`, `versions`, `illustration`, `steps`, `completion` and Markdown `text`, plus `localeFallback` and `requestedLocale` when a requested locale was not available, and `browserLanguage`, `browserLocaleFallback` and `requestedBrowserLocale` when a `browserLocale` was applied or could not be. Each step has `id`, `title`, `description`, `illustrationFragment`, and optional `uiLabel` and `optional` fields. `uiLabel` identifies the clickable phrase emphasized in the title.

### The image header

Each bundled SVG used to start with a heading and subtitle band. It is off by default: the SVG, in the guide data, in the locale modules and in `dist/assets`, starts at the first step, with a `viewBox` that begins at `y=72` (`0 72 400 1988`), and `illustration.width` and `height` describe that cropped image. The heading and subtitle are carried beside it as `illustration.header`, ready-made SVG text in the guide's language. `getIllustration(guide, { header: true })` and the `illustrationHeader` prop put them back: the `viewBox` returns to `y=0`, `height` grows by 72, and the text is added to a copy. `illustration.width` and `height` of the guide itself do not change, so use the `getIllustration` result's `height` when you draw the taller image. `header: true` has no effect on an image you host yourself (`illustrationSrc`) or on a guide without `illustration.header`. The raw files in `dist/assets` have no header and there is no with-header variant; use the API when you want it.
Recorded version ranges have inclusive `min` and `max` values; `max: null` means no replacement has been recorded. Documentation drafts have `versions.documentationOnly: true`, with `os`, `browser`, `observedOS` and `observedBrowser` set to `null`; if you want to label them, do it from that flag or from `selection.match === "documentation"`.

The Markdown `text` is the title, the intro where there is one, and the numbered steps. It ends after the last step; `completion` is separate data.

SVG, Markdown and metadata files also ship under `pwa-instructions/assets/<guide-id>/`. The package files live in `dist/assets/<guide-id>/`; copy an SVG to your own public directory when using `illustrationSrc`. Original reference screenshots are not included in the packages.

TypeScript types are exported alongside the APIs. See the [core declarations](../packages/pwa-instructions/src/core/types.ts) and [React props](../packages/pwa-instructions/src/react/index.ts) for the full shapes, and [guide authoring](authoring-guides.md) to add layouts or reuse steps.
