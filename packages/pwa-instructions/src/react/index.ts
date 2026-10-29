"use client";

import { createElement as h, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { detectBrowserEnvironment, selectGuide, getIllustration, localizeGuide } from "../core/index.js";
import { browserRequest } from "../core/locale.js";
import type { Environment, GuideSelection, InstallGuide, InstallStep, LocaleOptions, SelectionOptions } from "../core/index.js";

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
  /** Draw the heading and subtitle at the top of the bundled image, in the guide's language. Off by default. */
  illustrationHeader?: boolean;
}

function stepTitle(step: InstallStep): ReactNode {
  const offset = step.uiLabel ? step.title.indexOf(step.uiLabel) : -1;
  if (offset < 0 || !step.uiLabel) return step.title;
  return [step.title.slice(0, offset), h("em", { key: "label" }, step.uiLabel),
    step.title.slice(offset + step.uiLabel.length)];
}

/** The page's own `lang`, read after mounting so server output and initial hydration agree. */
function useDocumentLanguage(): string | null {
  const [language, setLanguage] = useState<string | null>(null);
  useEffect(() => setLanguage(document.documentElement.lang.trim().toLowerCase()), []);
  return language;
}

/**
 * Present a known guide with no browser detection or imposed styles: the image and the numbered steps, with no heading or
 * closing sentence. Add your own around it; `guide.completion` has the closing sentence.
 */
export function InstallGuideView({ guide: source, presentation = "both", className, illustrationSrc, siteUrl, illustrationHeader, locale, browserLocale, localeData }: InstallGuideViewProps) {
  const documentLanguage = useDocumentLanguage();
  const options = { locale, browserLocale, localeData };
  // An English guide is localized here; one that is already in another language is shown as it is.
  const guide = (locale === undefined && !browserRequest(options, source)) || source.language !== "en" ? source : localizeGuide(source, options).guide;
  const illustration = illustrationSrc ? guide.illustration : getIllustration(guide, { siteUrl, localeData, header: illustrationHeader });
  // English output with no locale is 0.1.0's: the language is marked only when one was asked for or the text is not English.
  const marked = locale !== undefined || guide.language !== "en";
  return h("section", { className, "data-pwa-guide": guide.id,
    ...(marked ? { "data-pwa-locale": guide.language, "data-pwa-locale-fallback": guide.localeFallback ? "true" : undefined,
      lang: documentLanguage === guide.language.toLowerCase() ? undefined : guide.language } : {}),
    // Only when the control names are in another locale than the text, so a page without browserLocale renders as before.
    ...(guide.browserLanguage ? { "data-pwa-browser-locale": guide.browserLanguage } : {}) },
    presentation !== "text" && h("img", {
      src: illustrationSrc ?? illustration.src, alt: illustration.alt,
      width: illustration.width, height: illustration.height,
      style: { display: "block", maxWidth: "100%", height: "auto" },
    }),
    presentation !== "image" && h("ol", null, guide.steps.map(step =>
      h("li", { key: step.id }, h("strong", null, stepTitle(step)), " ", step.description))),
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
  /** Draw the heading and subtitle at the top of the bundled image, in the guide's language. Off by default. */
  illustrationHeader?: boolean;
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
