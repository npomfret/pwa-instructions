# PWA Instructions

An open-source collection of instructions for adding web apps to a Home Screen, supported by generic, low-detail SVG illustrations showing which buttons to tap.

Installation controls vary between operating systems, browsers and versions. This project collects real examples, records their platform and browser versions, and turns distinct installation flows into reusable text and artwork. The illustrations should be neutral enough to fit into any app.

## Initial scope

Start with iPhone Safari on iOS 27 and Safari 27, as reported by the source owner. Record major versions only. Collect other browsers, operating systems and historical layouts as examples become available. App integration and automatic guide selection will be worked out later.

## Source images

Keep original references under `source-images/<os>-<major>/<browser>-<major>/<device>/`, alongside a `metadata.json` describing the versions, evidence and ordered steps.

The first set is [iOS 27 / Safari 27 / iPhone](source-images/ios-27/safari-27/iphone/metadata.json):

1. Open the Page Menu beside the website address.
2. Tap Share.
3. Tap View More in the collapsed share sheet.
4. Tap Add to Home Screen.

The supplied screenshots stop before the final confirmation screen. The version tags are user-reported observations, not a claim that this layout applies to every release or configuration.

These originals contain app branding and share-sheet contacts. They are source references; reusable illustrations should omit personal content and branding.

## Reusable instructions and artwork

Create one simple SVG showing the numbered steps of each distinct installation flow, accompanied by a complete text guide with matching step numbers. Reuse an existing flow across versions when the controls have not changed; add a new variant when an important button or sequence changes.

Separate browser-specific actions from shared operating-system actions. In the supplied flow, Page Menu and Share are Safari steps; View More and Add to Home Screen belong to the iOS share sheet. The owner reports that Brave reaches those same final two controls through different browser steps. Future guides should be able to share those iOS instructions and illustrations.

The initial guide has one [four-step SVG](guides/ios-safari-page-menu/install.svg) and matching [text instructions](guides/ios-safari-page-menu/instructions.md). [Guide metadata](guides/ios-safari-page-menu/guide.json) maps each text step to its panel in the SVG; `catalog.json` indexes the guide. The confirmation screen is not yet illustrated. Shared-step composition, version matching and app integration are not implemented yet.

## License

Project code, authored instructions and SVG artwork are available under the [MIT License](LICENSE). Source screenshots are reference material and may contain third-party content.
