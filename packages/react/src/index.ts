"use client";

import { createElement as h, useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { detectBrowserEnvironment, selectGuide, getIllustration } from "@pwa-instructions/core";
import type { Environment, GuideSelection, InstallGuide, InstallStep, SelectionOptions } from "@pwa-instructions/core";

export { detectEnvironment, detectBrowserEnvironment, selectGuide, guides, getIllustration } from "@pwa-instructions/core";
export type { Environment, GuideSelection, InstallGuide, InstallStep } from "@pwa-instructions/core";

export type Presentation = "both" | "image" | "text";

export interface InstallGuideViewProps {
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

function guideContext(guide: InstallGuide): string {
  const device = { iphone: "iPhone", ipad: "iPad", android: "Android device",
    desktop: guide.platform === "macos" ? "Mac" : "Desktop", unknown: "Device" }[guide.device];
  const platform = { ios: "iOS", macos: "macOS", android: "Android", windows: "Windows", unknown: "OS" }[guide.platform];
  const browser = { safari: "Safari", chrome: "Chrome", brave: "Brave", firefox: "Firefox",
    edge: "Edge", opera: "Opera", samsung: "Samsung Internet", unknown: "Browser" }[guide.browser];
  if (guide.versions.documentationOnly) {
    return `${platform} · ${browser} · Documentation draft`;
  }
  const browserVersion = guide.versions.minimumBrowserVersion ?? guide.versions.observedBrowser;
  return `${device} · ${platform} ${guide.versions.observedOS} · ${browser} ${browserVersion}`;
}

/** Present a known guide with no browser detection or imposed styles. */
export function InstallGuideView({ guide, presentation = "both", className, illustrationSrc, siteUrl }: InstallGuideViewProps) {
  const headingId = useId();
  const illustration = illustrationSrc ? guide.illustration : getIllustration(guide, { siteUrl });
  return h("section", { className, "aria-labelledby": headingId, "data-pwa-guide": guide.id },
    h("h2", { id: headingId }, `${presentation === "text" ? "Text instructions" : "Illustrated guide"}: ${guideContext(guide)}`),
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
export function InstallInstructions({ environment, guideId, guides, fallback = null, ...viewProps }: InstallInstructionsProps) {
  const [detected, setDetected] = useState<Environment | null>(null);
  useEffect(() => {
    if (environment === undefined && guideId === undefined) setDetected(detectBrowserEnvironment());
  }, [environment, guideId]);
  const selection = selectGuide(environment === undefined ? detected : environment, { guideId, guides });
  if (!selection.guide) return h("div", { "data-pwa-status": selection.status },
    typeof fallback === "function" ? fallback(selection) : fallback);
  return h(InstallGuideView, { ...viewProps, guide: selection.guide });
}
