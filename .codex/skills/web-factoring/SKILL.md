---
name: web-factoring
description: Project conventions for shared browser UI, client logic, styles and text. Read before implementing or refactoring components, hooks, stores, styles or user-facing browser behavior.
---

## Web factoring

Keep shared browser behavior and design decisions in shared homes. Features compose those pieces. Visual design guidance chooses the look; these conventions govern its implementation.

### Design and components

- Put visual values in one token layer: color, typography, spacing, sizes, breakpoints, borders, radii, elevation, effects and motion. Features use semantic roles, not raw palette values or arbitrary utility values. Script and styles read the same definitions; themes change the roles rather than branching feature code.
- Keep reduced-motion treatment in that layer. Use inline styles only for runtime values. Intrinsic geometry that cannot be a token needs a brief reason beside it. Remove tokens with their last consumer.
- Give controls, icons, fields, overlays, containers, notices, collections and loading/error states shared primitives from first use. Third-party UI libraries stay behind those primitives.
- Primitives own their markup, styling, interaction states and accessibility. Callers supply content and domain choices. Use meaningful named variants, not CSS-value props, boolean combinations or class/style escape hatches for primitive-owned internals.
- Parents own spacing between siblings. Size a primitive through its own supported custom property rather than descendant selectors. Route/page files compose rather than define reusable UI.
- A reskin should change tokens, icons and primitives, not require edits throughout feature code.

### Patterns to avoid

- Token fallbacks, raw visual literals outside tokens, or fading secondary text with opacity.
- Copying a component, style block or hook and editing the copy.
- Restyling shared internals with `!important`, descendant selectors or caller class/style overrides; nesting a primitive inside another of its own kind.
- Div-based controls, tables or lists; semantic elements whose display/role hides their meaning; ARIA references to elements that are not rendered.
- Translated sentences assembled from fragments, or assertions/`any` that silence missing type evidence.

### Shared application behavior

Give each concern one owner: API transport, resource loading/cache/invalidation, input schemas, formatting, routes/URL state, errors, logging/analytics, permissions, browser storage, keyboard/focus, text catalogues and test stubs. Consumers use or extend that owner rather than repeat its logic.

- The API boundary owns authentication, timeouts, retries, error translation and response validation. Components do not call fetch/vendor SDKs directly.
- Each resource has one loading/cache owner that discards stale responses. Share domain rules with the server; browser validation is feedback, not authority.
- Keep pure calculations, transforms, validation and constants in plain modules; effects and subscriptions in hooks/stores. Templates render prepared values and wire named handlers. Test pure logic without rendering.

### Controls, accessibility and text

- Use one established icon library through the shared icon module. Keep an existing maintained library; use Lucide when none exists. Do not mix libraries, hand-draw feature icons or substitute emoji/text glyphs.
- Prefer recognizable icons for familiar actions. Use words when needed to explain a primary, destructive or costly action. Icon-only controls require an accessible name and matching tooltip.
- Primitives supply hover, focus, pressed and disabled states, pointer cursors and complete WAI-ARIA keyboard behavior. Tooltips open on hover/focus, close on Escape and contain no interactive or uniquely necessary content. An explanatory disabled control remains focusable with aria-disabled.
- Keep roles and rendered ARIA targets consistent. Name horizontally scrolling regions. Meet minimum touch targets and WCAG AA contrast (4.5:1 text; 3:1 large text), measuring composited colors. Announce loading and failure states.
- Put user-visible/heard strings in a message catalogue, including accessible names, errors and notifications. Use one translation module; keep an existing maintained solution or use FormatJS/ICU. IDs name meaning, messages are whole sentences with named placeholders and plural/select rules, and values use locale formatting.
- Allow translated text to grow by at least a third; avoid fixed text dimensions or truncating the only label. Do not put words in images/CSS glyphs. Preserve user-entered text; server display text must be localized by the server or represented by a catalogue code.

### Types

Use meaningful types for IDs, units and domain values, literal unions for finite choices, and discriminated unions for state. Parse unknown input into validated domain types at boundaries and use exhaustive switches. Prefer strict toolchain checks, including unchecked-index and optional-property checks. Named exported component props derive from domain types where appropriate. Do not weaken checks to land a change without recording the concrete constraint.

### Reuse and verification

- Search the web package and relevant server/shared modules by behavior and rendered structure before building another implementation. Extend the canonical version. If the existing design cannot serve the request, explain that decision rather than copy it.
- Extract other repeated structure on its second real use; do not build abstractions for hypothetical callers. Keep unrelated refactors outside the task.
- When introducing a shared replacement, migrate its existing callers and remove the superseded code in the same change. Include loading, empty, error and mobile paths. Check whether differences were deliberate, then search for leftovers.
- Test rendering in a real browser, following the browser-testing skill. Move existing DOM-emulation tests as separate planned work; add no new emulated UI tests. The first new component test establishes the browser runner when needed.
- A behavior/visual-neutral refactor needs runtime evidence: compare affected computed styles at phone/desktop widths, use deterministic screenshots where possible, and compare both versions for broad changes. State actual differences and unverified states.

Other than the avoid-list, these are defaults. A departure records the verified constraint where it occurs (or in the project's library/runner decision). Repeated departures should improve the shared implementation. Report the reuse, removals and verification that matter to the change.

*Generated from `npomfret/agent-standards`. Edit the standard there, not this copy.*
