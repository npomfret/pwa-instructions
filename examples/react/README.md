# React example

A client-only Vite app that imports `pwa-instructions/react` from the local package. It uses exactly the public API consumers will use after npm publication.

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL Vite prints. On desktop, choose **iPhone · Safari · Add to Home Screen**, to display its instructions immediately. On a supported iPhone Safari browser, automatic selection chooses that guide. Other choices preview Brave via Safari, iPhone Chrome, Mac Safari, Mac Chrome, Android Chrome, Windows Chrome, and Windows Edge. Safari 27 on Mac automatically selects Add to Dock; Chrome 156 or newer on Mac selects Install app. The text/image controls demonstrate the alternative presentations.

`npm run build` from the root builds the package and the example. The static site is `examples/react/dist/`; relative asset paths support GitHub project Pages. The Pages workflow publishes this directory.

The Website URL field demonstrates the React entry point's `siteUrl` prop. The demo starts with `your-domain.com`; leaving the field blank uses the package default, `example.com`. The configuration card ends before the guide heading and image, with a clear gap. The example switches guides without a reveal button.

The page contains preview controls, the rendered guide, and React/core code snippets. Snippets reflect the selected guide, domain and presentation so they can be copied into a consuming app.

The dropdown contains only the eight concrete guides. Browser detection selects the initial option; if no version-specific match is available, the demo previews the guide for that browser/device or falls back to the first guide. This preview choice does not change the core selector's compatibility rules.

The demo shows exactly what the component renders: the image and the numbered steps, nothing else. Android and Windows guides use current vendor menu labels without displaying unverified version numbers; they are documentation-only (`guide.versions.documentationOnly`).

The page-language and browser-language pickers (`locale` and `browserLocale`) list English, the en-US label variant, the 38 complete locales (es, fr, de, pt-BR, it, ja, ko, zh-Hans, nl, pl, sv, da, nb, fi, ru, uk, tr, cs, sk, hu, ro, hr, el, pt-PT, es-419, fr-CA, zh-Hant, zh-HK, id, ms, th, vi, hi, ca, he, ar, bg, sl) and the en-XA pseudo-locale. The complete locales load lazily from the published `pwa-instructions/locales/<tag>` modules, as a consuming app would. en-XA is a test locale and is not published: `npm run build:packages` writes its module to `examples/react/src/generated/` (gitignored). The checkbox turns on `illustrationHeader`.
