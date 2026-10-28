import type { Browser, DetectionInput, Device, Environment, Platform } from "./types.js";

const major = (match: RegExpMatchArray | null) => match ? Number(match[1]) : null;

/** A local, best-effort hint. Browsers can disguise their identity. */
export function detectEnvironment(input: DetectionInput = {}): Environment {
  const ua = input.userAgent ?? "";
  const ipad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && (input.maxTouchPoints ?? 0) > 1);
  const iphone = /iPhone/i.test(ua);
  let platform: Platform = "unknown";
  let device: Device = "unknown";
  if (iphone || ipad || /iPod/i.test(ua)) {
    platform = "ios";
    device = iphone ? "iphone" : ipad ? "ipad" : "unknown";
  } else if (/Android/i.test(ua)) {
    platform = "android"; device = "android";
  } else if (/Macintosh/i.test(ua)) {
    platform = "macos"; device = "desktop";
  } else if (/Windows/i.test(ua)) {
    platform = "windows"; device = "desktop";
  }
  // Specific product markers precede shared Safari/Chrome compatibility tokens.
  const products: readonly [Browser, RegExp][] = [
    ["brave", /(?:Brave|BraveiOS)\/(\d+)/i],
    ["edge", /(?:EdgiOS|EdgA|Edg)\/(\d+)/i],
    ["opera", /(?:OPiOS|OPT|OPR)\/(\d+)/i],
    ["samsung", /SamsungBrowser\/(\d+)/i],
    ["firefox", /(?:FxiOS|Firefox)\/(\d+)/i],
    ["chrome", /(?:CriOS|Chrome)\/(\d+)/i],
  ];
  let browser: Browser = "unknown";
  let browserMajor: number | null = null;
  for (const [name, pattern] of products) {
    const match = ua.match(pattern);
    if (match) { browser = name; browserMajor = major(match); break; }
  }
  // Embedded app browsers can include Safari's Version token as well.
  if (browser === "unknown" && /Safari\//i.test(ua) && /Version\//i.test(ua)
      && !/(FBAN|FBAV|Instagram|Line\/|GSA\/|DuckDuckGo\/|YaBrowser\/)/i.test(ua)) {
    browser = "safari";
    browserMajor = major(ua.match(/Version\/(\d+)/i));
  }
  let osMajor: number | null = null;
  if (platform === "ios") {
    osMajor = major(ua.match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)/i));
    // Safari 26+ deliberately freezes its OS token at an older release.
    // Do not treat that token as the actual iOS version or infer an OS version.
    if (browser === "safari" && (browserMajor ?? 0) >= 26) osMajor = null;
  } else if (platform === "android") {
    osMajor = major(ua.match(/Android (\d+)/i));
  }
  return { platform, device, browser, browserMajor, osMajor, standalone: input.standalone ?? false };
}

/** Safe to import/call during SSR. No browser globals are read at module load. */
export function detectBrowserEnvironment(): Environment | null {
  if (typeof window === "undefined") return null;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return detectEnvironment({
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: nav.standalone === true ||
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches),
  });
}
