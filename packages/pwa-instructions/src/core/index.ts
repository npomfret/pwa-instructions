export { detectEnvironment, detectBrowserEnvironment } from "./detect.js";
export { selectGuide } from "./select.js";
export { guides } from "./generated/guides.js";
export type { Platform, Browser, Device, Environment, DetectionInput, MajorVersionRange, InstallStep, InstallGuide, SelectionOptions, GuideSelection,
  LocalizedGuide, LocaleData, LocaleUI, LocaleOptions, LocaleResolution, ReasonCode } from "./types.js";
export { getIllustration } from "./illustration.js";
export type { IllustrationOptions } from "./illustration.js";
export { resolveLocale, registerLocale, getGuideLocales, detectUILocale, localizeGuide, getLocaleUI } from "./locale.js";
