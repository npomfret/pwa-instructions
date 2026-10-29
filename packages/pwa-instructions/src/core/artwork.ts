import { fitMarkup, fitText, fontOf } from "./fit.js";
import type { Segment } from "./fit.js";

export const escapeXML = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

// Label nodes are always flat `<text>` elements that the build tagged `data-i18n="label:id"`, and `<text>` never nests.
// Substituting on the SVG string keeps one code path on the server and in the browser; DOMParser does not exist
// during SSR, and a parser dependency would be more than this needs.
const LABEL_NODE = /<text\b([^>]*?)\sdata-i18n="label:([a-z0-9-]+)"([^>]*)>[\s\S]*?<\/text>/g;
// A step title that names a control: `data-i18n="step"` with the fitting the build used, and an italic `<tspan>` tagged
// `label:id` for the control (one per line when it wrapped).
const TITLE_NODE = /<text\b([^>]*?\sdata-i18n="step"[^>]*)>([\s\S]*?)<\/text>/g;
const TITLE_PART = /<(\/?)tspan\b([^>]*)>|<[^>]*>|[^<]+/g;

const attribute = (attributes: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(attributes)?.[1];
const unescapeXML = (value: string) => value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"')
  .replaceAll("&apos;", "'").replaceAll("&amp;", "&");

/** `<text>` with `segments` fitted the way the build fits them (src/core/fit.js): wrapped onto `data-lines` lines, else squeezed to `data-max-width`. */
function drawText(attributes: string, segments: Segment[]): string {
  const clean = attributes.replace(/\s(?:textLength|lengthAdjust)="[^"]*"/g, "");
  const max = Number(attribute(clean, "data-max-width")) || 0;
  const lines = Number(attribute(clean, "data-lines")) || 1;
  const fit = fitText(segments, { ...fontOf(attribute(clean, "class") ?? ""), max, lines });
  const body = fitMarkup(fit, { x: attribute(clean, "x") ?? "0", lineHeight: Number(attribute(clean, "data-line-height")) || 0, escape: escapeXML });
  const squeeze = fit.squeeze ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "";
  return `<text${clean}${squeeze}>${body}</text>`;
}

/**
 * Replace the text of every `label:*` node in `svg` with `labels(id)`, fitted the way the build fits it, and the control
 * inside each step title that names one. A label `labels` does not know is left as drawn. The tags stay, so the result
 * can be substituted again.
 */
export function substituteLabels(svg: string, labels: (id: string) => string | undefined): string {
  return svg.replace(LABEL_NODE, (node, before: string, id: string, after: string) => {
    const text = labels(id);
    return text === undefined ? node : drawText(`${before} data-i18n="label:${id}"${after}`, [{ text }]);
  }).replace(TITLE_NODE, (node, attributes: string, body: string) => {
    // The words around the control are the page's, so they are read back from what is drawn and only the control is
    // replaced, rather than rebuilding the title from a template the artwork would have to carry as well.
    const parts: Segment[] = [];
    const open: (string | undefined)[] = [];
    for (const [part, closing, tspan] of body.matchAll(TITLE_PART)) {
      if (part.startsWith("<")) {
        if (tspan === undefined) continue;
        if (closing) open.pop(); else open.push(/data-i18n="label:([a-z0-9-]+)"/.exec(tspan)?.[1]);
      } else {
        const label = open.filter(item => item !== undefined).pop();
        parts.push({ text: unescapeXML(part), ...(label ? { italic: true, label } : {}) });
      }
    }
    const first = parts.findIndex(item => item.label);
    const last = parts.length - 1 - [...parts].reverse().findIndex(item => item.label);
    const id = parts[first]?.label;
    const text = id === undefined ? undefined : labels(id);
    if (id === undefined || text === undefined) return node;
    const join = (items: Segment[]) => items.map(item => item.text).join("");
    const segments = [{ text: join(parts.slice(0, first)) }, { text, italic: true, label: id }, { text: join(parts.slice(last + 1)) }];
    return drawText(attributes, segments.filter(item => item.text));
  });
}

const PREFIX = "data:image/svg+xml;charset=utf-8,";

/** Apply `substituteLabels` to an SVG data URL; any other source is returned as it is. */
export function substituteLabelsInSource(src: string, labels: (id: string) => string | undefined): string {
  if (!src.startsWith(PREFIX)) return src;
  return PREFIX + encodeURIComponent(substituteLabels(decodeURIComponent(src.slice(PREFIX.length)), labels));
}
