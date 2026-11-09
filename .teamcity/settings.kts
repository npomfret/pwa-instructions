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
//
// Every step after the toolchain check keeps its whole console in ci-logs/<step>.log, and npm
// writes its debug logs beside them, so a failure can be read from the artifacts after the build
// log has gone. The clean checkout means a previous build's logs cannot be published.
val logRules = "ci-logs => logs"

fun logged(log: String, command: String) = """
    set -eu
    set -o pipefail
    mkdir -p ci-logs
    $command 2>&1 | tee ci-logs/$log.log
""".trimIndent()

fun BuildType.checkoutAndInstall(workspace: String) {
    maxRunningBuilds = 1
    publishArtifacts = PublishMode.ALWAYS
    params {
        // The shared Mac's account-wide temp dir is used by every project on it.
        param("env.TMPDIR", "%system.teamcity.build.tempDir%")
        param("system.teamcity.build.checkoutDir.expireHours", "0")
        param("env.npm_config_logs_dir", "%teamcity.build.checkoutDir%/ci-logs/npm")
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
            scriptContent = logged("install", "npm ci")
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
            scriptContent = logged("static-checks", "npm run check:static")
        }
    }
    // The console holds the build, typecheck and guide diff; the locale warnings are only in the file.
    artifactRules = """
        $logRules
        tmp/check-locales.log => logs
    """.trimIndent()
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
            scriptContent = logged("unit-tests", "npm run test:ci")
        }
    }
    // The raw report outlives the console log, and is what to read when the Tests tab and the
    // runner's own totals disagree.
    artifactRules = """
        test-reports/junit.xml => test-reports
        $logRules
    """.trimIndent()
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

project {
    description = "Illustrated PWA install guides: an npm package and its React example. " +
        "Static checks and unit tests on every push to main, and nightly."

    // The server's default keeps everything forever on a disk shared with the public sites.
    cleanup {
        baseRule {
            artifacts(days = 1)
            history(days = 30)
        }
    }

    buildType(staticChecks)
    buildType(unitTests)
    buildType(allChecks)
}
