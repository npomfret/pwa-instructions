import { escapeXML } from "./artwork.js";
import { browserRequest, getLocaleUI, localizeGuide } from "./locale.js";
import type { InstallGuide, LocaleOptions } from "./types.js";

export interface IllustrationOptions extends LocaleOptions {
  /** A full http(s) URL or bare domain. Only its host is displayed. */
  siteUrl?: string;
}

function displayHost(input: string | undefined): string | null {
  if (!input?.trim()) return null;
  const value = input.trim();
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.host || null;
  } catch { return null; }
}

/** Personalize a copy of a bundled SVG, without changing the shared guide. */
export function getIllustration(source: InstallGuide, options: IllustrationOptions = {}): InstallGuide["illustration"] {
  // With a locale (or a browser locale that names other controls), personalize that artwork; the "Website:" wording
  // follows the language of the text it ends.
  const guide = options.locale === undefined && !browserRequest(options, source) ? source : localizeGuide(source, options).guide;
  const host = displayHost(options.siteUrl);
  if (!host || host === "example.com") return guide.illustration;
  const prefix = "data:image/svg+xml;charset=utf-8,";
  if (!guide.illustration.src.startsWith(prefix)) return guide.illustration;
  const xml = decodeURIComponent(guide.illustration.src.slice(prefix.length));
  const customized = xml.replace(/<text\b([^>]*data-pwa-domain="true"[^>]*)>example\.com<\/text>/g,
    (_, attributes: string) => {
      const maxWidth = Number(attributes.match(/data-domain-width="(\d+)"/)?.[1] ?? 140);
      const fitted = host.length * 8 > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : "";
      return `<text${attributes}${fitted}>${escapeXML(host)}</text>`;
    });
  return { ...guide.illustration,
    src: prefix + encodeURIComponent(customized),
    alt: `${guide.illustration.alt} ${getLocaleUI(guide.language, options.localeData).website.replace("{host}", () => host)}`,
  };
}
