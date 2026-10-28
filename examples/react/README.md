# React example

A client-only Vite app that imports the local React package. It uses exactly the public API consumers will use after npm publication.

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL Vite prints. On desktop, choose **iPhone · Safari · Page Menu**, to display its instructions immediately. On a supported iPhone Safari browser, automatic selection chooses that guide. Other choices preview Brave via Safari, Chrome, and Mac Safari. Safari 27 on Mac automatically selects Add to Dock. The text/image controls demonstrate the alternative presentations.

`npm run build` from the root builds the packages and the example. The static site is `examples/react/dist/`; relative asset paths support GitHub project Pages. The Pages workflow publishes this directory.

The Website URL field demonstrates the React package's `siteUrl` prop. The demo starts with `your-domain.com`; leaving the field blank uses the package default, `example.com`. The configuration card ends before the guide heading and image, with a clear gap. The example switches guides without a reveal button.
