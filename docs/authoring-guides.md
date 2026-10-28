# Authoring installation guides

Keep one folder per distinct layout under `guides/<platform>/<browser>/<device>/layout-N/`. The folder contains `metadata.json`, the artwork source (`install.source.svg`, or `artwork.svg` for composed guides), the generated `install.svg` and readable `instructions.md`. **Edit `install.source.svg`, not `install.svg`:** the build writes `install.svg` from it, byte-identical to the source in English. Keep exact captured versions in reference metadata under `source-images/`; layout names stay independent of browser releases.

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

Composed guides specify `artworkSource: "artwork.svg"`. This source contains their original panels and placeholders for shared panels. Edit this file rather than the generated `install.svg`. The composer imports referenced artwork and definitions, gives IDs and styles separate names, and updates both visual numbering and textual cross-references. A `transitionBefore` string adds a browser-transition heading before a step, as in Brave's Safari handoff. Give that step a stable `transitionId` too (Brave uses `continue-in-safari`); translations look the heading up by it.

The output remains one independent SVG and one text document. Consumers do not need to resolve references or load extra images. The core's guide data contains the flattened steps. The npm assets also retain metadata and authoring artwork.

Reused artwork must depict the same relevant control and placement. A common OS share sheet can still contain different menu groups. Chrome therefore reuses View More but keeps its own final action panel. Brave reuses all four Safari panels after Open in Safari.

## Localization

English stays the source of truth in `metadata.json` and the source SVG. Everything translatable is data beside it, and the build composes a guide per locale by filling the English structure with that data.

```text
guides/<platform>/<browser>/<device>/layout-N/locales/<tag>.json   this guide's own prose for the locale
labels/<surface>.json                                              browser and OS strings, by label id then locale
labels/ui.json                                                     interface strings: headings, names, "Website:"
catalog.json                                                       "locales" statuses; "labelSurfaces" per guide
```

**Labels.** A label is a string a browser or OS shows ("Share", "Add to Dock…"). It lives in one `labels/<surface>.json`, named for the place that shows it (`ios-safari`, `ios-share-sheet`, `macos-menubar`, `chrome-desktop`, ...), keyed by label id and then locale, so every guide naming that control shares one translation:

```json
{
  "share": {
    "en": "Share",
    "es": "Compartir",
    "_src": { "es": { "method": "device", "verified": "2026-10-01", "version": "iOS 26" } }
  }
}
```

A guide lists the surfaces whose controls appear in its artwork as `labelSurfaces` in `catalog.json`. Label ids resolve in those surfaces only, an id may not appear in two of them, and the `document` surface (the Markdown template strings) is always available. A reused step resolves in its source guide's surfaces.

**Prose.** `locales/<tag>.json` holds `title`, `label`, `completion`, `alt` and, when the English has one, `intro`; `steps` keyed by step `id` with `title` and `description`; `transitions` keyed by `transitionId`; and the SVG's `heading`, `subtitle`, `svgTitle` and `svgDesc`. Use `{label:id}` for a control name and `{step:n}` for a step number, so sentences can be reordered. The build derives each step's `uiLabel` from its title's first `{label:*}`, so the italics survive. A reused step takes its translation from its source guide in the same locale; the reusing guide lists only the steps it authors.

```json
{
  "title": "Añadir a pantalla de inicio",
  "label": "iPhone · Safari · Añadir a pantalla de inicio",
  "steps": { "tap-share": { "title": "Toca {label:share}", "description": "…" } },
  "completion": "…",
  "alt": "…",
  "transitions": { "continue-in-safari": "Continúa en Safari" }
}
```

**Tagging the SVG.** Each translatable text node in `install.source.svg` or `artwork.svg` carries `data-i18n`, with the English text left in the node:

| Attribute | Meaning |
| --- | --- |
| `data-i18n="label:id"` | Replaced by that label. The English text must equal the label's `en`; the build checks it. |
| `data-i18n="guide:key"` | Replaced by `key` from the guide's locale file (`heading`, `subtitle`, `svgTitle`, `svgDesc`). |
| `data-i18n="step"` | A step title; filled from the step's translated title, with its label in italics. |
| `data-i18n="follow"` | English-only text, removed in other locales. |
| `data-max-width="N"` | Width in user units. Longer text wraps (see `data-lines`) or is squeezed with `textLength`. |
| `data-lines`, `data-line-height` | Allow that many lines, spaced by that many units. |

`data-pwa-domain` and `data-domain-width` are separate: they mark the address-bar domain that `siteUrl` replaces. The `data-i18n`, `data-max-width`, `data-lines` and `data-line-height` attributes are removed from the published SVG; imported panels keep their tags through the id and class scoping.

**Statuses.** `catalog.json` `locales` maps each tag to `draft` or `complete`. Only `complete` locales are built into `pwa-instructions/locales/<tag>` and `dist/assets/<id>/<tag>/`. A `draft` is for translators working in the repo, and the build ignores it. `en-XA` is a draft pseudo-locale (accented, about 35% longer, bracketed) that tests compose in memory to exercise the pipeline; never mark it complete.

**Adding a locale.**

1. Use a canonical tag (`pt-BR`, `zh-Hans`) as the file name and add it to `catalog.json` `locales` as `draft`.
2. Add the tag to every label the guides use, in each `labels/<surface>.json`, and to `labels/ui.json`.
3. Write `locales/<tag>.json` for every guide, covering each step the guide authors.
4. Record where each label came from in its `_src` entry: `method` (`device`, `chromium-xtb`, `vendor-docs`, ...), the `verified` date, and the OS and browser `version`. Copy the text the product shows; never machine-translate a label. Safari comes from a device or simulator set to the language, Chrome and Edge from Chromium's translation files and the product, Brave from its `Localizable.strings`, Android and Windows from AOSP resources and Microsoft terminology.
5. Run `npm run build:packages`. A missing label, placeholder or key fails with a message naming it.
6. Inspect each localized SVG at phone width for overflow, then change the status to `complete`.

## Matching

Compatibility bounds are inclusive; `max: null` means reuse the latest known layout until superseded. Preserve old layouts. Confirm the platform, device and browser separately; never substitute an iPhone guide for a Mac browser automatically.

`minimumBrowserVersion` optionally supplies a more precise lower bound, currently 1.97 for Brave. Version components are compared numerically. `requiresKnownOSVersion` avoids selecting an OS-specific layout when a browser hides the OS identity. Manual guide selection is always available.

When only official documentation is available, use compatibility status `documentation-only`, set both version ranges and both observed major versions to `null`, and record the source URL and review date in `evidence`. Do not infer browser or OS versions from the documentation's retrieval date. The build rejects version claims on these drafts. Selection returns `match: "documentation"` for the exact browser/platform/device, while a compatible recorded guide takes priority. React labels the guide as a documentation draft instead of showing invented version numbers.

## Checking changes

Run `npm run check`. Tests run serially with one worker and check composition, SVG references, selection, and React rendering. Visually inspect the generated artwork at phone width, especially the highlighted control, the browser transition and the numbered steps. Keep personal content and site branding in original references only.
