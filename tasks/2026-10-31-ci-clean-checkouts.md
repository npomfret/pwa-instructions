# CI builds must start from a clean, empty checkout

Project: `pwa-instructions`. Requested by Nick on 31 October 2026. Status: open.

Ensure every CI build starts from an empty source directory before checking out
the exact requested revision, unless a specific, justified exception is recorded.
Follow the [shared acceptance criteria](../../snowmonkey-proxy-common/tasks/2026-10-31-ci-clean-checkouts.md#shared-acceptance-criteria).

Local CI entry points found: `.teamcity`, `.github/workflows`. Include server-managed builds and inherited templates in the inventory too.

## Inventory

From the live server (`teamcity.py settings`, 31 October), `.teamcity/settings.kts`
and `.github/workflows/pages.yml`. TeamCity project `PwaInstructions` is owned by
versioned settings (`PREFER_VCS`). It has no templates, no paused builds and no
configurations beyond those below. There is no release job on either provider:
`npm run release` is manual and local.

| Build | Checkout before | Checkout now | Outputs |
|---|---|---|---|
| TeamCity `Static Checks` | Agent-side hash directory, shared with `Unit Tests`, reused; the VCS root cleans only on branch change, so only the nightly emptied it | `pwa-instructions-static-checks`, emptied before checkout, removed after the build | `node_modules/`, `dist/`, generated sources; nothing published |
| TeamCity `Unit Tests` | As `Static Checks` | `pwa-instructions-unit-tests`, emptied before checkout, removed after the build | `node_modules/`, `dist/`; `test-reports/junit.xml` parsed and published as an artifact |
| TeamCity `All Checks` | Composite, no checkout | Unchanged: not applicable | None |
| Actions `build` | `actions/checkout@v4` on a new GitHub-hosted VM | Unchanged: the VM starts empty and is discarded, and the checkout is the event's exact ref | `examples/react/dist`, uploaded as the declared Pages artifact |
| Actions `deploy` | No source checkout | Unchanged: not applicable | Deploys only the artifact declared by `build` |

Retained state, all outside the checkout: the agent's Git mirror (TeamCity-owned,
keyed by commit), npm's download cache on the agents (content-addressed, and
`npm ci` checks the lockfile's integrity hashes), and the Actions npm cache from
`setup-node` (keyed by the lockfile hash). None can supply a generated file or a
test result. There are no artifact dependencies between builds.

Temporary configurations `ProbeControl`, `ProbeCleanCheckout` and
`ProbeBuildCleanup` exist only to produce the evidence for this task and are
removed once it is recorded. `ProbeBuildCleanup` run 2 counts only if its log
shows `PROBE controlled failure`, and run 3 only if it shows the timeout: an
earlier `PROBE UNEXPECTED` exits before those lines, and `expireHours = 0` deletes
in the background while the agent is idle, so re-check a survivor before calling
it a failure.

- [x] Inventory every CI build/leg and its checkout and output directories.
- [ ] Apply clean checkout isolation and explicit cache/artifact handling.
  Written in `.teamcity/settings.kts`; not applied until it reaches `main`.
- [ ] Verify freshness and cleanup serially; record build IDs and evidence.
- [ ] Record each justified exception with its build/path, reason, retained
  state and freshness/isolation controls, or record why no exception is needed.

Keep paused builds paused. Creating this task does not change CI settings,
delete build data or claim the requirement is already satisfied.
