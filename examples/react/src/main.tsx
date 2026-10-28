import { useState } from "react";
import { createRoot } from "react-dom/client";
import { detectBrowserEnvironment, guides, selectGuide } from "@pwa-instructions/core";
import { InstallInstructions } from "@pwa-instructions/react";
import type { Presentation } from "@pwa-instructions/react";
import "./style.css";

function App() {
  const [guideId, setGuideId] = useState(() => {
    const environment = detectBrowserEnvironment();
    const match = selectGuide(environment).guide;
    const sameBrowser = guides.find(guide => environment && guide.platform === environment.platform &&
      guide.device === environment.device && guide.browser === environment.browser);
    return (match ?? sameBrowser ?? guides[0]).id;
  });
  const [siteUrl, setSiteUrl] = useState("https://your-domain.com");
  const [presentation, setPresentation] = useState<Presentation>("both");
  const componentSnippet = [
    'import { InstallInstructions } from "@pwa-instructions/react";',
    '',
    '<InstallInstructions',
    ...(guideId ? [`  guideId={${JSON.stringify(guideId)}}`] : []),
    `  siteUrl={${JSON.stringify(siteUrl)}}`,
    `  presentation="${presentation}"`,
    '  fallback={<p>No instructions for this browser yet.</p>}',
    '/>',
  ].join("\n");
  const coreSnippet = [
    'import { detectBrowserEnvironment, getIllustration, selectGuide }',
    '  from "@pwa-instructions/core";',
    '',
    `const selection = selectGuide(detectBrowserEnvironment()${guideId ? `, { guideId: ${JSON.stringify(guideId)} }` : ""});`,
    'if (selection.guide) {',
    '  const illustration = getIllustration(selection.guide, {',
    `    siteUrl: ${JSON.stringify(siteUrl)},`,
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
        <label className="field-label site-url-label" htmlFor="site-url">Website URL (optional)</label>
        <input id="site-url" className="site-url-input" type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://example.com" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} />
        <div className="display-options" role="group" aria-label="Instruction format">
              {([["both", "Image + text"], ["text", "Text only"], ["image", "Image only"]] as const).map(([value, label]) =>
                <button key={value} type="button" aria-pressed={presentation === value} onClick={() => setPresentation(value)}>{label}</button>)}
        </div>
      </section>
      <div className="guide-output" id="instructions">
        <InstallInstructions guideId={guideId} siteUrl={siteUrl} presentation={presentation} className="installation-guide"
          fallback={<p className="empty-state">No instructions available.</p>} />
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
