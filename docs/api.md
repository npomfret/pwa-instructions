# API reference

One npm package provides two entry points: `pwa-instructions/react` displays installation instructions, and `pwa-instructions` provides guide data, detection and selection for any JavaScript framework. React is an optional peer dependency and is only needed for the React entry point. Package publication to npm is pending.

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
| `className` | Omitted | CSS class on the rendered guide section. Components have no global stylesheet. |
| `illustrationSrc` | Bundled SVG data URL | Override the image URL, for example when your Content Security Policy requires an image hosted on your own origin. This takes precedence over `siteUrl`; custom images are not personalized. |

Use the exported `guides` array to build a manual selector. Its items have stable `id` values and readable `label` values. Retain a manual choice where practical because browsers can hide their identity or versions.

### `InstallGuideView`

Renders a known guide with no detection or selection. Its required `guide` prop is an `InstallGuide` object. It also accepts `presentation`, `siteUrl`, `className` and `illustrationSrc` with the same defaults and behavior above.

## Framework-independent JavaScript

Import these functions and data from `pwa-instructions`. They are also re-exported by the React entry point.

| Export | Purpose |
| --- | --- |
| `detectBrowserEnvironment()` | Read browser hints and standalone mode. Returns an `Environment`, or `null` outside the browser. Safe to import and call on a server. |
| `detectEnvironment({ userAgent?, maxTouchPoints?, standalone? })` | Pure detection from supplied hints, useful for server code or your own detection inputs. Omitted hints default to an empty user agent, no touch points and `standalone: false`. |
| `selectGuide(environment, { guideId?, guides? } = {})` | Select the appropriate guide. An explicit `guideId` bypasses automatic matching, including the standalone check. An unknown ID returns no guide. |
| `getIllustration(guide, { siteUrl? } = {})` | Return the illustration with a customized domain. Returns `{ src, alt, width, height }` without mutating the guide. Externally hosted illustrations are returned unchanged. |
| `guides` | Readonly array of bundled guide data. Use it for your own controls, rendering or explicit selection. |

The automatic selection call is `selectGuide(detectBrowserEnvironment())`. Detection, selection and domain customization make no network requests.

### Environment

An `Environment` contains `platform`, `browser`, `device`, `osMajor`, `browserMajor`, optional `browserVersion`, and `standalone`. Unknown versions are `null`; identities may be `"unknown"`. Standalone mode means the site is currently running as an app, not that installation has been detected from an ordinary browser tab.

### Selection result

The result contains `status`, `guide`, `match`, `reason` and `environment`. Check `guide` before rendering; it is `null` whenever no guide was selected. `reason` explains the decision.

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

### Guide data and assets

Each `InstallGuide` contains its `id`, `title`, `label`, `language`, `platform`, `browser`, `device`, `versions`, `illustration`, `steps`, `completion` and Markdown `text`. Each step has `id`, `title`, `description`, `illustrationFragment`, and optional `uiLabel` and `optional` fields. `uiLabel` identifies the clickable phrase emphasized in the title.

Recorded version ranges have inclusive `min` and `max` values; `max: null` means no replacement has been recorded. Documentation drafts have `versions.documentationOnly: true`, with `os`, `browser`, `observedOS` and `observedBrowser` set to `null`. Their headings identify them as documentation drafts.

SVG, Markdown and metadata files also ship under `pwa-instructions/assets/<guide-id>/`. The package files live in `dist/assets/<guide-id>/`; copy an SVG to your own public directory when using `illustrationSrc`. Original reference screenshots are not included in the packages.

TypeScript types are exported alongside the APIs. See the [core declarations](../packages/pwa-instructions/src/core/types.ts) and [React props](../packages/pwa-instructions/src/react/index.ts) for the full shapes, and [guide authoring](authoring-guides.md) to add layouts or reuse steps.
