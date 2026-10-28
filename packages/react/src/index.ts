"use client";

import { createElement as h, useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { detectBrowserEnvironment, selectGuide } from "@pwa-instructions/core";
import type { Environment, GuideSelection, InstallGuide, SelectionOptions } from "@pwa-instructions/core";

export { detectEnvironment, detectBrowserEnvironment, selectGuide, guides } from "@pwa-instructions/core";
export type { Environment, GuideSelection, InstallGuide, InstallStep } from "@pwa-instructions/core";

export type Presentation = "both" | "image" | "text";

export interface InstallGuideViewProps {
  guide: InstallGuide;
  presentation?: Presentation;
  className?: string;
  /** Serve the image from your origin if CSP disallows data images. */
  illustrationSrc?: string;
}

/** Present a known guide with no browser detection or imposed styles. */
export function InstallGuideView({ guide, presentation = "both", className, illustrationSrc }: InstallGuideViewProps) {
  const headingId = useId();
  return h("section", { className, "aria-labelledby": headingId, "data-pwa-guide": guide.id },
    h("h2", { id: headingId }, guide.title),
    presentation !== "text" && h("figure", { "data-pwa-illustration": true, style: { margin: 0 } },
      h("figcaption", null, "Illustrated guide"),
      h("img", {
      src: illustrationSrc ?? guide.illustration.src, alt: guide.illustration.alt,
      width: guide.illustration.width, height: guide.illustration.height,
      style: { display: "block", maxWidth: "100%", height: "auto" },
    })),
    presentation !== "image" && h("ol", null, guide.steps.map(step =>
      h("li", { key: step.id }, h("strong", null, step.title), " ", step.description))),
    h("p", null, guide.completion),
  );
}

export interface InstallInstructionsProps extends SelectionOptions {
  /** undefined detects on the client; null requests a manual guide selection. */
  environment?: Environment | null;
  presentation?: Presentation;
  className?: string;
  illustrationSrc?: string;
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
