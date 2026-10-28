export type Platform = "ios" | "android" | "macos" | "windows" | "unknown";
export type Browser = "safari" | "chrome" | "firefox" | "edge" | "brave" | "opera" | "samsung" | "unknown";
export type Device = "iphone" | "ipad" | "android" | "desktop" | "unknown";

export interface Environment {
  readonly platform: Platform;
  readonly browser: Browser;
  readonly device: Device;
  readonly osMajor: number | null;
  readonly browserMajor: number | null;
  readonly browserVersion?: string | null;
  readonly standalone: boolean;
}

export interface DetectionInput {
  readonly userAgent?: string;
  readonly maxTouchPoints?: number;
  readonly standalone?: boolean;
}

/** Inclusive bounds. null means keep using this layout until replaced. */
export interface MajorVersionRange {
  readonly min: number;
  readonly max: number | null;
}

export interface InstallStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Exact clickable label within the plain-text title, displayed in italics. */
  readonly uiLabel?: string;
  readonly optional?: boolean;
  readonly illustrationFragment: string;
}

export interface InstallGuide {
  readonly id: string;
  readonly title: string;
  readonly label: string;
  readonly language: string;
  readonly platform: Platform;
  readonly browser: Browser;
  readonly device: Device;
  readonly versions: {
    /** null for documentation drafts whose version coverage is unverified. */
    readonly os: MajorVersionRange | null;
    readonly browser: MajorVersionRange | null;
    readonly observedOS: number | null;
    readonly observedBrowser: number | null;
    readonly documentationOnly?: boolean;
    readonly minimumBrowserVersion?: string;
    readonly observedBrowserVersion?: string;
    readonly requiresKnownOSVersion?: boolean;
  };
  readonly illustration: {
    /** Self-contained SVG data URL; override when a site's CSP excludes data images. */
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
  readonly steps: readonly InstallStep[];
  readonly completion: string;
  readonly text: string;
  /** Set only when a locale was requested and this guide is English instead. See `GuideSelection.locale`. */
  readonly localeFallback?: boolean;
  /** The locale that was requested when `localeFallback` is true. */
  readonly requestedLocale?: string;
  /** Set only when `browserLocale` supplied the control names (`uiLabel`, quoted menu items, artwork labels) in another locale than `language`. */
  readonly browserLanguage?: string;
  /** Set only when `browserLocale` was passed but had no labels for this guide, so the page locale's labels were kept. */
  readonly browserLocaleFallback?: boolean;
  /** The browser locale that was requested when `browserLocaleFallback` is true. */
  readonly requestedBrowserLocale?: string;
}

/** The prose of one guide that names a browser control, with `{label:id}` placeholders still in it and `{step:n}` resolved. */
export interface GuideTemplates {
  /** Only the steps whose title or description names a label, by step id. */
  readonly steps?: Readonly<Record<string, Pick<InstallStep, "title" | "description">>>;
  readonly completion?: string;
  /** The Markdown, where the control in a step title is `*{label:id}*`. */
  readonly text?: string;
}

/** One guide's text in one locale: what a `pwa-instructions/locales/<tag>` module exports per guide id. */
export interface LocalizedGuide {
  readonly title: string;
  readonly label: string;
  readonly language: string;
  readonly steps: readonly Pick<InstallStep, "id" | "title" | "description" | "uiLabel">[];
  readonly completion: string;
  readonly text: string;
  /** The SVG keeps `data-i18n="label:id"` on the label nodes, so `browserLocale` can swap their text. */
  readonly illustration: { readonly src: string; readonly alt: string };
  /** The same prose with its placeholders, for an English or localized page shown with another browser language. Absent when no string names a label. */
  readonly templates?: GuideTemplates;
  /** The text of every label the templates and artwork use, by locale tag: this locale's and English. */
  readonly labels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** The strings drawn around a guide, per locale: React headings, the illustration's "Website:" alt text, and names. */
export interface LocaleUI {
  readonly textInstructions: string;
  readonly illustratedGuide: string;
  readonly documentationDraft: string;
  /** "{kind}: {context}": the heading template. `kind` is textInstructions or illustratedGuide. */
  readonly heading: string;
  /** "Website: {host}.": appended to the illustration alt text when a site URL is shown. */
  readonly website: string;
  /** Keyed by Device, with `desktop-mac` for a desktop Mac. */
  readonly devices: Readonly<Record<Device | "desktop-mac", string>>;
  readonly platforms: Readonly<Record<Platform, string>>;
  readonly browsers: Readonly<Record<Browser, string>>;
}

/** A locale's data: what a `pwa-instructions/locales/<tag>` module exports by default. */
export interface LocaleData {
  readonly guides: Readonly<Record<string, LocalizedGuide>>;
  /** Without it the English interface strings are used. */
  readonly ui?: LocaleUI;
}

export interface LocaleOptions {
  /** A BCP 47 tag, or tags in order of preference. Omit for English, exactly as 0.1.0. */
  readonly locale?: string | readonly string[];
  /**
   * The language of the browser or OS interface, for the control names: `uiLabel`, the menu items quoted in the text and
   * the labels drawn in the artwork. The prose stays in `locale`. Defaults to `locale`. It needs the browser locale's
   * labels (any `locales/<tag>` module with data for the guide) and, for an English page, the `locales/en` module.
   */
  readonly browserLocale?: string;
  /** Locale data by tag, used in addition to locales added with registerLocale. These win over registered data. */
  readonly localeData?: Readonly<Record<string, LocaleData>>;
}

export interface SelectionOptions extends LocaleOptions {
  /** Explicit selection works on any device, including demos on desktop. */
  readonly guideId?: string;
  readonly guides?: readonly InstallGuide[];
}

/** What localization did. `fallback` is true when the content is not in the requested language. */
export interface LocaleResolution {
  /** The first requested tag, canonicalized; null when no locale was requested. */
  readonly requested: string | null;
  readonly resolved: string;
  readonly fallback: boolean;
}

/** The resolution of `locale`, plus how `browserLocale` resolved when it was passed and names another locale. */
export interface GuideLocaleResolution extends LocaleResolution {
  /**
   * `resolved` is the locale whose labels were used; `fallback` is true when the browser locale had no labels for the
   * guide (or the page has no templates to fill), so the page locale's own labels are shown.
   */
  readonly browser?: LocaleResolution;
}

export type ReasonCode =
  | "guide-chosen" | "guide-not-found" | "needs-environment" | "installed" | "no-guide-for-browser"
  | "documentation-only" | "version-hidden" | "no-guide-for-version" | "os-hidden" | "os-ambiguous"
  | "newer-version" | "browser-version" | "version-match";

export interface GuideSelection {
  readonly status: "matched" | "unsupported" | "needs-selection" | "installed";
  readonly guide: InstallGuide | null;
  readonly environment: Environment | null;
  readonly match: "manual" | "observed" | "browser-version" | "newer-version" | "documentation" | null;
  /** English, for developers and logs. Show `reasonCode` through your own strings instead. */
  readonly reason: string;
  /** Present only when `locale` was passed, so a call without it returns exactly what 0.1.0 did. */
  readonly reasonCode?: ReasonCode;
  /** Present only when `locale` was passed, or a `browserLocale` that differs from the page's locale. */
  readonly locale?: GuideLocaleResolution;
}
