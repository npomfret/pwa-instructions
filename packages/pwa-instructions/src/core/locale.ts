import { guides as defaultGuides } from "./generated/guides.js";
import type { InstallGuide, LocaleData, LocaleOptions, LocaleResolution, LocaleUI, LocalizedGuide } from "./types.js";

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
  return [DEFAULT, ...[...merged(localeData)].filter(([, data]) => carries(data, guide)).map(([tag]) => tag)];
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

/** The text of `guide` in the requested locale, or English with `localeFallback` set. Never changes `guide`. */
export function localizeGuide(guide: InstallGuide, options: LocaleOptions = {}): { guide: InstallGuide; locale: LocaleResolution } {
  const all = merged(options.localeData);
  const locale = resolveLocale(options.locale, [...all].filter(([, data]) => carries(data, guide)).map(([tag]) => tag));
  const { resolved } = locale;
  if (resolved === guide.language) return { guide: mark(guide, locale), locale };
  if (resolved === DEFAULT) {
    // A guide passed in already localized goes back to its bundled English.
    return { guide: mark(defaultGuides.find(item => item.id === guide.id) ?? guide, locale), locale };
  }
  const localized = carries(all.get(resolved)!, guide)!;
  return { locale, guide: mark({
    ...guide, title: localized.title, label: localized.label, language: localized.language,
    steps: guide.steps.map(({ uiLabel: _english, ...step }) => {
      const text = localized.steps.find(item => item.id === step.id)!;
      return { ...step, title: text.title, description: text.description, ...(text.uiLabel ? { uiLabel: text.uiLabel } : {}) };
    }),
    completion: localized.completion, text: localized.text,
    illustration: { ...guide.illustration, src: localized.illustration.src, alt: localized.illustration.alt },
  }, locale) };
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
