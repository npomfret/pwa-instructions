import { escapeXML, restoreHeader } from "./artwork.js";
import { browserRequest, getLocaleUI, localizeGuide } from "./locale.js";
import type { InstallGuide, LocaleOptions } from "./types.js";

export interface IllustrationOptions extends LocaleOptions {
  /** A full http(s) URL or bare domain. Only its host is displayed. */
  siteUrl?: string;
  /** Draw the artwork's heading and subtitle (in the guide's language) above the steps. Off by default. */
  header?: boolean;
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
  const prefix = "data:image/svg+xml;charset=utf-8,";
  const drawn = guide.illustration;
  if (!drawn.src.startsWith(prefix)) return drawn;
  let xml = decodeURIComponent(drawn.src.slice(prefix.length));
  let height = drawn.height;
  const restored = options.header && drawn.header ? restoreHeader(xml, drawn.header) : null;
  if (restored) ({ svg: xml, height } = restored);
  const named = host && host !== "example.com" ? host : null;
  if (!restored && !named) return drawn;
  const customized = !named ? xml : xml.replace(/<text\b([^>]*data-pwa-domain="true"[^>]*)>example\.com<\/text>/g,
    (_, attributes: string) => {
      const maxWidth = Number(attributes.match(/data-domain-width="(\d+)"/)?.[1] ?? 140);
      const fitted = named.length * 8 > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : "";
      return `<text${attributes}${fitted}>${escapeXML(named)}</text>`;
    });
  return { ...drawn, height,
    src: prefix + encodeURIComponent(customized),
    alt: !named ? drawn.alt : `${drawn.alt} ${getLocaleUI(guide.language, options.localeData).website.replace("{host}", () => named)}`,
  };
}
