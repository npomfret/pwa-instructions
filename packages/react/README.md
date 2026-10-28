# @pwa-instructions/react

An accessible, unstyled React component that displays a matching installation guide. React is a peer dependency; guide data and selection live in `@pwa-instructions/core`.

```jsx
import { InstallInstructions } from '@pwa-instructions/react';

<InstallInstructions
  presentation="both"
  fallback={<p>No guide for this browser yet. Choose a guide manually.</p>}
/>
```

Detection runs after mounting and is safe with server rendering. This avoids hydration differences. The fallback is rendered while detection is pending or no guide applies.

Use `guideId="ios-safari-iphone-layout-1"` to override detection. A manual choice also works on desktop. Use `environment` for a supplied detection result, or `environment={null}` to disable automatic detection. A manual ID takes precedence.

`presentation` is `both` (default), `image`, or `text`. `className` styles the wrapper. `illustrationSrc` overrides the bundled SVG data URL if your Content Security Policy requires a hosted image. `fallback` may also be a function receiving the full `GuideSelection` result.

For your own UI, use `selectGuide` and `guides`, re-exported from this package. There is no requirement to use a React hook. `InstallGuideView` renders a supplied guide directly.

```jsx
import { guides, InstallGuideView } from '@pwa-instructions/react';
<InstallGuideView guide={guides[0]} presentation="text" />
```

The component supplies semantic headings, an ordered list and image alternative text, with no global CSS. It shows instructions and does not initiate installation. The host app controls when and where to display it.

Included guides cover iPhone Safari, Brave via Safari, Chrome, and Mac Safari. Browser detection is best effort; expose a manual choice where practical. The SVG and matching text are also usable without React through the core package.

MIT licensed. Source: https://github.com/npomfret/pwa-instructions
