import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { detectBrowserEnvironment, guides, selectGuide } from "@pwa-instructions/core";
import type { Environment } from "@pwa-instructions/core";
import { InstallInstructions } from "@pwa-instructions/react";
import type { Presentation } from "@pwa-instructions/react";
import "./style.css";

function App() {
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [guideId, setGuideId] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://your-domain.com");
  const [presentation, setPresentation] = useState<Presentation>("both");
  useEffect(() => { setEnvironment(detectBrowserEnvironment()); }, []);
  const selection = selectGuide(environment, { guideId: guideId || undefined });
  const browserLabel = environment && environment.browser !== "unknown"
    ? `${environment.browser[0].toUpperCase()}${environment.browser.slice(1)}${environment.browserMajor ? ` ${environment.browserMajor}` : ""}`
    : "Your browser";
  return <>
    <header className="site-header">
      <a className="wordmark" href="./"><span className="logo" aria-hidden="true">↗</span> PWA Instructions</a>
      <a href="https://github.com/npomfret/pwa-instructions">GitHub <span aria-hidden="true">↗</span></a>
    </header>
    <main>
      <p className="eyebrow">THE REACT EXAMPLE</p>
      <h1>From browser<br />to Home Screen.</h1>
      <p className="intro">The right buttons, one step at a time. Simple illustrations and matching text, ready to use in your app.</p>
      <section className="demo" aria-labelledby="try-title">
        <div className="demo-heading"><span className="status-dot" aria-hidden="true" /><h2 id="try-title">Try the installation guide</h2></div>
        <label className="field-label" htmlFor="guide">Choose a guide</label>
        <select id="guide" value={guideId} onChange={event => setGuideId(event.target.value)}>
          <option value="">Use my browser · {browserLabel}</option>
          {guides.map(guide => <option key={guide.id} value={guide.id}>{guide.label}</option>)}
        </select>
        <p className="selection-note">{guideId ? "Preview this guide on any device." : selection.guide ? "An installation guide is available for your browser." : "No guide matches this browser yet. Choose one above to preview the instructions."}</p>
        <label className="field-label site-url-label" htmlFor="site-url">Website URL (optional)</label>
        <input id="site-url" className="site-url-input" type="text" inputMode="url" autoComplete="off" spellCheck={false}
          placeholder="https://example.com" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} aria-describedby="site-url-help" />
        <p id="site-url-help" className="selection-note">Show your domain in the illustration. Leave blank to use example.com.</p>
        <div className="display-options" role="group" aria-label="Instruction format">
              {([["both", "Image + text"], ["text", "Text only"], ["image", "Image only"]] as const).map(([value, label]) =>
                <button key={value} type="button" aria-pressed={presentation === value} onClick={() => setPresentation(value)}>{label}</button>)}
        </div>
      </section>
      <div className="guide-output" id="instructions">
        <InstallInstructions environment={environment} guideId={guideId || undefined} siteUrl={siteUrl} presentation={presentation} className="installation-guide"
              fallback={<div className="empty-state"><h3>{selection.status === "installed" ? "Already on your Home Screen" : "More guides are on the way"}</h3><p>{selection.status === "installed" ? "This app is running in standalone mode." : "We do not have a matching guide for this browser yet. Choose an iPhone or Mac guide above to preview it."}</p></div>} />
      </div>
    </main>
    <footer><p>Open source · MIT licensed</p><p><a href="https://github.com/npomfret/pwa-instructions/tree/main/examples/react">View example source ↗</a></p></footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<App />);
