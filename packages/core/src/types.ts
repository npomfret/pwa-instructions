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
}

export interface SelectionOptions {
  /** Explicit selection works on any device, including demos on desktop. */
  readonly guideId?: string;
  readonly guides?: readonly InstallGuide[];
}

export interface GuideSelection {
  readonly status: "matched" | "unsupported" | "needs-selection" | "installed";
  readonly guide: InstallGuide | null;
  readonly environment: Environment | null;
  readonly match: "manual" | "observed" | "browser-version" | "newer-version" | "documentation" | null;
  readonly reason: string;
}
