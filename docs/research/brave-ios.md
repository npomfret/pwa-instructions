# Brave on iPhone: Home Screen installation

Research checked 28 October 2026.

## Finding

For the Brave flow observed by the source owner, use **Open in Safari**, then follow the Safari installation guide. Do not reuse the Safari guide as if Brave exposes the same installation actions directly.

This is a browser-support distinction. Apple has allowed third-party browsers to offer Add to Home Screen since iOS 16.4. WebKit documents the conditions, including supplying the displayed WKWebView to the native share controller. [WebKit: third-party browser support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/#third-party-browser-support-for-add-to-home-screen).

Brave developer Kyle Hickinson explained on 12 March 2026 that adding this feature had been blocked because standalone web apps run outside Brave and lose its ad blocking and privacy protections. That explains the missing Brave implementation rather than an Apple rule reserving installation for Safari. [Developer explanation on Brave Community](https://community.brave.app/t/add-to-home-screen-as-pwa-standalone-web-app-on-ios/650126/10).

The mainline Brave share-sheet implementation inspected during this research supplies print information, a print renderer and a URL or URL provider, without the WKWebView required by WebKit's documented integration. This is consistent with the missing action. It is a source-code inference, not verification of every released Brave version. [Brave ShareExtensionHelper.swift](https://github.com/brave/brave-core/blob/master/ios/brave-ios/Sources/Brave/Frontend/Share/ShareExtensionHelper.swift).

## Device observation

The owner reports that Brave exposes Share after tapping the address bar, with one fewer browser-menu step than Safari. Its native-looking share sheet has **Open in Safari**, but no **Add to Home Screen**. The owner subsequently supplied three reference screenshots and identified Brave 1.97 on iOS 27. They are stored in [the Brave reference set](../../source-images/ios-27/brave-1/iphone/metadata.json).

A shared iOS sheet does not imply that every browser supplies the same actions.

## Practical route

1. In Brave, open the website's share menu.
2. Tap **Open in Safari**, as available on the owner's device. If unavailable, copy the website address and open it in Safari.
3. In Safari, follow the [illustrated installation guide](../../guides/ios/safari/iphone/layout-1/instructions.md).
4. Finish the confirmation screen. Apple's current guide says to enable **Open as Web App**, then tap **Add**. [Apple's iPhone instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27).

This route installs the web app through Safari. It does not preserve Brave Shields in the installed standalone app.

The runtime catalog now contains a [seven-step Brave guide](../../guides/ios/brave/iphone/layout-1/metadata.json). Its browser transition is explicit and the Safari steps are reused after it. The guide requires sufficient version information for automatic matching; manual selection works when Brave obscures its identity. Chrome has a separate, directly installable guide based on its own screenshots.
