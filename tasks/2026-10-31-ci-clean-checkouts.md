# CI builds must start from a clean, empty checkout

Project: `pwa-instructions`. Requested by Nick on 31 October 2026. Status: complete.

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

- [x] Inventory every CI build/leg and its checkout and output directories.
- [x] Apply clean checkout isolation and explicit cache/artifact handling.
  Live from `9b226f3`: the server reports `cleanBuild = true`, the named
  directories, `publishArtifactCondition = ALWAYS` and `expireHours = 0`.
  `Static Checks` #7 (id 20914) and `Unit Tests` #7 (id 20915, 170 tests) passed
  there, and #7 published `test-reports/junit.xml`.
- [x] Verify freshness and cleanup serially; record build IDs and evidence.
- [x] Record each justified exception with its build/path, reason, retained
  state and freshness/isolation controls, or record why no exception is needed.
  No exception is needed: the retained state above sits outside the checkouts.

## Evidence

Temporary probes on `macstudio-1` at `98cd4c75`, one agent so that later runs
saw what earlier runs left. Each confirmed the exact revision, then seeded six
paths: `.git/probe-sentinel`, `probe-sentinel.txt`, `dist/stale.js`,
`node_modules/.stale`, `test-reports/junit.xml` and `tmp/stale.log`.

| Probe | Builds | Result |
|---|---|---|
| `ProbeControl`: nothing cleans | 22402, 22547, 22578, 22581 | Runs 2 to 4 found all six seeds, so a survivor is detectable |
| `ProbeCleanCheckout`: emptying only | 22403, 22549, 22583 | Runs 2 and 3 found none, including the `.git` seed, so the directory is emptied, not `git clean`ed |
| `ProbeBuildCleanup`: removal only | 22401 success, 22548 controlled failure, 22579 execution timeout, 22582 success | Runs 2, 3 and 4 found none, so the directory goes after success, failure and timeout. All four published `probe-evidence/junit.xml` |

Real legs at `98cd4c75`: `All Checks` #9 (22336), `Static Checks` #9 (22334) and
`Unit Tests` #9 (22335, 170 tests). GitHub Actions run 41250505911 passed there.

Not covered: a cancellation by hand. The execution timeout stands in for it.
Whether the kept probe directories on `macstudio-1` have gone was not checked;
`expireHours = 1` applied to them while the probes existed.

Keep paused builds paused. Creating this task does not change CI settings,
delete build data or claim the requirement is already satisfied.
