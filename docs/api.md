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

Automatic selection is the default: **leave `guideId` out**. Detection runs after mounting, so server rendering and initial hydration agree. The component displays the fallback while detection is pending or no guide is selected. It displays instructions; it does not install the app or open a browser's installation prompt.

### `InstallInstructions` props

All props are optional.

| Prop | Default | Effect |
| --- | --- | --- |
| `guideId` | Omitted | Automatically detect and select a guide. Supply a real guide ID, such as `ios-safari-iphone-layout-1`, to force that guide on any device. There is no special `"auto"` ID. An explicit ID takes precedence over detection and `environment`. |
| `siteUrl` | `example.com` | Display your domain in the bundled SVG. Accepts an HTTP(S) URL or bare domain. Displays the host, including a port when present, and omits credentials, paths, queries and fragments. Blank or invalid input uses the default. |
| `presentation` | `"both"` | `"both"`: SVG and numbered text. `"image"`: SVG. `"text"`: numbered text. All three keep the guide heading and completion note. |
| `fallback` | `null` | A React node, or a function receiving the selection result, rendered when no guide is available. Use the function to distinguish pending selection, unsupported browsers and an app already running in standalone mode. |
| `environment` | Omitted | Detect in the browser. Supply an `Environment` object to use your own detection, or `null` to disable detection and wait for an explicit `guideId`. |
| `guides` | Bundled guides | A custom array of `InstallGuide` objects used for automatic and explicit selection. |
| `locale` | Omitted (English) | A BCP 47 tag, or tags in order of preference. Shows the guide, headings and image in that language when its data is registered; otherwise the whole guide is English. See [Localization](#localization). |
| `browserLocale` | Omitted | The language of the browser or OS interface. Accepted and reserved; it does not change the output yet. |
| `localeData` | Omitted | Locale data by tag, used with or instead of `registerLocale`. |
| `className` | Omitted | CSS class on the rendered guide section. Components have no global stylesheet. |
| `illustrationSrc` | Bundled SVG data URL | Override the image URL, for example when your Content Security Policy requires an image hosted on your own origin. This takes precedence over `siteUrl`; custom images are not personalized. |

Use the exported `guides` array to build a manual selector. Its items have stable `id` values and readable `label` values. Retain a manual choice where practical because browsers can hide their identity or versions.

### `InstallGuideView`

Renders a known guide with no detection or selection. Its required `guide` prop is an `InstallGuide` object. It also accepts `presentation`, `siteUrl`, `className`, `illustrationSrc`, `locale`, `browserLocale` and `localeData` with the same defaults and behavior above. An English guide is localized by `locale`; a guide already in another language, such as one returned by `selectGuide` with a locale, is shown as it is.

When a locale is requested, or the guide is not English, the section carries `data-pwa-locale` (the language of the text shown) and `lang`, which is left off when it equals the page's `<html lang>`. A guide shown in English because the locale is missing also has `data-pwa-locale-fallback="true"`. Without a locale, the markup is the same as in 0.1.0.

## Framework-independent JavaScript

Import these functions and data from `pwa-instructions`. They are also re-exported by the React entry point.

| Export | Purpose |
| --- | --- |
| `detectBrowserEnvironment()` | Read browser hints and standalone mode. Returns an `Environment`, or `null` outside the browser. Safe to import and call on a server. |
| `detectEnvironment({ userAgent?, maxTouchPoints?, standalone? })` | Pure detection from supplied hints, useful for server code or your own detection inputs. Omitted hints default to an empty user agent, no touch points and `standalone: false`. |
| `selectGuide(environment, { guideId?, guides?, locale?, browserLocale?, localeData? } = {})` | Select the appropriate guide. An explicit `guideId` bypasses automatic matching, including the standalone check. An unknown ID returns no guide. With `locale`, the selected guide is localized. |
| `getIllustration(guide, { siteUrl?, locale?, browserLocale?, localeData? } = {})` | Return the illustration with a customized domain. Returns `{ src, alt, width, height }` without mutating the guide. Externally hosted illustrations are returned unchanged. With `locale`, the artwork and alt text are that locale's. |
| `resolveLocale(requested, available)` | Pick the tag to use. See [Localization](#localization). |
| `registerLocale(tag, data)` | Make a locale's data available to every call. |
| `getGuideLocales(guide, localeData?)` | The tags that can serve a guide: `"en"` plus every registered locale with data for it. |
| `detectUILocale()` | `navigator.languages[0]`, or `undefined` on the server. |
| `localizeGuide(guide, { locale?, localeData? })` | The localization `selectGuide` applies, for a guide you already hold. Returns `{ guide, locale }`. |
| `getLocaleUI(locale?, localeData?)` | The interface strings (headings, device, platform and browser names) for a locale. |
| `guides` | Readonly array of bundled guide data. Use it for your own controls, rendering or explicit selection. |

The automatic selection call is `selectGuide(detectBrowserEnvironment())`. Detection, selection and domain customization make no network requests.

### Environment

An `Environment` contains `platform`, `browser`, `device`, `osMajor`, `browserMajor`, optional `browserVersion`, and `standalone`. Unknown versions are `null`; identities may be `"unknown"`. Standalone mode means the site is currently running as an app, not that installation has been detected from an ordinary browser tab.

### Selection result

The result contains `status`, `guide`, `match`, `reason` and `environment`. Check `guide` before rendering; it is `null` whenever no guide was selected. `reason` is an English sentence for developers and logs; do not show it to users. When you pass `locale`, the result also has `reasonCode`, a stable identifier to map to your own text (`guide-chosen`, `guide-not-found`, `needs-environment`, `installed`, `no-guide-for-browser`, `documentation-only`, `version-hidden`, `no-guide-for-version`, `os-hidden`, `os-ambiguous`, `newer-version`, `browser-version` or `version-match`), and `locale` (see below). Calls without `locale` return exactly the 0.1.0 object.

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

You can skip registration and pass the same data per call: `{ locale: 'es', localeData: { es } }`. Data passed per call wins over registered data for the same tag. A module's default export is `LocaleData` (`{ guides, ui? }`); `guides` and `ui` are also named exports. Locale modules are published only for locales marked complete; none is complete yet.

`resolveLocale(requested, available)` returns `{ requested, resolved, fallback }`:

- Tags are trimmed, `_` becomes `-`, and they are canonicalized with `Intl.getCanonicalLocales`, so `pt_br` and `PT-br` are `pt-BR`. An invalid tag is skipped.
- A tag falls back by trimming: `pt-BR`, then `pt`, then `en`. English is always available. An array is tried in order.
- A script is never crossed. `zh-Hans` never serves `zh-Hant`; `zh-TW` finds `zh-Hant` but not a bare `zh`.
- `requested` is the first tag asked for, in canonical form, or `null` when none was. `fallback` is `false` when the text is in the language asked for (`pt-BR` served by `pt` counts), and `true` when it is not, including when a later tag in an array was used.

**Fallback is per guide.** A guide is either fully in the locale or fully English, never mixed. A locale serves a guide only if it has that guide and every one of its steps. When a locale is requested and a guide comes back in English, it has `localeFallback: true` and `requestedLocale`, so you can tell even if you keep only the guide. `GuideSelection.locale` and `reasonCode` appear only when `locale` is passed; this keeps calls without it identical to 0.1.0. `getGuideLocales(guide)` lists what can serve a guide, for building a language picker.

**Page language and browser language.** The names of controls in the steps ("Share", "Add to Home Screen") must match what the user's device shows. `detectUILocale()` returns the first of `navigator.languages`, which is a proxy for the browser's interface language and not a guarantee. It returns `undefined` on the server, so call it after mounting to keep hydration consistent. `browserLocale` is accepted by `selectGuide`, `getIllustration` and the React components so adding it later is not a breaking change, but today the guide is composed in `locale` alone and `browserLocale` has no effect.

`getIllustration` with a `locale` uses that locale's artwork and replaces the English " Website: host." sentence on the alt text with the locale's own wording, so the alt text is not half translated. The React view's headings ("Text instructions", "Illustrated guide", "Documentation draft") and its device, platform and browser names also come from the locale data; without it they are the English defaults.

### Guide data and assets

Each `InstallGuide` contains its `id`, `title`, `label`, `language`, `platform`, `browser`, `device`, `versions`, `illustration`, `steps`, `completion` and Markdown `text`, plus `localeFallback` and `requestedLocale` when a requested locale was not available. Each step has `id`, `title`, `description`, `illustrationFragment`, and optional `uiLabel` and `optional` fields. `uiLabel` identifies the clickable phrase emphasized in the title.

Recorded version ranges have inclusive `min` and `max` values; `max: null` means no replacement has been recorded. Documentation drafts have `versions.documentationOnly: true`, with `os`, `browser`, `observedOS` and `observedBrowser` set to `null`. Their headings identify them as documentation drafts.

SVG, Markdown and metadata files also ship under `pwa-instructions/assets/<guide-id>/`. The package files live in `dist/assets/<guide-id>/`; copy an SVG to your own public directory when using `illustrationSrc`. Original reference screenshots are not included in the packages.

TypeScript types are exported alongside the APIs. See the [core declarations](../packages/pwa-instructions/src/core/types.ts) and [React props](../packages/pwa-instructions/src/react/index.ts) for the full shapes, and [guide authoring](authoring-guides.md) to add layouts or reuse steps.
