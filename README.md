# PWA Instructions

Reusable instructions for adding web apps to a Home Screen: one simple SVG and a matching text guide for each installation layout. The artwork is generic, with highlighted buttons and no host-app branding.

[Try the React example](https://npomfret.github.io/pwa-instructions/) · [Example source](examples/react)

<img src="guides/ios/safari/iphone/layout-1/install.svg" width="280" alt="Four illustrated steps for iPhone Safari: open the Page Menu, tap Share, tap View More, then tap Add to Home Screen." />

## Packages

| Package | Responsibility |
| --- | --- |
| [`@pwa-instructions/core`](packages/core) | Guide data, SVGs, text, browser detection and selection. No framework dependency. |
| [`@pwa-instructions/react`](packages/react) | Unstyled React components using the core. |
| [`examples/react`](examples/react) | A client-only demo with a reveal button and image/text display choices. |

Future framework adapters can live beside React under `packages/` and consume the same core. Plain JavaScript apps can already use the core directly. These are the planned package names; publication to npm is pending.

```jsx
import { InstallInstructions } from '@pwa-instructions/react';

<InstallInstructions
  presentation="both"
  fallback={<p>Choose a guide for your browser.</p>}
/>
```

Use `guideId="ios-safari-iphone-layout-1"` for explicit selection. For your own interface, call `selectGuide(detectBrowserEnvironment())` from the core and use the returned steps and illustration URL. See each package's README for its API.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

`npm run check` builds both packages and the example, checks its types, then runs tests serially with one worker. `npm run pack:packages` produces local npm archives. No original screenshots are included in the packages.

The GitHub Actions workflow checks changes and deploys the example to GitHub Pages from `main`. The static output is `examples/react/dist/`.

## Layouts and versions

Version the **layout**, independently of browser and OS releases. Each immutable layout has its own folder:

```text
guides/
  ios/safari/iphone/
    layout-1/
      metadata.json
      install.svg
      instructions.md
    # layout-2/ is added when the installation controls change
```

[The first layout](guides/ios/safari/iphone/layout-1/metadata.json) records iOS 27 and Safari 27 on iPhone, as reported by the source owner. Its compatibility ranges begin there and remain open until another layout supersedes it. Newer versions reuse the latest applicable layout; this is reported as a fallback, not new device verification. Earlier versions are not assumed to match. Add another layout rather than replacing the old artwork when important controls change.

`catalog.json` indexes the layouts. The build packages their metadata, SVGs and Markdown, and generates the data consumed by both core and React. Text is complete on its own, with the same step numbers as the SVG. The current flow stops at **Add to Home Screen**; the final confirmation is described in text but not illustrated.

The SVG uses a single vertical column for phones. Its step titles are short, the target controls have blue outlines, and unrelated menu text is muted. Detailed descriptions stay in the Markdown file and structured step data.

## Detection and manual selection

The first guide covers the iPhone Safari Page Menu flow. Unsupported browsers and devices receive no substitute guide. The host app can supply an explicit guide ID or its own environment data.

Detection is a best-effort hint: browsers can disguise their identity. Safari 26+ freezes the OS version in its user-agent string, so the selector can use the Safari version when the real iOS version is hidden. [WebKit explains the change.](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) A manual choice should remain available.

The React component detects after mounting, supports server rendering, and offers image, text or combined presentation. Guide images are self-contained data URLs by default; a hosted URL can be supplied where Content Security Policy requires one. Selection and rendering make no network requests.

## Source references and future coverage

Original references live under `source-images/<os>-<major>/<browser>-<major>/<device>/`, with a metadata file describing versions and ordered actions. [The first set](source-images/ios-27/safari-27/iphone/metadata.json) contains the four supplied screenshots. Originals contain app branding and share-sheet contacts; reusable artwork omits them.

Future coverage includes Brave, Chrome, Android and earlier layouts. Browser-specific actions should be separated from shared OS actions as coverage grows. In this Safari example, Page Menu and Share lead into the iOS share sheet's View More and Add to Home Screen controls. Brave on iOS needs a separate route: the owner found no Add to Home Screen action, and research supports handing off to Safari. See the [Brave iOS research note](docs/research/brave-ios.md) for evidence and remaining verification. Shared-step composition is not yet implemented.

## License

Project code, authored instructions and SVG artwork are available under the [MIT License](LICENSE). Source screenshots are reference material and may contain third-party content.
