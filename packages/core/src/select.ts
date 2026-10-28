import { guides as defaultGuides } from "./generated/guides.js";
import type { Environment, GuideSelection, MajorVersionRange, SelectionOptions } from "./types.js";

const includes = (range: MajorVersionRange, value: number) =>
  value >= range.min && (range.max === null || value <= range.max);

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
  const result = (status: GuideSelection["status"], reason: string,
    guide: GuideSelection["guide"] = null, match: GuideSelection["match"] = null): GuideSelection =>
    ({ status, reason, guide, match, environment });
  if (options.guideId !== undefined) {
    const guide = guides.find(item => item.id === options.guideId);
    return guide ? result("matched", "Guide chosen explicitly.", guide, "manual")
      : result("unsupported", "The requested guide does not exist.");
  }
  if (!environment) return result("needs-selection", "Choose a guide or detect a browser on the client.");
  if (environment.standalone) return result("installed", "This app is already running in standalone mode.");
  const candidates = guides.filter(guide => guide.platform === environment.platform &&
    guide.browser === environment.browser && guide.device === environment.device);
  if (!candidates.length) return result("unsupported", "There is no guide for this browser and device yet.");
  if (environment.browserMajor === null) return result("needs-selection", "The browser version is unavailable; choose a guide.");
  const versionCandidates = candidates.filter(guide => includes(guide.versions.browser, environment.browserMajor!) &&
    (environment.osMajor === null || includes(guide.versions.os, environment.osMajor)));
  const hasVersionDetails = (minimum: string) => !!environment.browserVersion &&
    (environment.browserMajor! > Number(minimum.split(".")[0]) || environment.browserVersion.split(".").length >= minimum.split(".").length);
  const matches = versionCandidates.filter(guide => !guide.versions.minimumBrowserVersion ||
    (hasVersionDetails(guide.versions.minimumBrowserVersion) &&
      compareVersions(environment.browserVersion!, guide.versions.minimumBrowserVersion) >= 0));
  if (!matches.length && versionCandidates.some(guide => guide.versions.minimumBrowserVersion && !hasVersionDetails(guide.versions.minimumBrowserVersion))) {
    return result("needs-selection", "This browser hides the version details needed to choose a layout. Select a guide manually.");
  }
  if (!matches.length) return result("unsupported", "There is no guide for these versions yet.");
  matches.sort((a, b) => b.versions.browser.min - a.versions.browser.min || compareVersions(b.versions.minimumBrowserVersion ?? "0", a.versions.minimumBrowserVersion ?? "0") || b.versions.os.min - a.versions.os.min);
  const guide = matches[0];
  if (environment.osMajor === null && guide.versions.requiresKnownOSVersion) {
    return result("needs-selection", "The OS version is hidden; select the guide for your device manually.");
  }
  // If OS identity is hidden, disjoint OS layouts sharing a browser need a choice.
  if (environment.osMajor === null && matches.some(item => item.id !== guide.id &&
    item.versions.browser.min === guide.versions.browser.min)) {
    return result("needs-selection", "The OS version is hidden and more than one layout could apply.");
  }
  const newer = (environment.browserVersion && guide.versions.observedBrowserVersion &&
    compareVersions(environment.browserVersion, guide.versions.observedBrowserVersion) > 0) ||
    environment.browserMajor > guide.versions.observedBrowser ||
    (environment.osMajor !== null && environment.osMajor > guide.versions.observedOS);
  if (newer) return result("matched", "Using the latest known layout for a newer version; the controls may have changed.", guide, "newer-version");
  if (environment.osMajor === null) return result("matched", "Selected by browser version; the OS version is hidden.", guide, "browser-version");
  return result("matched", "These major versions match the recorded reference.", guide, "observed");
}
