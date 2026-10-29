import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { detectBrowserEnvironment, guides, selectGuide } from "pwa-instructions";
import type { LocaleData } from "pwa-instructions";
import { InstallInstructions } from "pwa-instructions/react";
import type { Presentation } from "pwa-instructions/react";
import "./style.css";

// The English module (which carries the en-US labels) and the eight complete locales are the published
// "pwa-instructions/locales/<tag>" modules. en-XA, the test pseudo-locale, is generated for this demo only (npm run
// build:packages writes it to src/generated/, which is not committed or published).
type Loader = () => Promise<{ default: LocaleData }>;
const pseudo = import.meta.glob<{ default: LocaleData }>("./generated/locales/*.ts");
const loaders: Record<string, Loader> = {
  en: () => import("pwa-instructions/locales/en"),
  es: () => import("pwa-instructions/locales/es"),
  fr: () => import("pwa-instructions/locales/fr"),
  de: () => import("pwa-instructions/locales/de"),
  "pt-BR": () => import("pwa-instructions/locales/pt-BR"),
  it: () => import("pwa-instructions/locales/it"),
  ja: () => import("pwa-instructions/locales/ja"),
  ko: () => import("pwa-instructions/locales/ko"),
  "zh-Hans": () => import("pwa-instructions/locales/zh-Hans"),
};
for (const [file, load] of Object.entries(pseudo)) loaders[/([^/]+)\.ts$/.exec(file)![1]] = load;

const TAGS = ["en", "en-US", "es", "fr", "de", "pt-BR", "it", "ja", "ko", "zh-Hans", "en-XA"];
const SPECIAL: Record<string, string> = { en: "English (British, the default)", "en-US": "English (US labels)", "en-XA": "Pseudo-locale (en-XA, for testing)" };
const nameOf = (tag: string) => SPECIAL[tag] ?? `${new Intl.DisplayNames(["en"], { type: "language" }).of(tag) ?? tag}`;

/** Locale data for the tags in use. English is always loaded: it carries the en-US labels and the templates for browserLocale. */
function useLocaleData(tags: string[]): Record<string, LocaleData> {
  const [data, setData] = useState<Record<string, LocaleData>>({});
  const key = tags.join(",");
  useEffect(() => {
    for (const tag of key.split(",")) {
      if (data[tag] || !loaders[tag]) continue;
      void loaders[tag]().then(module => setData(current => ({ ...current, [tag]: module.default })));
    }
  }, [key, data]);
  return data;
}

function LocaleSelect({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children?: ReactNode }) {
  return <>
    <label className="field-label site-url-label" htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)}>
      {children}
      {TAGS.map(tag => <option key={tag} value={tag}>{nameOf(tag)}</option>)}
    </select>
  </>;
}

function App() {
  const [guideId, setGuideId] = useState(() => {
    const environment = detectBrowserEnvironment();
    const match = selectGuide(environment).guide;
    const sameBrowser = guides.find(guide => environment && guide.platform === environment.platform &&
      guide.device === environment.device && guide.browser === environment.browser);
    return (match ?? sameBrowser ?? guides[0]).id;
  });
  const [siteUrl, setSiteUrl] = useState("https://your-domain.com");
  const [locale, setLocale] = useState("en");
  // "" means the browser's language is the page's.
  const [browser, setBrowser] = useState("");
  const [header, setHeader] = useState(false);
  const localeData = useLocaleData(["en", locale, browser].filter(Boolean));
  const browserLocale = browser || undefined;
  // The component renders the image and the steps; this page adds its own title and closing sentence from the guide data.
  const guide = selectGuide(null, { guideId, locale, browserLocale, localeData }).guide;
  const [presentation, setPresentation] = useState<Presentation>("both");
  const componentSnippet = [
    'import { InstallInstructions } from "pwa-instructions/react";',
    '',
    '<InstallInstructions',
    ...(guideId ? [`  guideId={${JSON.stringify(guideId)}}`] : []),
    `  siteUrl={${JSON.stringify(siteUrl)}}`,
    ...(locale === "en" ? [] : [`  locale=${JSON.stringify(locale)}`]),
    ...(browserLocale ? [`  browserLocale=${JSON.stringify(browserLocale)}`] : []),
    ...(header ? ["  illustrationHeader"] : []),
    `  presentation="${presentation}"`,
    '  fallback={<p>No instructions for this browser yet.</p>}',
    '/>',
  ].join("\n");
  const coreSnippet = [
    'import { detectBrowserEnvironment, getIllustration, selectGuide }',
    '  from "pwa-instructions";',
    '',
    `const selection = selectGuide(detectBrowserEnvironment()${guideId ? `, { guideId: ${JSON.stringify(guideId)} }` : ""});`,
    'if (selection.guide) {',
    '  const illustration = getIllustration(selection.guide, {',
    `    siteUrl: ${JSON.stringify(siteUrl)},`,
    ...(header ? ["    header: true,"] : []),
    '  });',
    '  // Use illustration.src and selection.guide.steps in your own UI.',
    '}',
  ].join("\n");
  return <>
    <header className="site-header">
      <a className="wordmark" href="./"><span className="logo" aria-hidden="true">↗</span> PWA Instructions</a>
      <a href="https://github.com/npomfret/pwa-instructions">GitHub <span aria-hidden="true">↗</span></a>
    </header>
    <main>
      <section className="demo" aria-label="Guide preview controls">
        <label className="field-label" htmlFor="guide">Choose a guide</label>
        <select id="guide" value={guideId} onChange={event => setGuideId(event.target.value)}>
          {guides.map(guide => <option key={guide.id} value={guide.id}>{guide.label}</option>)}
        </select>
        <LocaleSelect id="locale" label="Page language (locale)" value={locale} onChange={setLocale} />
        <LocaleSelect id="browser-locale" label="Browser language (browserLocale)" value={browser} onChange={setBrowser}>
          <option value="">Same as the page language</option>
        </LocaleSelect>
        <label className="field-label site-url-label" htmlFor="site-url">Website URL (optional)</label>
        <input id="site-url" className="site-url-input" type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://example.com" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} />
        <div className="display-options" role="group" aria-label="Instruction format">
          {([["both", "Image + text"], ["text", "Text only"], ["image", "Image only"]] as const).map(([value, label]) =>
            <button key={value} type="button" aria-pressed={presentation === value} onClick={() => setPresentation(value)}>{label}</button>)}
        </div>
        <label className="toggle"><input type="checkbox" checked={header} onChange={event => setHeader(event.target.checked)} /> Show the heading and subtitle
          in the image (<code>illustrationHeader</code>)</label>
      </section>
      <div className="guide-output" id="instructions">
        {guide && <h2>{guide.title}</h2>}
        <InstallInstructions guideId={guideId} siteUrl={siteUrl} locale={locale} browserLocale={browserLocale} localeData={localeData}
          illustrationHeader={header} presentation={presentation} className="installation-guide"
          fallback={<p className="empty-state">No instructions available.</p>} />
        {guide && presentation !== "image" && <p>{guide.completion}</p>}
      </div>
      <section className="integration" aria-label="Integration code">
        <h2>React</h2>
        <pre><code>{componentSnippet}</code></pre>
        <h2>Core API</h2>
        <pre><code>{coreSnippet}</code></pre>
      </section>
    </main>
    <footer><p>Open source · MIT licensed</p><p><a href="https://github.com/npomfret/pwa-instructions/tree/main/examples/react">View example source ↗</a></p></footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<App />);
