# Authoring installation guides

Keep one folder per distinct layout under `guides/<platform>/<browser>/<device>/layout-N/`. The folder contains `metadata.json`, a standalone `install.svg` and readable `instructions.md`. Keep exact captured versions in reference metadata under `source-images/`; layout names stay independent of browser releases.

The metadata is the source of structured instruction text. `npm run build:packages` regenerates every Markdown guide. Edit the metadata's step descriptions rather than the generated Markdown.

The optional `uiLabel` field identifies the clickable label inside a step's plain-text title. For example, `Open the File menu` uses `uiLabel: "File"`. The build italicizes that phrase in the SVG heading and Markdown; React applies the same emphasis to its text heading. Reused steps inherit the label automatically. Menu items drawn inside the browser mockup retain their normal appearance.

## Reuse

A step can reference another guide instead of copying its text:

```json
{
  "reuse": {
    "guideId": "ios-safari-iphone-layout-1",
    "stepId": "view-more",
    "artwork": true
  }
}
```

`artwork: true` reuses the SVG panel as well. Set it to false to reuse wording while drawing a different menu layout. The referenced guide's version bounds are not inherited: the destination guide records its own compatibility.

Composed guides specify `artworkSource: "artwork.svg"`. This source contains their original panels and placeholders for shared panels. Edit this file rather than the generated `install.svg`. The composer imports referenced artwork and definitions, gives IDs and styles separate names, and updates both visual numbering and textual cross-references. A `transitionBefore` string adds a browser-transition heading before a step, as in Brave's Safari handoff.

The output remains one independent SVG and one text document. Consumers do not need to resolve references or load extra images. The core's guide data contains the flattened steps. The npm assets also retain metadata and authoring artwork.

Reused artwork must depict the same relevant control and placement. A common OS share sheet can still contain different menu groups. Chrome therefore reuses View More but keeps its own final action panel. Brave reuses all four Safari panels after Open in Safari.

## Matching

Compatibility bounds are inclusive; `max: null` means reuse the latest known layout until superseded. Preserve old layouts. Confirm the platform, device and browser separately; never substitute an iPhone guide for a Mac browser automatically.

`minimumBrowserVersion` optionally supplies a more precise lower bound, currently 1.97 for Brave. Version components are compared numerically. `requiresKnownOSVersion` avoids selecting an OS-specific layout when a browser hides the OS identity. Manual guide selection is always available.

When only official documentation is available, use compatibility status `documentation-only`, set both version ranges and both observed major versions to `null`, and record the source URL and review date in `evidence`. Do not infer browser or OS versions from the documentation's retrieval date. The build rejects version claims on these drafts. Selection returns `match: "documentation"` for the exact browser/platform/device, while a compatible recorded guide takes priority. React labels the guide as a documentation draft instead of showing invented version numbers.

## Checking changes

Run `npm run check`. Tests run serially with one worker and check composition, SVG references, selection, and React rendering. Visually inspect the generated artwork at phone width, especially the highlighted control, the browser transition and the numbered steps. Keep personal content and site branding in original references only.
