import { guides as defaultGuides } from "./generated/guides.js";
import { substituteLabelsInSource } from "./artwork.js";
import type { GuideLocaleResolution, InstallGuide, LocaleData, LocaleOptions, LocaleResolution, LocaleUI, LocalizedGuide } from "./types.js";

const DEFAULT = "en";
const registry = new Map<string, LocaleData>();

/** Canonical form of a tag, tolerating `_` and surrounding space; null when it is not a valid tag. */
function canonical(tag: string): string | null {
  try { return Intl.getCanonicalLocales(tag.trim().replaceAll("_", "-"))[0] ?? null; } catch { return null; }
}

const scriptOf = (tag: string) => { try { return new Intl.Locale(tag).maximize().script; } catch { return undefined; } };

/** The tags to try for one request, most specific first: `zh-TW` is `zh-TW`, `zh-Hant`, then `zh`. */
function chain(tag: string): string[] {
  // The pseudo-locale is never English, so a missing en-XA is a fallback and not a regional variant of en.
  if (tag === "en-XA") return [tag];
  const parts = tag.split("-");
  const tags: string[] = [];
  for (let end = parts.length; end > 0; end--) tags.push(parts.slice(0, end).join("-"));
  const locale = new Intl.Locale(tag);
  const scripted = locale.script ? null : `${locale.language}-${locale.maximize().script}`;
  if (scripted) tags.splice(tags.length - 1, 0, scripted);
  return tags;
}

/**
 * Pick the best available tag for `requested`. Tags are canonicalized, `pt-BR` falls back to `pt` and then to `en`, and
 * an array is tried in order. A script is never crossed: `zh-Hans` and `zh-TW` never get `zh-Hant` or `zh-Hans`
 * respectively. `en` is always available. `fallback` is false when the first request was served in its own language.
 */
export function resolveLocale(requested: string | readonly string[] | null | undefined, available: Iterable<string>): LocaleResolution {
  const tags = [...available].map(canonical).filter((tag): tag is string => tag !== null);
  const pool = new Set([DEFAULT, ...tags]);
  const requests = (typeof requested === "string" ? [requested] : requested ?? []).map(tag => ({ raw: tag.trim(), tag: canonical(tag) }))
    .filter(item => item.raw);
  if (!requests.length) return { requested: null, resolved: DEFAULT, fallback: false };
  const first = requests[0].tag ?? requests[0].raw;
  for (const [index, { tag }] of requests.entries()) {
    if (!tag) continue;
    const script = scriptOf(tag);
    const found = chain(tag).find(candidate => pool.has(candidate) && scriptOf(candidate) === script);
    if (found) return { requested: first, resolved: found, fallback: index > 0 };
  }
  return { requested: first, resolved: DEFAULT, fallback: true };
}

/** Add a locale's data, replacing any earlier data for the same tag. Call it at startup with a `locales/<tag>` module. */
export function registerLocale(tag: string, data: LocaleData): void {
  const name = canonical(tag);
  if (!name) throw new RangeError(`Invalid locale tag: ${tag}`);
  registry.set(name, data);
}

const merged = (localeData?: LocaleOptions["localeData"]) => {
  const all = new Map(registry);
  for (const [tag, data] of Object.entries(localeData ?? {})) { const name = canonical(tag); if (name) all.set(name, data); }
  return all;
};

/** A locale carries a guide only when it has every step, so a guide is never half translated. */
const carries = (data: LocaleData, guide: InstallGuide): LocalizedGuide | null => {
  const localized = data.guides[guide.id];
  return localized && guide.steps.every(step => localized.steps.some(item => item.id === step.id)) ? localized : null;
};

/** Every tag with registered data, plus `localeData`. */
export const getRegisteredLocales = (localeData?: LocaleOptions["localeData"]): string[] => [...merged(localeData).keys()];

/** The locales that can serve `guide`: `en` and every registered locale (or `localeData`) with complete data for it. */
export function getGuideLocales(guide: InstallGuide, localeData?: LocaleOptions["localeData"]): string[] {
  return [...new Set([DEFAULT, ...[...merged(localeData)].filter(([, data]) => carries(data, guide)).map(([tag]) => tag)])];
}

/** The browser's preferred language, `navigator.languages[0]`: a proxy for the UI language, not a guarantee. Undefined on the server. */
export function detectUILocale(): string | undefined {
  // Node 21+ has a `navigator` too, so the server is recognised by having no `window`.
  if (typeof window === "undefined" || typeof navigator === "undefined") return undefined;
  return navigator.languages?.[0] ?? navigator.language ?? undefined;
}

const withoutFallback = ({ localeFallback: _fallback, requestedLocale: _requested, ...guide }: InstallGuide): InstallGuide => guide;

/** Mark a guide that is not in the requested language, and clear a stale mark from one that is. */
function mark(guide: InstallGuide, { requested, fallback }: LocaleResolution): InstallGuide {
  if (fallback) return { ...withoutFallback(guide), localeFallback: true, requestedLocale: requested! };
  return guide.localeFallback === undefined && guide.requestedLocale === undefined ? guide : withoutFallback(guide);
}

/** The canonical tags of a locale option, in order, with blanks dropped. */
const tagsOf = (locale: string | readonly string[] | undefined): string[] =>
  (typeof locale === "string" ? [locale] : locale ?? []).map(tag => tag.trim()).filter(Boolean).map(tag => canonical(tag) ?? tag);

/**
 * Label-only variants, by tag, with the locale whose prose they share. A variant has its own control names but no prose
 * or templates, so its labels ship in the base locale's module (`locales/en` carries `en-US`) and its text is the base's.
 */
const LABEL_VARIANTS: Readonly<Record<string, string>> = { "en-US": "en" };
const variantBase = (tag: string): string | undefined => (Object.hasOwn(LABEL_VARIANTS, tag) ? LABEL_VARIANTS[tag] : undefined);

/**
 * The canonical `browserLocale` tags when one was passed and names another locale than the page's `locale`; otherwise
 * null. An omitted `locale` means the language `guide` is in, which is English for a bundled guide. A label-only variant
 * is always requested, even when it is the page's own locale, because `locale: "en-US"` has English prose and US labels.
 */
export function browserRequest({ locale, browserLocale }: LocaleOptions, guide?: InstallGuide): string[] | null {
  const browser = tagsOf(browserLocale);
  const page = tagsOf(locale)[0] ?? guide?.language ?? DEFAULT;
  // Without a browserLocale the page's locale names the labels too, which only matters for a variant.
  const tags = browser.length ? browser : tagsOf(locale).slice(0, 1);
  if (!tags.length) return null;
  if (variantBase(tags[0])) return tags;
  return browser.length && tags[0] !== page ? tags : null;
}

const PLACEHOLDER = /\{label:([a-z0-9-]+)\}/g;
const FIRST_LABEL = /\{label:([a-z0-9-]+)\}/;

/**
 * `page`'s control names from the browser locale: the page locale's templates with `{label:id}` filled from `labels`
 * (the page's own `fallback` labels for an id the browser table lacks), `uiLabel` taken from the first label in each
 * title, and the artwork's label nodes redrawn. Text outside the placeholders is the page's.
 */
function withBrowserLabels(page: InstallGuide, data: LocalizedGuide, labels: Readonly<Record<string, string>>,
  fallback: Readonly<Record<string, string>> = {}): InstallGuide {
  const templates = data.templates ?? {};
  const label = (id: string) => labels[id] ?? fallback[id];
  const fill = (text: string) => text.replace(PLACEHOLDER, (placeholder, id: string) => label(id) ?? placeholder);
  return {
    ...page,
    steps: page.steps.map(step => {
      const template = templates.steps?.[step.id];
      if (!template) return step;
      const control = FIRST_LABEL.exec(template.title)?.[1];
      const uiLabel = control === undefined ? undefined : label(control);
      return { ...step, title: fill(template.title), description: fill(template.description), ...(uiLabel === undefined ? {} : { uiLabel }) };
    }),
    completion: templates.completion === undefined ? page.completion : fill(templates.completion),
    text: templates.text === undefined ? page.text : fill(templates.text),
    illustration: { ...page.illustration, src: substituteLabelsInSource(data.illustration.src, label) },
  };
}

/**
 * The text of `guide` in the requested locale, or English with `localeFallback` set. Never changes `guide`. When
 * `browserLocale` names another locale, the control names come from that locale's labels (see withBrowserLabels) and
 * `locale.browser` says which labels were used.
 */
export function localizeGuide(guide: InstallGuide, given: LocaleOptions = {}): { guide: InstallGuide; locale: GuideLocaleResolution } {
  // With only a browser locale, the page is the language the guide is already in.
  const options = given.locale === undefined && tagsOf(given.browserLocale).length && guide.language !== DEFAULT ? { ...given, locale: guide.language } : given;
  const all = merged(options.localeData);
  const locale: GuideLocaleResolution = resolveLocale(options.locale, [...all].filter(([, data]) => carries(data, guide)).map(([tag]) => tag));
  const { resolved } = locale;
  let page: InstallGuide;
  if (resolved === guide.language) page = guide;
  // A guide passed in already localized goes back to its bundled English.
  else if (resolved === DEFAULT) page = defaultGuides.find(item => item.id === guide.id) ?? guide;
  else {
    const localized = carries(all.get(resolved)!, guide)!;
    page = {
      ...guide, title: localized.title, label: localized.label, language: localized.language,
      steps: guide.steps.map(({ uiLabel: _english, ...step }) => {
        const text = localized.steps.find(item => item.id === step.id)!;
        return { ...step, title: text.title, description: text.description, ...(text.uiLabel ? { uiLabel: text.uiLabel } : {}) };
      }),
      completion: localized.completion, text: localized.text,
      illustration: { ...guide.illustration, src: localized.illustration.src, alt: localized.illustration.alt },
    };
  }
  const requested = browserRequest(options, guide);
  if (!requested) return { guide: mark(page, locale), locale };
  // The browser locale may use any registered locale's labels for this guide, and the page's module also carries English.
  // A label-only variant (en-US) is found in its base locale's module, whatever the page locale is.
  const pageData = all.get(resolved)?.guides[guide.id];
  const labelsOf = (tag: string) => [all.get(tag)?.guides[guide.id], pageData, ...[...all.values()].map(data => data.guides[guide.id])]
    .map(item => item?.labels?.[tag]).find(Boolean);
  const tags = new Set([...all.keys(), ...[pageData, ...[...all.values()].map(data => data.guides[guide.id])].flatMap(item => Object.keys(item?.labels ?? {}))]);
  const found = resolveLocale(requested, [...tags].filter(tag => labelsOf(tag)));
  // A variant cannot be served without its base locale's module. A browserLocale that asked for it says so; a page
  // `locale` that only implies it (`en-US`, as 0.1.0 callers pass) is left exactly as it was.
  const base = variantBase(found.requested ?? "");
  const unserved = base !== undefined && !all.get(base)?.guides[guide.id];
  if (unserved && tagsOf(options.browserLocale).length === 0) return { guide: mark(page, locale), locale };
  // Already the page's labels: nothing to substitute.
  if (!unserved && !found.fallback && found.resolved === resolved) return { guide: mark(page, locale), locale: { ...locale, browser: found } };
  const labels = found.fallback || unserved ? undefined : labelsOf(found.resolved);
  if (!labels || !pageData) {
    // No labels to use, or no page templates to put them in: the page keeps its own, and the resolution says so.
    const browser = { requested: found.requested, resolved, fallback: true };
    return { guide: { ...mark(page, locale), browserLocaleFallback: true, requestedBrowserLocale: found.requested! }, locale: { ...locale, browser } };
  }
  const substituted = withBrowserLabels(page, pageData, labels, labelsOf(resolved));
  return { guide: { ...mark(substituted, locale), browserLanguage: found.resolved }, locale: { ...locale, browser: found } };
}

export const defaultUI: LocaleUI = {
  textInstructions: "Text instructions", illustratedGuide: "Illustrated guide", documentationDraft: "Documentation draft",
  heading: "{kind}: {context}", website: "Website: {host}.",
  devices: { iphone: "iPhone", ipad: "iPad", android: "Android device", "desktop-mac": "Mac", desktop: "Desktop", unknown: "Device" },
  platforms: { ios: "iOS", macos: "macOS", android: "Android", windows: "Windows", unknown: "OS" },
  browsers: { safari: "Safari", chrome: "Chrome", brave: "Brave", firefox: "Firefox", edge: "Edge", opera: "Opera",
    samsung: "Samsung Internet", unknown: "Browser" },
};

/** Interface strings for `locale`: registered data first, then English. Resolution is per locale, never per string. */
export function getLocaleUI(locale?: string | readonly string[], localeData?: LocaleOptions["localeData"]): LocaleUI {
  const all = merged(localeData);
  const { resolved } = resolveLocale(locale, [...all].filter(([, data]) => data.ui).map(([tag]) => tag));
  return all.get(resolved)?.ui ?? defaultUI;
}
