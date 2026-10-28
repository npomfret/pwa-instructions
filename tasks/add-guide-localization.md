# Localize install guides

Status: proposed; implementation not started.

## Issue

Every guide is English only. Each `metadata.json` has `"language": "en"`, and the core API has no locale input: `selectGuide(environment, { guideId?, guides? })` and `getIllustration(guide, { siteUrl? })`. A guide's `title`, `label`, step `title`/`description`, `completion`, the illustration `alt`, and the generated `instructions.md` are all fixed English strings. The SVG step headings carry the same English text, because the build draws each step title into `install.svg`.

Consumers that ship many locales cannot use the guides without an English-only section. wl-bill-splitter (38 locales) is integrating 0.1.0 with English guide text as an approved, temporary exception, and will adopt locale support once it is released.

## What localization has to cover

- **Structured text:** guide title and label, step titles and descriptions, completion text, illustration alt text, and the generated Markdown.
- **Artwork text:** the step headings drawn into each SVG. A localized guide needs its own generated SVG, or headings rendered outside the artwork.
- **Browser UI labels:** `uiLabel` and the menu items named in step text are the browser's own UI strings, such as Safari's "Share" and "Add to Home Screen". A translation has to use the label the browser actually shows in that language, not a free translation, or the user cannot find the control. This needs sourcing per browser and locale, and the menu labels drawn inside the browser mockups need the same treatment.
- **Composition:** steps reused through references, and `transitionBefore` headings, must resolve in the requested locale.

## Open questions

- API shape: a `locale` option on `selectGuide`/`getIllustration`, or locale-specific guide entries selected by `language`. Also the fallback order (for example `pt-BR`, then `pt`, then `en`) and how a consumer learns that a fallback happened.
- Whether the browser's UI language, not the page's language, should decide which labels are shown when the two differ.
- Where translations live, for example a `locales/<lang>.json` beside each guide's `metadata.json`, and how a reused step's translation is inherited.
- Which locales to ship first, and how translation completeness is checked in `npm run check`.
- Release: a minor version (0.2.0) if `en` stays the default and existing calls behave the same.
