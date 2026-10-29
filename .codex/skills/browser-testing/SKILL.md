---
name: browser-testing
description: >-
  The required rules for every test that drives a browser in this project:
  Playwright specs, Playwright component tests, Vitest browser mode, their
  page objects, fixtures, network stubs and config. Load this before writing,
  changing, fixing or reviewing any of them, before adding a test for a UI
  change or bug fix, and whenever a browser test is flaky or times out.
  Covers why tests never touch the page - finding, acting on, reading and
  asserting on elements happens only in page objects - finding an element
  the way a person does, by narrowing from a heading, label or title into
  its section and never by HTML attributes, every locator matching exactly
  one element with no first(), last() or nth(), why no change is
  instant so every check polls with a retrying assertion and never sleeps,
  never deciding on a snapshot read, actions that wait for their own effect
  and return the page object for where the user lands so tests never new one
  up,
  asserting state before and after, never forcing a click or retrying a side
  effect, page objects full of sanity checks so failures name the real
  cause and say what the page showed, stubbing at the network,
  and treating a flaky test as a failing one.
---

## Browser testing

This standard covers every test that drives a real browser: Playwright against the running app, Playwright component tests and Vitest browser mode.

The model is wl-bill-splitter's `packages/test-support/src/page-objects`. Every rule below is something that suite does, apart from the exceptions it still carries; those are named under "Not the model".

The rules are shared with the iOS UI testing standard, so a rule has the same number on both platforms. They come first. "On the web" then names, rule by rule, the browser APIs each one forbids and the ones to use instead.

### Why

- **No duplication in tests.** How to reach and drive a part of the screen is written once, in its page object. Twenty tests that open the same dialog call one method; they do not each repeat its lookups and waits.
- **Screens can be refactored without breaking tests.** When layout, markup or a component changes, the fix is one edit in one page object. The tests, which state what a user does and expects, do not change at all.
- **Tests behave like a person.** A person picks what to tap or click by what they can see and read: a button's label, a heading, a field's name. They never look at ids, classes or other attributes they cannot see. They find the right section of the screen first, then look inside it. Tests find elements the same way, so they pass when the screen works for a person, and fail when it does not.
- **A person waits to see what happened.** After an action, a person watches for the screen to respond before doing the next thing: the dialog opens, the row appears, the spinner goes. They do not carry on blindly, assuming the screen has already updated. A modern interface renders, fetches and animates on its own schedule, so a test that assumes an action took effect instantly fails at random. Every action in a page object therefore waits for its own visible result, and every check polls until the expected state appears.

Each rule below serves one or more of these.

### The rules

These are strict. A test or page object that breaks one is wrong, whatever the comment beside it says. Each rule is stated here for every platform; the platform section after them names the APIs it forbids and the ones to use instead, under the same number.

1. **Tests never touch the screen. Page objects do.** This rule is what keeps tests free of duplication and lets the screen be refactored without touching them.
   - Every page, screen, modal, dialog, sheet, menu and shared region has one page-object class, kept in one shared place.
   - All access to elements on the screen happens inside a page object: finding them, acting on them, reading them and asserting on them.
   - Forbidden in a test: any element lookup or handle, any action on an element, any read of an element, and any assertion on one.
   - A test may only:
     - arrange data, fixtures and stubs
     - call page-object methods
     - assert on values a page-object method returned
   - When a test needs something that no page object offers, add a method to the page object. Never reach past it.
   - A test reads as a sequence of user steps.

2. **Find elements the way a person does: narrow down from what is on screen.**
   - A person does not scan the whole screen for a button. They find the right part of the screen by something they can read: a heading, a label, a dialog's title, a row's text. Then they look only inside that part, and repeat until they reach the thing they want.
   - A lookup does the same. It starts at a container a person would recognise, then narrows inside it one perceivable step at a time.
   - Every step uses only what a person can perceive, which is also what assistive technology reads out: the kind of control and its accessible name, a field's label, visible text, an image's description.
   - Never search the whole screen for something that appears in more than one place. "The Delete button" is ambiguous to a person too. Say which section it is in.
   - An icon-only control is found by its accessible name, which is also what a screen reader announces.
   - Tests run in the source locale and write its words literally, so a missing or wrong message fails.
   - If no perceivable step reaches an element, the interface is at fault. Typically a section has a heading but is not a labelled container, or a control has no label. Fix the interface, not the test.
   - Never find an element by anything a person cannot see: ids, test identifiers, class or type names, other attributes, tree structure such as "the parent of", or component internals.
   - **A lookup matches exactly one element. Never pick the first, last or nth of several matches, with no exceptions.**
     - The test framework refuses to act on an ambiguous match, or can be made to. That error is the test telling you the lookup is ambiguous. Taking the first match silences it and picks one arbitrarily. Today that may be the right element; after the next render, sort or data change it will be another, and the test passes or fails for reasons nobody can see.
     - When a lookup matches more than one element, narrow it further by what a person can see: the section, the row's text, the label. If nothing perceivable tells the matches apart, the screen has a defect, such as two identical unlabelled controls. Fix the screen.
     - A list is checked as a whole, by its count or by its full contents in order. Never pick out items by position.
   - A test-only identifier is allowed only inside a page object, with a comment saying why no perceivable step can find that element.
   - Each lookup is a page-object member that queries the screen afresh every time it is used. Never keep a value read from the screen, such as a text, a count or a visibility result, to act on later. The screen re-renders in between.

3. **No change is instant. Poll for it.** A person waits to see the result of what they did, and so does a test.
   - After any action, the screen changes later, never immediately. This covers a tap or click, a keystroke, navigation, a stub swap, a rotation and a server push.
   - Every check of a result therefore polls until the expected state appears, or until a named timeout fails it. A check that reads once, right after the action, is wrong even when it passes.
   - This applies to absence as well. "Gone" is polled, never assumed.
   - A fixed delay of any kind is forbidden, with no exceptions.
   - A fixed delay always stands in for something you can observe: focus moved, an animation settled, a request answered, a row appeared. Wait for that thing instead.

4. **Never make a decision on a snapshot.**
   - A one-off read of an element (is it visible, how many are there, what does it say) returns whatever was on screen at that millisecond.
   - Never branch on one, and never assert one with a plain equality check.
   - One-off reads are allowed in one place only: building the message after a polling assertion has already failed.
   - Assert what the user perceives: visible text, the kind of control, states such as checked, expanded, selected and disabled, where focus is, and the requests the app sent. Never assert styling, internal state or snapshots of the element tree.

5. **Every action waits for its own effect, then hands over the page object for wherever the user ended up.** A person does not act again until the screen has responded, and then carries on from where they landed.
   - Before acting, assert the target is visible and enabled. A failure then says "Save was disabled" rather than "timed out tapping".
   - After acting, wait for the result, and return the page object for where the user now is:
     - An action that moves to another screen waits for that screen's `verifyLoaded()`, then returns its page object.
     - An action that opens a modal, sheet or dialog asserts it is open, then returns its page object.
     - An action that closes one waits for it to close, then returns the page object for the screen underneath.
     - A save waits for the visible result, such as the confirmation, the closed dialog or the updated row.
   - **Tests never construct a page object themselves.** The only way into the flow is one static entry point per starting screen, or a fixture built on it, which opens the app there, verifies the screen and returns its page object. Every page object after that is handed over by the action that led there, already verified.
   - This is why it matters:
     - The test follows the user's path, and cannot hold a page object for a screen the app is not showing.
     - Each transition is verified once, in the page object, instead of in every test.
     - When the flow changes, for example login now lands on onboarding, the method's return type changes and the compiler names every test the change affects.
   - Name methods by their outcome: `loginAndOpenDashboard()` returns the dashboard's page object; `loginExpectingError(message)` stays on the screen, asserts the error and returns nothing.
   - An action-only variant that returns nothing is allowed only where the user stays on the same screen.
   - Every page object has a `verifyLoaded()` that asserts the landmarks only its screen shows. Constructors never wait.

6. **Assert the state before the action, not just after it.**
   - Before a create, assert the item is absent. Before a delete, assert it is present. Before an update, assert the old value.
   - A test that checks only the end state passes on leftover data, and it passes when the action did nothing.

7. **Never force an action, and never retry one that has a side effect.**
   - Act as a user does, through real input events: tap, click, type, swipe, press keys. Never call handlers or app code directly to get past a control.
   - Forcing an action skips the checks that catch overlays, disabled controls and elements that are not on screen: exactly the bugs these tests exist for.
   - If a real tap, click or keystroke does not take, the app has a defect, such as a handler attached late or a field that drops input. Fix the app.
   - While a fix is pending, an idempotent pair may be retried as a unit, such as opening a menu and asserting it is open.
   - Never retry a submit, create or delete. Retrying it repeats the action.

8. **Page objects are full of sanity checks, so a failure names its real cause.**
   - A page object checks its assumptions at every step, not only at the end. Put them everywhere:
     - At the start of every method, check that the page object's own screen or modal is still showing.
     - Before acting, check that the target is visible and enabled.
     - Before filling, check that the field holds the old value. After filling, check that it holds the new one.
     - Before submitting, check that no validation error is showing.
     - After moving to another screen, call its `verifyLoaded()`.
   - Without these checks, the real cause shows up much later as a timeout on something unrelated. The modal closed, the session expired or an error appeared, and the test reports "Save button not found" three steps on. A sanity check fails at the first wrong step, and says which step it was.
   - They cost almost nothing. A polling assertion passes at once when the state is right, so add them freely. Repetition is fine here, because it lives in page objects and never in tests.
   - A sanity check is a polling assertion like any other (rule 4). It is never an `if` on a one-off read.
   - A check that fails says what the screen showed instead. For example: "Group 'Rent' did not appear within 5s; visible groups: [Food, Travel]". Or it names the screen that is showing and the error message on it.
   - Timeouts are named constants in one file, by kind: navigation, element, modal.
   - Raising a timeout never fixes a flaky test.

9. **Stub at the boundary, before the app asks.**
   - Replace what lies outside the app (the network, and on a device the system services) at its boundary. Never mock the project's own components, hooks, view models or modules.
   - Stub bodies are typed or validated by the client's own models or schemas, so they cannot drift from the contract. Test data comes from builders.
   - Register stubs before the app asks for the data: before navigation, or before launch.
   - To simulate a server change partway through a test:
     1. Replace the stub.
     2. Trigger the event the app listens for.
     3. Wait for the screen to show the change.

10. **A flaky test is a failing test.**
    - Run with automatic retries off.
    - A test that passed on a second attempt is broken, and the cause is one of the rules above.
    - After fixing a timing failure, run the test repeatedly, for example twenty times, and report the count that passed.

### Departing from these rules

There is no departure from rules 3, 4 and 7. Any other departure needs a comment at the site that says:

- which rule it breaks
- why the compliant form cannot work there
- what would remove the need for it

Anything else is a violation, and a review fixes it.

### On the web

1. **Tests never touch the page.**
   - Every page, modal, dialog, dropdown and shared region (header, footer, toasts) has one page-object class.
   - Forbidden in a test file:
     - any selector, and any `Locator`
     - `page.locator`, `page.getBy…`, `page.$`, `page.$$`, `page.evaluate`
     - acting on an element: `click`, `fill`, `type`, `press`, `check`, `selectOption`, `hover`, `page.keyboard`, `page.mouse`
     - reading an element: `textContent`, `innerText`, `inputValue`, `getAttribute`, `isVisible`, `count`
     - `expect(locator)` in any form
   - A test may also assert the URL, with `expect(page).toHaveURL()`.

2. **Find elements by narrowing.**
   - A locator starts at a container a person would recognise, then narrows inside it:

     ```ts
     // the "Rent" expense, inside the "Expenses" section, then its Delete button
     this.page.getByRole('region', { name: 'Expenses' })
       .getByRole('listitem').filter({ hasText: 'Rent' })
       .getByRole('button', { name: 'Delete' })

     // a dialog by its title, then a field by its label
     this.page.getByRole('dialog', { name: 'Edit group' }).getByLabel('Group name')

     // a section with no landmark role, found by the heading inside it
     this.page.getByRole('article').filter({ has: this.page.getByRole('heading', { name: 'Balances' }) })
     ```
   - Each step uses, in this order:
     1. role and accessible name: `getByRole`
     2. label text: `getByLabel`
     3. placeholder: `getByPlaceholder`
     4. visible text: `getByText`, `filter({ hasText })`
     5. alt text: `getByAltText`
   - An icon-only control is found by its accessible name, which is also its tooltip: `getByRole('button', { name: 'Delete' })`.
   - A section with a heading but no name is fixed in the markup, for example with a `<section aria-labelledby>` for that heading.
   - Never use CSS selectors, class names, ids, other HTML attributes, XPath or DOM structure (`locator('..')`, child combinators).
   - **Never use `first()`, `last()` or `nth()`.** Playwright refuses to act on or assert against a locator that matches several elements (a strict mode violation). That error is the ambiguity rule 2 describes, and `first()` is how it gets silenced.
   - A list is checked whole: `expect(rows).toHaveCount(3)`, or `expect(rows).toHaveText(['Food', 'Rent', 'Travel'])` when order matters.
   - A `data-testid` is allowed only inside a page object, with the comment rule 2 asks for.
   - Each locator is a protected method on the page object that builds a fresh `Locator` every time it is called. Never keep an element handle, a text value, a count or an `isVisible()` result.

3. **Poll with retrying assertions.**
   - `waitForTimeout`, `sleep`, a `setTimeout` promise and `waitForLoadState('networkidle')` are forbidden, with no exceptions.
   - Wait with assertions that retry: `expect(locator).toBeVisible()`, `toHaveText()`, `toHaveValue()`, `toBeEnabled()`, `toBeFocused()`, `toHaveURL()`.
   - "Gone" is `not.toBeVisible()` or `toHaveCount(0)`.
   - For a value that is not on a locator, use `expect.poll()`.

4. **Snapshot reads.**
   - `isVisible()`, `count()`, `textContent()`, `inputValue()` and `allTextContents()` are one-off reads. Never branch on one, and never assert one with a plain `expect(value)`.
   - Never assert class names, computed styles or markup snapshots.

5. **Hand over the next page object.**
   - A click that navigates waits for the URL and for the destination's `verifyLoaded()`, then returns the destination's page object.
   - Tests never construct a page object with `new`. The entry point is a static `navigateTo(page)`, or a fixture built on it, which goes to the page, verifies it and returns its page object:

     ```ts
     const login = await LoginPage.navigateTo(page)
     const dashboard = await login.loginAndOpenDashboard(email, password)
     const group = await dashboard.openGroup('Flat 3')
     const expense = await group.clickAddExpenseAndOpenForm()
     ```
   - `verifyLoaded()` asserts the URL as well as the landmarks only that page shows.

7. **Never force.**
   - Act through real browser events: `click`, `fill`, `hover`, `press`, tabbing.
   - `force: true` and `dispatchEvent` are forbidden. They skip Playwright's actionability checks.
   - While a fix is pending, an idempotent pair may be retried with `expect(async () => { … }).toPass()`. Never wrap a submit, create or delete in `toPass`.

8. **Sanity checks.**
   - wl-bill-splitter's `ExpenseFormPage.sanityCheck()` is the pattern: it asserts the form is still open before each step.
   - A check that fails catches the assertion error and rethrows one that says what the page showed, with the current URL when it matters.

9. **Stub at the network.**
   - Replace the API at the request boundary, with Mock Service Worker handlers or Playwright's `page.route`.
   - Register stubs before navigation.

10. **Flaky is failing.**
    - Run with `retries: 0`.
    - After a timing fix, run with `--repeat-each=20` and report the count that passed.

### Not the model

wl-bill-splitter still carries a few workarounds. Do not copy them:

- `pressEscapeToClose` waits 150 ms for a focus trap. It should wait for focus to land inside the dialog (`toBeFocused`).
- `dragElementTo` dispatches drag events instead of dragging.
- `fillPreactInput` retries typing in a loop. It hides a controlled-input defect that rule 7 says to fix.
- `.first()`, `.last()` and `.nth()`, used over a hundred times in its page objects.
- `new SomePage(page)` in test bodies: over 900 times across 87 test files. Its page objects already offer methods that return the next page object; its tests do not always use them.
- `locator('..')` to step from a landmark to its parent, which its testing guide allows. A person cannot see a parent element; make the section a labelled region instead.
- Text found through the translation object (`translation.loginPage.title`) instead of written literally. A wrong English message then passes.

*Generated from `npomfret/agent-standards`. Edit the standard there, not this copy.*
