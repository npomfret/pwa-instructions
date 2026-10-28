import { guides as defaultGuides } from "./generated/guides.js";
import { localizeGuide, resolveLocale, getRegisteredLocales } from "./locale.js";
import type { Environment, GuideSelection, MajorVersionRange, ReasonCode, SelectionOptions } from "./types.js";

const includes = (range: MajorVersionRange | null, value: number) =>
  range !== null && value >= range.min && (range.max === null || value <= range.max);

/** Numeric dotted versions: 1.100 is newer than 1.97. */
const compareVersions = (a: string, b: string) => {
  const aa = a.split(".").map(Number), bb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const difference = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
};

/** Selects the newest applicable layout; never substitutes another platform/browser. */
export function selectGuide(environment: Environment | null, options: SelectionOptions = {}): GuideSelection {
  const guides = options.guides ?? defaultGuides;
  // Localizing comes after selection, so matching never depends on the language. Without `locale` the result is 0.1.0's.
  const result = (status: GuideSelection["status"], code: ReasonCode, reason: string,
    guide: GuideSelection["guide"] = null, match: GuideSelection["match"] = null): GuideSelection => {
    const selection = { status, reason, guide, match, environment };
    if (options.locale === undefined) return selection;
    if (!guide) return { ...selection, reasonCode: code, locale: resolveLocale(options.locale, getRegisteredLocales(options.localeData)) };
    const localized = localizeGuide(guide, options);
    return { ...selection, guide: localized.guide, reasonCode: code, locale: localized.locale };
  };
  if (options.guideId !== undefined) {
    const guide = guides.find(item => item.id === options.guideId);
    return guide ? result("matched", "guide-chosen", "Guide chosen explicitly.", guide, "manual")
      : result("unsupported", "guide-not-found", "The requested guide does not exist.");
  }
  if (!environment) return result("needs-selection", "needs-environment", "Choose a guide or detect a browser on the client.");
  if (environment.standalone) return result("installed", "installed", "This app is already running in standalone mode.");
  const candidates = guides.filter(guide => guide.platform === environment.platform &&
    guide.browser === environment.browser && guide.device === environment.device);
  if (!candidates.length) return result("unsupported", "no-guide-for-browser", "There is no guide for this browser and device yet.");
  const documentation = candidates.find(guide => guide.versions.documentationOnly);
  const documentationResult = () => result("matched",
    "documentation-only", "Based on current vendor documentation; device and version compatibility have not been verified.", documentation!, "documentation");
  if (documentation && candidates.every(guide => guide.versions.documentationOnly)) return documentationResult();
  if (environment.browserMajor === null) return result("needs-selection", "version-hidden", "The browser version is unavailable; choose a guide.");
  const versionCandidates = candidates.filter(guide => includes(guide.versions.browser, environment.browserMajor!) &&
    (environment.osMajor === null || includes(guide.versions.os, environment.osMajor)));
  const hasVersionDetails = (minimum: string) => !!environment.browserVersion &&
    (environment.browserMajor! > Number(minimum.split(".")[0]) || environment.browserVersion.split(".").length >= minimum.split(".").length);
  const matches = versionCandidates.filter(guide => !guide.versions.minimumBrowserVersion ||
    (hasVersionDetails(guide.versions.minimumBrowserVersion) &&
      compareVersions(environment.browserVersion!, guide.versions.minimumBrowserVersion) >= 0));
  if (!matches.length && versionCandidates.some(guide => guide.versions.minimumBrowserVersion && !hasVersionDetails(guide.versions.minimumBrowserVersion))) {
    return result("needs-selection", "version-hidden", "This browser hides the version details needed to choose a layout. Select a guide manually.");
  }
  if (!matches.length) return documentation ? documentationResult() : result("unsupported", "no-guide-for-version", "There is no guide for these versions yet.");
  matches.sort((a, b) => b.versions.browser!.min - a.versions.browser!.min || compareVersions(b.versions.minimumBrowserVersion ?? "0", a.versions.minimumBrowserVersion ?? "0") || b.versions.os!.min - a.versions.os!.min);
  const guide = matches[0];
  if (environment.osMajor === null && guide.versions.requiresKnownOSVersion) {
    return result("needs-selection", "os-hidden", "The OS version is hidden; select the guide for your device manually.");
  }
  // If OS identity is hidden, disjoint OS layouts sharing a browser need a choice.
  if (environment.osMajor === null && matches.some(item => item.id !== guide.id &&
    item.versions.browser!.min === guide.versions.browser!.min)) {
    return result("needs-selection", "os-ambiguous", "The OS version is hidden and more than one layout could apply.");
  }
  const newer = (environment.browserVersion && guide.versions.observedBrowserVersion &&
    compareVersions(environment.browserVersion, guide.versions.observedBrowserVersion) > 0) ||
    (guide.versions.observedBrowser !== null && environment.browserMajor > guide.versions.observedBrowser) ||
    (environment.osMajor !== null && guide.versions.observedOS !== null && environment.osMajor > guide.versions.observedOS);
  if (newer) return result("matched", "newer-version", "Using the latest known layout for a newer version; the controls may have changed.", guide, "newer-version");
  if (environment.osMajor === null) return result("matched", "browser-version", "Selected by browser version; the OS version is hidden.", guide, "browser-version");
  return result("matched", "version-match", "These major versions match the recorded reference.", guide, "observed");
}
