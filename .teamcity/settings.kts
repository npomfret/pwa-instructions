import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.schedule
import jetbrains.buildServer.configs.kotlin.triggers.vcs

/*
 * TeamCity settings for pwa-instructions, on ci.snowmonkey.co.uk.
 *
 * The estate's TeamCity (three shared agents on macstudio.local, macOS/arm64) and the house
 * recipe this follows are documented once for every project on the server:
 * https://github.com/npomfret/snowmonkey-proxy-common/blob/main/docs/TEAMCITY-AGENTS.md
 *
 * What runs here is what `npm run check` runs, split into legs: the package and example build
 * (which runs the locale checks first), the example's typecheck, a check that the committed
 * English guides match what the build generates, and the `node --test` suite. Nothing reaches
 * the network, a database or a container.
 *
 * Measured 2026-10-29 on a developer Mac (Node 26.12.1): check:static 1.1s; test:ci 3.8s,
 * 123 tests, which the JUnit report holds as 1 suite of 123. The first build's
 * `report processed: N suites, M tests` line should say the same.
 *
 * Deliberately NOT covered, so nobody reads a green light as more than it is:
 *   - the deployed example site: GitHub Actions builds and publishes it to GitHub Pages
 *   - publishing to npm, which is a manual `npm run release`
 *   - any real browser: the React tests render into jsdom
 */

version = "2026.1"

// Everything except files the build never reads. Both markdown rules are needed: `**/*.md`
// does not match a file at the repository root. The generated guides/**/instructions.md are
// .md too, but they only change when their sources do, and those sources trigger the build.
val onlyWhatCanChangeTheVerdict = """
    +:**
    -:tasks/**
    -:docs/**
    -:.claude/**
    -:.codex/**
    -:.idea/**
    -:**/*.md
    -:*.md
""".trimIndent()

// No agent requirement: the agents report no capability that honestly means "has Node 22.12",
// and a build no agent accepts sits in the queue looking like an outage. The first step asserts
// the toolchain instead and fails in seconds. `maxRunningBuilds = 1` because `npm ci` rebuilds
// node_modules in the checkout; two runs of one configuration must not share that tree.
//
// Each leg owns its directory, by name rather than the VCS-settings hash the legs would otherwise
// share. It is emptied before checkout, so ignored leftovers such as dist/ or test-reports/ cannot
// reach a build, and removed once the build ends, however it ends. `PublishMode.ALWAYS` because the
// default skips stopped builds, whose reports would then go with the directory.
// Nothing here is a cache: node_modules comes from `npm ci` on every run.
fun BuildType.checkoutAndInstall(workspace: String) {
    maxRunningBuilds = 1
    publishArtifacts = PublishMode.ALWAYS
    params {
        // The shared Mac's account-wide temp dir is used by every project on it.
        param("env.TMPDIR", "%system.teamcity.build.tempDir%")
        param("system.teamcity.build.checkoutDir.expireHours", "0")
    }
    vcs {
        root(DslContext.settingsRoot)
        checkoutDir = workspace
        cleanCheckout = true
    }
    steps {
        script {
            name = "toolchain"
            scriptContent = """
                set -eu
                command -v node >/dev/null 2>&1 || { echo "this agent has no 'node' on PATH; pwa-instructions needs Node 22.12 or newer." >&2; exit 1; }
                node -e 'const [a, b] = process.versions.node.split(".").map(Number); if (a < 22 || (a === 22 && b < 12)) { console.error("pwa-instructions needs Node 22.12 or newer; this agent has " + process.versions.node); process.exit(1); }'
                echo "node ${'$'}(node --version), npm ${'$'}(npm --version)"
            """.trimIndent()
        }
        script {
            name = "install"
            // `npm ci`: exactly the lockfile, and fails if it disagrees with package.json.
            scriptContent = "npm ci"
        }
    }
}

val staticChecks = BuildType {
    id("StaticChecks")
    name = "Static Checks"
    description = "Locale checks, package and example build, example typecheck, and committed " +
        "English guides up to date. No tests."
    checkoutAndInstall("pwa-instructions-static-checks")
    steps {
        script {
            name = "static checks"
            scriptContent = "npm run check:static"
        }
    }
    failureConditions {
        executionTimeoutMin = 5
    }
}

val unitTests = BuildType {
    id("UnitTests")
    name = "Unit Tests"
    description = "The node --test suite, serially, against the built package."
    checkoutAndInstall("pwa-instructions-unit-tests")
    steps {
        script {
            name = "unit tests"
            scriptContent = "npm run test:ci"
        }
    }
    // The raw report outlives the console log, and is what to read when the Tests tab and the
    // runner's own totals disagree.
    artifactRules = "test-reports/junit.xml => test-reports"
    features {
        // `node --test` writes bare <testcase> elements; scripts/junit-wrap.mjs nests them so
        // this records them. Check the log's `report processed: N suites, M tests` against the
        // runner's own `# tests` total, not just that a report was found.
        feature {
            type = "xml-report-plugin"
            param("xmlReportParsing.reportType", "junit")
            param("xmlReportParsing.reportDirs", "+:test-reports/junit.xml")
            param("xmlReportParsing.verboseOutput", "true")
        }
    }
    failureConditions {
        executionTimeoutMin = 5
    }
}

val allChecks = BuildType {
    id("AllChecks")
    name = "All Checks"
    description = "Runs nothing itself: one answer to 'did this commit pass'."
    type = BuildTypeSettings.Type.COMPOSITE
    vcs {
        root(DslContext.settingsRoot)
        showDependenciesChanges = true
    }
    dependencies {
        snapshot(staticChecks) { onDependencyFailure = FailureAction.ADD_PROBLEM }
        snapshot(unitTests) { onDependencyFailure = FailureAction.ADD_PROBLEM }
    }
    triggers {
        // Triggers live only here; the composite pulls its legs in.
        vcs {
            branchFilter = "+:<default>"
            triggerRules = onlyWhatCanChangeTheVerdict
        }
        schedule {
            // A green build only proves the code passed against that day's world. 23:00 is an
            // hour no other project on the server uses.
            schedulingPolicy = daily {
                hour = 23
                timezone = "Europe/London"
            }
            branchFilter = "+:<default>"
            triggerBuild = always()
            withPendingChangesOnly = false
            // Without these the legs' previous runs satisfy the dependencies on an unchanged repo
            // and the nightly runs nothing.
            enforceCleanCheckout = true
            enforceCleanCheckoutForDependencies = true
        }
    }
}

// TEMPORARY, removed once the evidence is recorded. Each run confirms the exact revision, checks
// every seed by path, because a clean `git status` cannot see inside .git, then seeds the workspace
// again. The .git seed is what separates emptying the directory from `git clean` and a reset.
// Pinned to one agent, or a later run could land on an agent that never saw the seed and prove
// nothing.
//   ProbeControl: nothing cleans, so every seed must survive. Without this the other two could
//   pass only because nothing was ever left to find. Lists the sibling directories, which shows
//   whether ProbeBuildCleanup's has gone without waiting for that probe's own next run.
//   ProbeCleanCheckout: only the emptying before checkout acts, so a survivor shows it failed.
//   ProbeBuildCleanup: only the removal after a build acts, so a survivor shows it failed. Run 2
//   fails on purpose and run 3 is stopped by the execution timeout. The report it publishes shows
//   whether a build's evidence leaves before the directory goes.
fun workspaceProbe(
    probeId: String,
    probeName: String,
    clean: Boolean,
    expireHours: String,
    seedSurvives: Boolean,
    endsBadly: Boolean,
) = BuildType {
    id(probeId)
    name = probeName
    maxRunningBuilds = 1
    publishArtifacts = PublishMode.ALWAYS
    artifactRules = "test-reports/junit.xml => probe-evidence"
    vcs {
        root(DslContext.settingsRoot)
        checkoutDir = "pwa-instructions-" + probeId.lowercase()
        cleanCheckout = clean
    }
    params {
        param("system.teamcity.build.checkoutDir.expireHours", expireHours)
    }
    requirements {
        equals("teamcity.agent.name", "macstudio-3")
    }
    val ending = if (endsBadly) {
        "case %build.counter% in " +
            "2) echo 'PROBE controlled failure'; exit 1 ;; " +
            "3) echo 'PROBE waiting for the execution timeout'; sleep 150 ;; " +
            "esac"
    } else {
        ""
    }
    steps {
        script {
            name = "probe"
            scriptContent = """
                set -eu
                echo "PROBE run=%build.counter% agent=%teamcity.agent.name%"
                test "${'$'}(git rev-parse HEAD)" = "%build.vcs.number%"
                echo "PROBE exact revision %build.vcs.number%"
                echo "PROBE workspaces: ${'$'}(ls -d ../pwa-instructions-* | tr '\n' ' ')"
                wrong=0
                for f in .git/probe-sentinel probe-sentinel.txt dist/stale.js node_modules/.stale test-reports/junit.xml tmp/stale.log; do
                    if [ -e "${'$'}f" ]; then found=yes; else found=no; fi
                    echo "PROBE ${'$'}f found=${'$'}found"
                    if [ %build.counter% -gt 1 ] && [ "$seedSurvives" = "true" ]; then
                        if [ "${'$'}found" = "no" ]; then wrong=1; fi
                    elif [ "${'$'}found" = "yes" ]; then
                        wrong=1
                    fi
                done
                if [ "${'$'}wrong" = "1" ]; then echo "PROBE UNEXPECTED"; exit 3; fi
                echo "PROBE as expected"
                mkdir -p dist node_modules test-reports tmp
                echo stale > .git/probe-sentinel
                echo stale > probe-sentinel.txt
                echo stale > dist/stale.js
                echo stale > node_modules/.stale
                echo '<testsuites/>' > test-reports/junit.xml
                echo stale > tmp/stale.log
                echo "PROBE seeded"
                $ending
            """.trimIndent()
        }
    }
    triggers {
        schedule {
            schedulingPolicy = cron {
                seconds = "0"
                minutes = "*/3"
                hours = "*"
                dayOfMonth = "*"
                month = "*"
                dayOfWeek = "?"
            }
            branchFilter = "+:<default>"
            triggerBuild = always()
            withPendingChangesOnly = false
        }
    }
    failureConditions {
        executionTimeoutMin = 1
    }
}

project {
    description = "Illustrated PWA install guides: an npm package and its React example. " +
        "Static checks and unit tests on every push to main, and nightly."

    // The server's default keeps everything forever on a disk shared with the public sites.
    cleanup {
        baseRule {
            artifacts(days = 7)
            history(days = 30)
        }
    }

    buildType(staticChecks)
    buildType(unitTests)
    buildType(allChecks)
    buildType(workspaceProbe("ProbeControl", "Probe: control", false, "1", true, false))
    buildType(workspaceProbe("ProbeCleanCheckout", "Probe: clean checkout", true, "1", false, false))
    buildType(workspaceProbe("ProbeBuildCleanup", "Probe: build cleanup", false, "0", false, true))
}
