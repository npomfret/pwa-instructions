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

/** Present a known guide with no browser detection or imposed styles. */
export function InstallGuideView({ guide, presentation = "both", className, illustrationSrc, siteUrl }: InstallGuideViewProps) {
  const headingId = useId();
  const illustration = illustrationSrc ? guide.illustration : getIllustration(guide, { siteUrl });
  return h("section", { className, "aria-labelledby": headingId, "data-pwa-guide": guide.id },
    h("h2", { id: headingId }, presentation === "text" ? guide.title : `Illustrated guide: ${guide.title}`),
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
