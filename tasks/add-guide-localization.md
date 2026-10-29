# Localize install guides

Status: phases 0–4 are implemented. No real locale has shipped yet: the catalog lists only the `en-XA` draft pseudo-locale. The remaining work is the translations, sourcing and verifying the browser labels, and the per-locale visual review. Decisions still open are listed at the end.

## Issue

Every guide is English only. Each `metadata.json` has `"language": "en"`, and the core API has no locale input: `selectGuide(environment, { guideId?, guides? })` and `getIllustration(guide, { siteUrl? })`. A guide's `title`, `label`, step `title`/`description`, `completion`, the illustration `alt`, and the generated `instructions.md` are all fixed English strings. The SVG step headings carry the same English text, because the build draws each step title into `install.svg`.

Consumers that ship many locales cannot use the guides without an English-only section. wl-bill-splitter (38 locales) is integrating 0.1.0 with English guide text as an approved, temporary exception, and will adopt locale support once it is released.

## What localization has to cover

- **Structured text:** guide title and label, step titles and descriptions, completion text, illustration alt text, and the generated Markdown.
- **Artwork text:** the step headings drawn into each SVG. A localized guide needs its own generated SVG, or headings rendered outside the artwork.
- **Browser UI labels:** `uiLabel` and the menu items named in step text are the browser's own UI strings, such as Safari's "Share" and "Add to Home Screen". A translation has to use the label the browser actually shows in that language, not a free translation, or the user cannot find the control. This needs sourcing per browser and locale, and the menu labels drawn inside the browser mockups need the same treatment.
- **Composition:** steps reused through references, and `transitionBefore` headings, must resolve in the requested locale.

## English that is hard-coded today

Beyond the guide data:

- `getIllustration` appends ` Website: ${host}.` to `alt` (`packages/pwa-instructions/src/core/illustration.ts:36`).
- `GuideSelection.reason` is an English sentence (`src/core/select.ts`).
- The React view hard-codes "Text instructions", "Illustrated guide", "Documentation draft" and the device, platform and browser names (`src/react/index.ts:31-48`).
- Composition renumbers reused steps with the English-only regex `/step (\d+)/gi` (`scripts/compose-guides.mjs:75`). Brave's `intro` also embeds step numbers as text.
- The Markdown template in `scripts/compose-guides.mjs` is English ("Illustration:", "The numbered steps match this text.").
- Mockup labels (for example `Add to bookmarks`, `Find in Page`, the macOS menu bar, `Add to Dock…`) are authored directly in the source `install.svg` or `artwork.svg`, not in metadata, so they cannot be translated today.

## Decisions

### API shape

Add `locale?: string | readonly string[]` to `SelectionOptions` and `IllustrationOptions`, and keep one guide per id. Guide identity (id, platform, browser, device, version ranges) does not depend on language. Locale-specific guide entries would duplicate ids, break `guideId`, and list each guide once per language in a selector.

- `selectGuide` returns the localized `InstallGuide`, with `language` set to the resolved locale.
- Fallback trims the tag, then falls back to the default: `pt-BR`, then `pt`, then `en`. Tags are normalized with `Intl.getCanonicalLocales`. An array is tried in order. There is no fallback across scripts (`zh-Hans` never serves `zh-Hant`).
- Fallback applies to the whole guide: a guide is either fully in the locale or fully in `en`, never mixed.
- `GuideSelection.locale: { requested, resolved, fallback }` reports what happened. Add `InstallGuide.localeFallback?` and `requestedLocale?` for consumers that keep only the guide.
- New exports: `resolveLocale(requested, available)`, `getGuideLocales(guide)` and `detectUILocale()`.

Cheaper alternative: consumers filter `guides` by `language` through the existing `guides` option. Every consumer then reimplements fallback, ids are duplicated, and nobody can tell that a fallback happened.

### Browser UI language and page language

**Status: implemented.** `browserLocale` sets the control names (`uiLabel`, the `{label:id}` filled into the prose, the label text in the artwork) while `locale` keeps the prose. Each locale module carries the prose templates and a per-guide label table (this locale and English), and its artwork keeps the `label:*` tags; at runtime the templates are filled and the label nodes are replaced and fitted with the shared `src/core/fit.js`. An English page with a non-English browser uses the opt-in `locales/en` module; the published English guides stay untagged. `GuideSelection.locale.browser` reports `{ requested, resolved, fallback }` when `browserLocale` was passed and differs from `locale`. React passes it through, sets `data-pwa-browser-locale`, and does not default it to `detectUILocale()`. Step titles drawn in the artwork follow it too: the italic control span in each title is tagged `label:id`, and the runtime redraws the title with the browser's label and the page-language words around it, fitted by `fitMarkup`/`fitText` in `src/core/fit.js` like the build. Not done: re-localizing a guide that already has substituted labels back to its page labels.

**British and US English: implemented.** `en` is the British capture, so `en-GB` resolves to `en`. `en-US` is a label-only variant of `en`: `labels/*.json` hold an `en-US` value only where the US text differs (sourced from Chromium `.grd` strings, Apple's US guide; `_src.en` records the en-GB `.xtb` confirmation), prose and templates stay `en`, and the checks treat it as neither an orphan nor a locale to complete. The `locales/en` module carries the `en-US` label table per guide; `browserLocale: 'en-US'`, or `locale: 'en-US'` alone, selects it. Labels with no US source were left out, never guessed.

Add `browserLocale?`, defaulting to `locale`. Prose, completion text and SVG headings follow `locale` (the page). Quoted control names (`uiLabel`, menu items named in the prose, labels drawn in the mockups) follow `browserLocale`, because they must match what the device shows.

- `detectUILocale()` reads `navigator.languages[0]`. This is a proxy for the UI language, not a guarantee, and the docs must say so.
- Pre-built SVGs cover the case where `locale === browserLocale`. For other pairs, the prose is composed at runtime and the SVG comes from the browser locale, so the control names stay correct.

Cheaper alternative: ship only `locale` in 0.2.0 and document that the page language is assumed to match the UI language, but keep a place for `browserLocale` in the API so adding it later is not a breaking change.

### Where translations live

```
guides/<platform>/<browser>/<device>/layout-1/
  metadata.json          English source of truth, unchanged
  locales/<tag>.json     this guide's own prose for that locale
labels/<surface>.json    UI label dictionary, keyed by label id then locale
```

- Label files are keyed by surface, not by guide: `ios-safari`, `ios-chrome`, `ios-brave`, `ios-share-sheet`, `macos-safari`, `macos-menubar`, `chrome-desktop`, `edge-desktop`, `android-chrome`, `windows-shell`, and so on. A label lives in one place, and every guide that names that control uses it.
- Prose uses `{label:id}` placeholders resolved from the label dictionary, and `{step:n}` placeholders for step numbers. The build derives `uiLabel` from the substituted label, so italics keep working when a language reorders the sentence.
- Steps are keyed by step id, not array index.
- `transitionBefore` becomes a stable `transitionId`, looked up in the locale file's `transitions`.
- Each label records where it came from: a source URL or `device` capture, the date, and the OS and browser version.
- A reused step inherits the translation from its source guide in the same locale. A reusing guide's locale file lists only the steps it authors, plus an optional `overrides` block. If the source guide lacks the locale, the reusing guide also fails the completeness check for that locale.

Example prose file, `guides/ios/safari/iphone/layout-1/locales/es.json`:

```json
{
  "title": "Añadir a pantalla de inicio",
  "label": "iPhone · Safari · Añadir a pantalla de inicio",
  "intro": "…",
  "steps": {
    "tap-share": { "title": "Toca {label:share}", "description": "…" }
  },
  "completion": "…",
  "alt": "…",
  "transitions": { "continue-in-safari": "Continúa en Safari" }
}
```

Example label file, `labels/ios-safari.json`:

```json
{
  "share": {
    "en": "Share",
    "es": "Compartir",
    "_src": { "es": { "method": "device", "verified": "2026-10-01", "version": "iOS 26" } }
  }
}
```

Cheaper alternative: one flat `locales/<tag>.json` at the repo root, keyed by guide and step id. It is easy to hand to translators, but it duplicates every reused string and has no notion of browser UI labels.

### Packaging

- `guides` stays the English array, and `selectGuide` stays synchronous.
- Each locale ships as an opt-in subpath, `pwa-instructions/locales/<tag>`, exporting `Record<guideId, LocalizedGuide>` (text, Markdown and SVG data URL). Consumers register what they ship with `registerLocale(tag, data)` or pass `localeData`, and bundlers drop the rest. An unregistered locale falls back and is reported in `GuideSelection.locale`.
- Pre-built SVGs per locale add about 100 KB per locale before compression. Swapping text into a template SVG at runtime would cut this to a few KB per locale, as a later optimization if size matters.
- English assets keep their current paths. Other locales go to `dist/assets/<id>/<tag>/`.

### Release

0.2.0, as long as omitting `locale` returns exactly today's objects, `guides` stays English, and only optional properties and new exports are added. `GuideSelection.reason` stays English and is documented as a developer diagnostic. A new `reasonCode` lets consumers localize it themselves.

## Plan

### Phase 0: groundwork, no output change

1. Make `composeGuides(root, catalog, locale = "en")` a pure function of its sources and locale. Today it writes `install.svg` and `instructions.md` back into the guide folder.
2. Add a snapshot test proving the English SVG, Markdown and generated guide data are unchanged.
3. Replace the `/step (\d+)/gi` renumbering with `{step:n}` placeholders in the English metadata, including Brave's `intro`. The English output stays identical.

### Phase 1: build and data

Files: `scripts/compose-guides.mjs`, `scripts/build.mjs`, a new `scripts/i18n.mjs` (loads, resolves and validates the locale and label files), the source SVGs, and `catalog.json` (gains `locales`).

1. Localize each guide for each locale at composition time, with reused steps resolved in the target locale and `{step:n}` renumbered by offset.
2. Tag every translatable SVG text node, for example `<text data-i18n="label:share">Share</text>`. The English text stays in the node, so the English output is byte-identical. Confirm that `data-i18n` survives the id and style scoping used when panels are imported into composed guides.
3. Replace tagged text from the label dictionary or the locale file, and set `lang` and `xml:lang` on the SVG root. Apply `styleTitle` through the same `{label:x}`-derived `uiLabel`.
4. Handle longer text. Add `data-max-width` to tagged nodes, wrap titles in `<tspan>` or reserve two lines, and use `textLength` with `lengthAdjust` where a label overflows. Check that the font stack has CJK fallbacks.
5. Emit per-locale modules for the `./locales/*` export in `package.json`.

### Phase 2: API

1. `types.ts`: the locale options, `GuideSelection.locale`, `reasonCode`, the guide fallback fields, and the `LocaleData` types.
2. New `src/core/locale.ts`: `resolveLocale`, `registerLocale`, `getGuideLocales`, `detectUILocale`.
3. `select.ts`: localize after the existing selection, including the explicit `guideId` path. Matching logic does not change.
4. `illustration.ts`: replace the appended English "Website:" with a per-locale string, applied after host substitution.
5. React: `InstallInstructions` and `InstallGuideView` accept and forward `locale` and `browserLocale`. Move their heading strings into a `ui` section of each locale file. Set `lang` on the section when it differs from the document's, and add `data-pwa-locale`.
6. Add a locale picker to the example app. Update `docs/api.md`, `docs/authoring-guides.md` (file formats, the label dictionary, how to add a locale) and both READMEs.

### Phase 3: completeness checks in `npm run check`

Implemented in `scripts/check-locales.mjs`, run by the build (`npm run check:locales` runs it alone), with tests in `tests/check-locales.test.mjs`. Rules marked "complete only" are warnings on a draft locale. Each rule fails with a precise message:

1. Every shipped locale has a title and description for every step of every guide, after resolving reuse.
2. Each translated string has the same `{label:*}` and `{step:*}` placeholders as the English string, and every label id exists.
3. Every label used resolves for the shipped locale, with no silent English fallback inside a shipped locale.
4. Every `data-i18n` key in the source SVGs has a translation, and no visible SVG text is untagged except an allow-list (domain, digits).
5. Every label records its source.
6. No empty strings or `TODO` markers. A string identical to English is a warning, with an allow-list for brand names.
7. Overflow heuristic against `data-max-width`: warn at 100% and fail at 130%.
8. The `catalog.json` `locales` list matches the files present, with no orphan locale files.
9. Tags are canonical, and each file name matches its tag.

Each locale has a status in the catalog, such as `"locales": { "es": "complete" }`. Only `complete` locales are published. `draft` lets translators work in the repo without failing `check`.

### Phase 4: tests

New `tests/i18n.test.mjs`, plus extensions to the existing tests:

- **Backward compatibility:** `selectGuide(env)` with no locale deep-equals the 0.1.0 output for every guide.
- **Resolver:** `pt-BR` resolves to `pt` and then `en`, arrays are respected, case and `_` are normalized, `zh-Hans` never serves `zh-Hant`, and unknown tags fall back to `en` with `fallback: true`.
- **Reuse:** Brave in `es` gets Safari's `es` steps, with renumbered step references. Removing a Safari key fails the Brave check (fixture test).
- **`transitionBefore`:** the Brave `es` SVG has the localized heading and no "Continue in Safari".
- **SVG:** localized SVGs parse, ids stay unique, `lang` is set, and no English mockup labels remain (allow-list for brands and domain).
- **`getIllustration`:** the localized alt includes `siteUrl`, and the guide is not mutated.
- **React:** localized headings, `lang`, the fallback attribute, and `<em>` around the localized label.
- **Package:** the packed tarball contains the locale modules and assets, and a consumer can import `pwa-instructions/locales/es`.
- The English literals asserted in `tests/composition.test.mjs` keep passing unchanged.

## Sourcing browser UI labels

Copy the string the product actually shows. Never machine-translate a label, and record how each one was obtained.

1. **Safari (iOS and macOS):** a simulator or device set to the target language, recording the OS version. Cross-check against Apple's localized support pages.
2. **Chrome (iOS, Android, desktop) and Edge:** Chromium's `.xtb` translation files, found by searching for the English source string. Chrome iOS has its own string set in the same tree. Edge has its own strings on top of Chromium, so verify them on the product, on Microsoft's localized support pages and in Microsoft's terminology search.
3. **Brave:** `brave-core` and brave-ios `Localizable.strings`. Share-sheet items such as Share, View More and Open in Safari are iOS strings and belong to `ios-share-sheet`.
4. **Android and Windows system UI:** AOSP resources and Microsoft terminology.
5. **Verification gate:** a locale is `complete` only after an on-device or native-speaker check for each surface, recorded in the label's source data. Store a reference to the capture, not the screenshot.
6. **Drift:** an advisory `check:labels` script lists labels not verified within a year or several releases. It does not block `check`.

## First locales

- First wave: `es`, `fr`, `de`, `pt-BR`, `it`, `ja`, `ko`, `zh-Hans`, and `nl` or `pl`.
- Second wave: `zh-Hant`, `ru`, `tr`, `id`.
- Deferred: `ar` and `he` (the right-to-left mockups would need mirroring), and `th` and `hi` (until the font and wrapping checks exist).

Agree the list with wl-bill-splitter. Its other locales fall back to English with `fallback: true` until each is complete. Later locales can ship as 0.2.x data-only releases.

## Risks

- **Label accuracy:** one wrong label makes the guide unusable, and labels change between OS and browser releases. Mitigated by recorded sources and the verification gate.
- **Tagging the SVGs:** tagging every text node in the 8 SVGs, including the shared panels, is the largest manual job.
- **Text expansion:** translations run up to about 30% longer, and the SVG layout has fixed widths. Overflow is only estimated, so each locale needs a one-off visual review.
- **The `navigator.languages` proxy:** it is imperfect, but a mismatch affects the SVG, not the prose.
- **Bundle size:** about 100 KB per locale before compression if a consumer imports every locale up front.
- **Generated files:** per-locale outputs would multiply the committed files. Commit English only, generate the other locales into `dist/` and `generated/`, and add a `git diff --exit-code` step to CI so stale English output fails.

## Open decisions

1. The final first-wave locale list, agreed with wl-bill-splitter.
2. Whether `browserLocale` ships in 0.2.0 or only gets its place reserved in the API.
3. Pre-built SVGs per locale, or runtime text substitution.
4. Who translates and who verifies the labels.
5. Whether right-to-left locales are in scope for 0.2.0.
6. Whether a parenthetical English gloss is shown when the page and UI languages differ, and how React defaults `browserLocale` (from the page `lang` or from `navigator`).
