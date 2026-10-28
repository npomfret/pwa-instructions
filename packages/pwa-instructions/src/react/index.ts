"use client";

import { createElement as h, useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { detectBrowserEnvironment, selectGuide, getIllustration, getLocaleUI, localizeGuide } from "../core/index.js";
import type { Environment, GuideSelection, InstallGuide, InstallStep, LocaleOptions, LocaleUI, SelectionOptions } from "../core/index.js";

export { detectEnvironment, detectBrowserEnvironment, selectGuide, guides, getIllustration } from "../core/index.js";
export type { Environment, GuideSelection, InstallGuide, InstallStep } from "../core/index.js";

export type Presentation = "both" | "image" | "text";

export interface InstallGuideViewProps extends LocaleOptions {
  guide: InstallGuide;
  presentation?: Presentation;
  className?: string;
  /** Serve the image from your origin if CSP disallows data images. */
  illustrationSrc?: string;
  /** Optional URL or bare domain, displayed in the bundled SVG address bars. */
  siteUrl?: string;
}

function stepTitle(step: InstallStep): ReactNode {
  const offset = step.uiLabel ? step.title.indexOf(step.uiLabel) : -1;
  if (offset < 0 || !step.uiLabel) return step.title;
  return [step.title.slice(0, offset), h("em", { key: "label" }, step.uiLabel),
    step.title.slice(offset + step.uiLabel.length)];
}

function guideContext(guide: InstallGuide, ui: LocaleUI): string {
  const device = ui.devices[guide.device === "desktop" && guide.platform === "macos" ? "desktop-mac" : guide.device];
  const platform = ui.platforms[guide.platform];
  const browser = ui.browsers[guide.browser];
  if (guide.versions.documentationOnly) {
    return `${platform} · ${browser} · ${ui.documentationDraft}`;
  }
  const browserVersion = guide.versions.minimumBrowserVersion ?? guide.versions.observedBrowser;
  return `${device} · ${platform} ${guide.versions.observedOS} · ${browser} ${browserVersion}`;
}

/** The page's own `lang`, read after mounting so server output and initial hydration agree. */
function useDocumentLanguage(): string | null {
  const [language, setLanguage] = useState<string | null>(null);
  useEffect(() => setLanguage(document.documentElement.lang.trim().toLowerCase()), []);
  return language;
}

/** Present a known guide with no browser detection or imposed styles. */
export function InstallGuideView({ guide: source, presentation = "both", className, illustrationSrc, siteUrl, locale, browserLocale, localeData }: InstallGuideViewProps) {
  const headingId = useId();
  const documentLanguage = useDocumentLanguage();
  const options = { locale, browserLocale, localeData };
  // An English guide is localized here; one that is already in another language is shown as it is.
  const guide = locale === undefined || source.language !== "en" ? source : localizeGuide(source, options).guide;
  // Headings follow the language of the guide text, so a fallback guide is not half translated.
  const ui = getLocaleUI(guide.language, localeData);
  const illustration = illustrationSrc ? guide.illustration : getIllustration(guide, { siteUrl, localeData });
  // English output with no locale is 0.1.0's: the language is marked only when one was asked for or the text is not English.
  const marked = locale !== undefined || guide.language !== "en";
  const kind = presentation === "text" ? ui.textInstructions : ui.illustratedGuide;
  return h("section", { className, "aria-labelledby": headingId, "data-pwa-guide": guide.id,
    ...(marked ? { "data-pwa-locale": guide.language, "data-pwa-locale-fallback": guide.localeFallback ? "true" : undefined,
      lang: documentLanguage === guide.language.toLowerCase() ? undefined : guide.language } : {}) },
    h("h2", { id: headingId }, ui.heading.replace("{kind}", () => kind).replace("{context}", () => guideContext(guide, ui))),
    presentation !== "text" && h("img", {
      src: illustrationSrc ?? illustration.src, alt: illustration.alt,
      width: guide.illustration.width, height: guide.illustration.height,
      style: { display: "block", maxWidth: "100%", height: "auto" },
    }),
    presentation !== "image" && h("ol", null, guide.steps.map(step =>
      h("li", { key: step.id }, h("strong", null, stepTitle(step)), " ", step.description))),
    h("p", null, guide.completion),
  );
}

export interface InstallInstructionsProps extends SelectionOptions {
  /** undefined detects on the client; null requests a manual guide selection. */
  environment?: Environment | null;
  presentation?: Presentation;
  className?: string;
  illustrationSrc?: string;
  /** Optional URL or bare domain, displayed in the bundled SVG address bars. */
  siteUrl?: string;
  fallback?: ReactNode | ((selection: GuideSelection) => ReactNode);
}

/** Detect after mounting, so server output and initial hydration agree. */
export function InstallInstructions({ environment, guideId, guides, locale, browserLocale, localeData, fallback = null, ...viewProps }: InstallInstructionsProps) {
  const [detected, setDetected] = useState<Environment | null>(null);
  useEffect(() => {
    if (environment === undefined && guideId === undefined) setDetected(detectBrowserEnvironment());
  }, [environment, guideId]);
  const selection = selectGuide(environment === undefined ? detected : environment, { guideId, guides, locale, browserLocale, localeData });
  if (!selection.guide) return h("div", { "data-pwa-status": selection.status },
    typeof fallback === "function" ? fallback(selection) : fallback);
  return h(InstallGuideView, { ...viewProps, guide: selection.guide, locale, browserLocale, localeData });
}
