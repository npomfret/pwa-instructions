# Authoring installation guides

Keep one folder per distinct layout under `guides/<platform>/<browser>/<device>/layout-N/`. The folder contains `metadata.json`, the artwork source (`install.source.svg`, or `artwork.svg` for composed guides), the generated `install.svg` and readable `instructions.md`. **Edit `install.source.svg`, not `install.svg`:** the build writes `install.svg` from it, without the heading and subtitle (see below). Keep exact captured versions in reference metadata under `source-images/`; layout names stay independent of browser releases.

The metadata is the source of structured instruction text. `npm run build:packages` regenerates every Markdown guide. Edit the metadata's step descriptions rather than the generated Markdown. The Markdown is the title, the intro where there is one, and the numbered steps, ending after the last step. The `completion` text is guide data and is not in it, and nor are links to the SVG or `metadata.json`.

The optional `uiLabel` field identifies the clickable label inside a step's plain-text title. For example, `Open the File menu` uses `uiLabel: "File"`. The build italicizes that phrase in the SVG step title and Markdown; React applies the same emphasis in its step list. Reused steps inherit the label automatically. Menu items drawn inside the browser mockup retain their normal appearance.

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

**The header.** Every source SVG keeps its heading and subtitle at the top (`data-i18n="guide:heading"` and `"guide:subtitle"`, drawn at `y=48` and `y=76`), and the first step starts at `y=100`. The build does not publish them: the output SVGs omit those two nodes and crop the `viewBox` to start at `y=72` (`HEADER_CROP` in `scripts/compose-guides.mjs`), which leaves a 28-unit margin above step 1 as at the sides, and `width`, `height` and `illustration.height` are 72 less. The localized markup of the two nodes is stored as `illustration.header` in the guide data and the locale modules, and `getIllustration(guide, { header: true })` puts it back (`restoreHeader` in `src/core/artwork.ts`). Keep new sources to this layout: a heading and subtitle with those two tags, nothing else above `y=72`, and step 1 at `y=100`.

The output remains one independent SVG and one text document. Consumers do not need to resolve references or load extra images. The core's guide data contains the flattened steps. The npm assets also retain metadata and authoring artwork.

Reused artwork must depict the same relevant control and placement. A common OS share sheet can still contain different menu groups. Chrome therefore reuses View More but keeps its own final action panel. Brave reuses all four Safari panels after Open in Safari.

## Localization

English stays the source of truth in `metadata.json` and the source SVG. Everything translatable is data beside it, and the build composes a guide per locale by filling the English structure with that data.

```text
guides/<platform>/<browser>/<device>/layout-N/locales/<tag>.json   this guide's own prose for the locale
labels/<surface>.json                                              browser and OS strings, by label id then locale
labels/ui.json                                                     interface strings: "Website:"
catalog.json                                                       "locales" statuses; "labelSurfaces" per guide
```

**Labels.** A label is a string a browser or OS shows ("Share", "Add to Dock…"). It lives in one `labels/<surface>.json`, named for the place that shows it (`ios-safari`, `ios-share-sheet`, `macos-menubar`, `chrome-desktop`, ...), keyed by label id and then locale, so every guide naming that control shares one translation:

```json
{
  "share": {
    "en": "Share",
    "es": "Compartir",
    "_src": { "es": { "method": "device", "source": "capture:ios-26-es-001", "verified": "2026-10-01", "version": "iOS 26" } }
  }
}
```

A guide lists the surfaces whose controls appear in its artwork as `labelSurfaces` in `catalog.json`. Label ids resolve in those surfaces only, an id may not appear in two of them. A reused step resolves in its source guide's surfaces.

**Label tables.** Each published `pwa-instructions/locales/<tag>` module carries, per guide, a label table: the text in that locale and in English of every label the guide's prose templates (`{label:id}`) and its artwork tags (`data-i18n="label:id"`) use, including the labels of panels reused from another guide. At runtime `browserLocale` fills the page locale's templates from the browser locale's table and swaps the artwork's label nodes, which keep their `data-i18n`, `data-max-width` and `data-lines` in the module's SVG (the SVG written to `dist/assets` stays untagged). A label that is missing from a locale therefore breaks the guide for browsers in that language; rule 3 below covers it. English has its own opt-in `locales/en` module, built from the same tables.

**English variants.** The `en` labels are the British capture: `en` means `en-GB` for labels, and `en-GB` resolves to `en`. `en-US` is a label-only variant of `en` (`LABEL_VARIANTS` in `scripts/i18n.mjs`). It is not a catalog locale: it has no prose file, no status and no `catalog.json` entry, and the US build uses the `en` prose and templates. Add an `en-US` value to a label only where a US browser shows different text; every other label inherits `en`:

```json
{
  "cast-save-and-share": {
    "en": "Cast, save and share",
    "en-US": "Cast, save, and share",
    "_src": {
      "en": { "method": "xtb", "source": "<en-GB .xtb URL>", "messageId": "1913749768968678106", "verified": "2026-10-29", "version": "Chromium main 159.0.8131.0", "deviceChecked": false },
      "en-US": { "method": "grd", "source": "<.grd URL>", "messageId": "IDS_CAST_SAVE_AND_SHARE_MENU", "verified": "2026-10-29", "version": "Chromium main 159.0.8131.0", "deviceChecked": false }
    }
  }
}
```

Source an `en-US` value from the product's own US text: Chromium's `.grd` or `.grdp` source strings (those are en-US; the en-GB `.xtb` confirms the British `en`), Apple's US support pages and user guides, Microsoft's US docs, or AOSP and Google's US help. If you cannot confirm a label's US text, leave the variant out; never guess. `_src.en` may record where the British value was confirmed (rule 5 does not require it). The English build writes the `en-US` label table into the `locales/en` module, for the guides where at least one label differs.

**Prose.** `locales/<tag>.json` holds `title`, `label`, `completion`, `alt` and, when the English has one, `intro`; `steps` keyed by step `id` with `title` and `description`; `transitions` keyed by `transitionId`; and the SVG's `heading`, `subtitle`, `svgTitle` and `svgDesc`. `heading` and `subtitle` are the opt-in image header; they are still required. Use `{label:id}` for a control name and `{step:n}` for a step number, so sentences can be reordered. The build derives each step's `uiLabel` from its title's first `{label:*}`, so the italics survive. A reused step takes its translation from its source guide in the same locale; the reusing guide lists only the steps it authors.

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
4. Record where each label came from in its `_src` entry: `method` (`device`, `chromium-xtb`, `vendor-docs`, ...), `source` (a URL or a reference to the capture, not the screenshot), the `verified` date (`YYYY-MM-DD`), and the OS and browser `version`. Copy the text the product shows; never machine-translate a label. Safari comes from a device or simulator set to the language, Chrome and Edge from Chromium's translation files and the product, Brave from its `Localizable.strings`, Android and Windows from AOSP resources and Microsoft terminology.
5. Run `npm run check:locales`, then `npm run build:packages`. A missing label, placeholder or key fails with a message naming the file, key and locale.
6. Inspect each localized SVG at phone width for overflow, then change the status to `complete`.

### Locale checks

`scripts/check-locales.mjs` runs at the start of every build, so `npm run check` fails on any error. It checks every locale in the catalog, draft or complete. Rules marked "complete only" are errors for a `complete` locale and warnings for a `draft`; the rest are errors for both.

| Rule | Checks |
| --- | --- |
| 1. Complete text (complete only) | Every guide has `title`, `label`, `completion`, `alt`, `intro` where English has one, a title and description for each step it authors, each `transitions` entry, and the SVG's `guide:*` keys. A reused step must have text in the guide that authors it, followed through any chain of reuse. The locale has the `ui` string (`website`). |
| 2. Placeholders | A translation keeps every `{step:n}` of the English, names the label the English quotes as `uiLabel` (`{label:id}`), and uses only label ids in the guide's `labelSurfaces`. Nothing else in braces is allowed, and a label value keeps the placeholders of its English (`{host}`). |
| 3. Labels resolve (complete only) | Every label a guide uses has text in the locale itself; there is no fallback to English. This includes the labels drawn in panels reused from another guide, so the locale module's label table is complete. |
| 4. SVG tags | Every `data-i18n` key in `install.source.svg` and `artwork.svg` has English text (a `label:*` key an English label equal to the node text) and, in a complete locale, a translation. Visible `text`, `title` and `desc` with no tag fail, except digits, the clock, `example.com`, `Safari` (the macOS app menu) and `data-pwa-domain` nodes. |
| 5. Label sources (complete only) | Each non-English label value has `_src.<tag>` with `method`, `source`, `verified` (a past date) and `version`. English labels and the `ui` surface are exempt: English is the source text, and `ui` is this package's own string, not a browser string. An `en-US` value always needs its source, as an error, because it is a claim about what a US browser shows. |
| 6. Content | No empty strings or `TODO`. A string identical to English is a warning, unless it is a brand name; so is an `en-US` value equal to `en`, which should be left out. |
| 7. Overflow | The estimated width of each tagged node against its `data-max-width` (times `data-lines`): a warning at 100%, an error at 130% in a complete locale (`OVERFLOW_WARN`, `OVERFLOW_FAIL`). A draft only warns past 130%, because a sourced label cannot be shortened: give it room in the artwork before marking the locale complete. |
| 8. Catalog agrees with files | A `locales/<tag>.json` or label locale that the catalog does not list is an orphan, except a label-only variant such as `en-US`. A listed locale with no files fails when complete. |
| 9. Tags | Tags in the catalog, file names and label files are canonical (`Intl.getCanonicalLocales`), and a file's optional `locale` field matches its name. |

**Reading a failure.** Each line is `file: key [locale] message (rule N)`, for example `guides/ios/safari/iphone/layout-1/locales/es.json: steps.tap-share.title [es] lacks {label:share}, which the English has (rule 2)`. Open the file, find the key, and fix it for that locale. Warnings print one summary line (`Locale warnings: 27 (27 rule 7)`) with the full list in `tmp/check-locales.log`. For a width warning, shorten the text, or give the node more room (`data-max-width`, `data-lines`) and inspect the SVG.

`npm run check:labels` is advisory: it lists labels whose `verified` date is over a year old and never fails the build. CI also fails when the committed English `install.svg` and `instructions.md` files are out of date, so run `npm run build:packages` and commit them after any change that affects English output.

## Matching

Compatibility bounds are inclusive; `max: null` means reuse the latest known layout until superseded. Preserve old layouts. Confirm the platform, device and browser separately; never substitute an iPhone guide for a Mac browser automatically.

`minimumBrowserVersion` optionally supplies a more precise lower bound, currently 1.97 for Brave. Version components are compared numerically. `requiresKnownOSVersion` avoids selecting an OS-specific layout when a browser hides the OS identity. Manual guide selection is always available.

When only official documentation is available, use compatibility status `documentation-only`, set both version ranges and both observed major versions to `null`, and record the source URL and review date in `evidence`. Do not infer browser or OS versions from the documentation's retrieval date. The build rejects version claims on these drafts. Selection returns `match: "documentation"` for the exact browser/platform/device, while a compatible recorded guide takes priority. React labels the guide as a documentation draft instead of showing invented version numbers.

## Checking changes

Run `npm run check`. Tests run serially with one worker and check composition, SVG references, selection, and React rendering. Visually inspect the generated artwork at phone width, especially the highlighted control, the browser transition and the numbered steps. Keep personal content and site branding in original references only.
