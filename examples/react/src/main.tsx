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
  const [open, setOpen] = useState(false);
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
        <select id="guide" value={guideId} onChange={event => { setGuideId(event.target.value); setOpen(false); }}>
          <option value="">Use my browser · {browserLabel}</option>
          {guides.map(guide => <option key={guide.id} value={guide.id}>iPhone · Safari · Page Menu</option>)}
        </select>
        <p className="selection-note">{guideId ? "Preview this guide on any device." : selection.guide ? "An iPhone Safari guide is available for your browser." : "The first guide covers iPhone Safari. Select it above to preview on any device."}</p>
        <button className="primary-button" type="button" aria-expanded={open} aria-controls="instructions" onClick={() => setOpen(!open)}>
          {open ? "Hide installation steps" : "Show installation steps"}<span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <div id="instructions" hidden={!open}>
          {open && <>
            <div className="display-options" role="group" aria-label="Instruction format">
              {([["both", "Image + text"], ["text", "Text only"], ["image", "Image only"]] as const).map(([value, label]) =>
                <button key={value} type="button" aria-pressed={presentation === value} onClick={() => setPresentation(value)}>{label}</button>)}
            </div>
            <InstallInstructions environment={environment} guideId={guideId || undefined} presentation={presentation} className="installation-guide"
              fallback={<div className="empty-state"><h3>{selection.status === "installed" ? "Already on your Home Screen" : "More guides are on the way"}</h3><p>{selection.status === "installed" ? "This app is running in standalone mode." : "We do not have a matching guide for this browser yet. Choose iPhone · Safari above to try the example."}</p></div>} />
          </>}
        </div>
      </section>
      <div className="notes"><p><strong>One illustration. Every step in text.</strong><br />Read it, look at it, or use both.</p><p><strong>Small pieces. Your interface.</strong><br />Shared data, with React as the first adapter.</p></div>
    </main>
    <footer><p>Open source · MIT licensed</p><p><a href="https://github.com/npomfret/pwa-instructions/tree/main/examples/react">View example source ↗</a></p></footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<App />);
