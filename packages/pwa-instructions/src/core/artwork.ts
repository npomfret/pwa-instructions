import { fitText, fontOf } from "./fit.js";

export const escapeXML = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

// Label nodes are always flat `<text>` elements that the build tagged `data-i18n="label:id"`, and `<text>` never nests.
// Substituting on the SVG string keeps one code path on the server and in the browser; DOMParser does not exist
// during SSR, and a parser dependency would be more than this needs.
const LABEL_NODE = /<text\b([^>]*?)\sdata-i18n="label:([a-z0-9-]+)"([^>]*)>[\s\S]*?<\/text>/g;

const attribute = (attributes: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(attributes)?.[1];

/**
 * Replace the text of every `label:*` node in `svg` with `labels(id)`, fitted the way the build fits it (src/core/fit.js):
 * wrapped onto `data-lines` lines, else squeezed to `data-max-width` with textLength. A label `labels` does not know
 * is left as drawn. The tags stay, so the result can be substituted again.
 */
export function substituteLabels(svg: string, labels: (id: string) => string | undefined): string {
  return svg.replace(LABEL_NODE, (node, before: string, id: string, after: string) => {
    const text = labels(id);
    if (text === undefined) return node;
    const attributes = `${before} data-i18n="label:${id}"${after}`.replace(/\s(?:textLength|lengthAdjust)="[^"]*"/g, "");
    const max = Number(attribute(attributes, "data-max-width")) || 0;
    const lines = Number(attribute(attributes, "data-lines")) || 1;
    const fit = fitText([{ text }], { ...fontOf(attribute(attributes, "class") ?? ""), max, lines });
    if (fit.lines.length > 1) {
      const x = attribute(attributes, "x") ?? "0";
      const lineHeight = Number(attribute(attributes, "data-line-height")) || 0;
      const body = fit.lines.map((line, index) =>
        `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXML(line.map(item => item.text).join(""))}</tspan>`).join("");
      return `<text${attributes}>${body}</text>`;
    }
    const squeeze = fit.squeeze ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "";
    return `<text${attributes}${squeeze}>${escapeXML(text)}</text>`;
  });
}

const PREFIX = "data:image/svg+xml;charset=utf-8,";

/** Apply `substituteLabels` to an SVG data URL; any other source is returned as it is. */
export function substituteLabelsInSource(src: string, labels: (id: string) => string | undefined): string {
  if (!src.startsWith(PREFIX)) return src;
  return PREFIX + encodeURIComponent(substituteLabels(decodeURIComponent(src.slice(PREFIX.length)), labels));
}
