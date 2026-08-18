#!/usr/bin/env node
/**
 * Generates Unit Test Record entries from real Vitest results.
 *
 * Usage:
 *   npm run test:record
 *
 * Runs the suite with Vitest's JSON reporter and converts the result into the
 * seven-field card format used by SkinBuddy_Test_Record. Every card reflects a
 * test that actually executed - nothing here is hand-written, so the document
 * cannot drift from the suite.
 *
 * Two fields cannot come from the runner:
 *   - Module / Feature / Prerequisite: taken from SPEC_MAP below, an explicit
 *     table keyed by spec file. Same approach as the backend's
 *     tools/generate_test_record.py.
 *   - Method Under Test: taken from the second-level describe() block, which is
 *     authored deliberately for this purpose (see the spec files).
 *
 * IDs use the placeholder prefix UTC-FE- because the existing document runs
 * UTC-01..35 and the backend generator emits from UTC-36. The project owner
 * intends to renumber by hand, so this must not claim numbers unilaterally.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Forward slashes deliberately: Vitest's --outputFile does not accept a
// backslash-separated Windows path and silently writes nothing.
const RAW_RESULT = join(ROOT, 'node_modules', '.tmp-test-record.json').split('\\').join('/')
const OUT_FILE = join(ROOT, 'docs', 'FRONTEND_TEST_RECORD.md')

const ID_PREFIX = 'UTC-FE'

/**
 * Explicit spec-file -> unit mapping. Order here is the order of the document.
 * `note` is emitted as a caveat under the group header when present.
 */
const SPEC_MAP = [
  {
    file: 'src/__tests__/stores/quizStore.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'stores/quizStore',
    prerequisite: 'Fresh Pinia instance per test. No mocks required - the store is pure client-side state.',
  },
  {
    file: 'src/__tests__/api/quizapi.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'api/quizapi',
    prerequisite: 'Shared axios client (src/api/index.ts) replaced with a mock. No network access.',
  },
  {
    file: 'src/__tests__/stores/shelfStore.spec.ts',
    feature: '#3 Skincare storage',
    module: 'stores/shelfStore',
    prerequisite: 'Fresh Pinia instance per test. src/api/shelfapi.ts replaced with a mock. No network access.',
  },
  {
    file: 'src/__tests__/api/shelfapi.spec.ts',
    feature: '#3 Skincare storage',
    module: 'api/shelfapi',
    prerequisite: 'Shared axios client (src/api/index.ts) replaced with a mock. No network access.',
  },
  {
    file: 'src/__tests__/api/products.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/products',
    prerequisite:
      'Both HTTP paths mocked: the shared axios client and the bare axios call used for anonymous requests. localStorage cleared per test so the token branch is controlled. No network access.',
  },
  {
    file: 'src/__tests__/router/guard.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'router/guard',
    prerequisite:
      'No router instance and no components - resolveNavigation is a pure function over the target route and the auth state, called directly with plain objects.',
    note: 'Guards the skin profile page. Without it the page renders a substitute skin type\'s real routine and actives for a user who has never been classified.',
  },
  {
    file: 'src/__tests__/stores/auth.spec.ts',
    feature: '#1 Authentication (supplementary)',
    module: 'stores/auth',
    prerequisite: 'Fresh Pinia instance and cleared localStorage per test. No network access.',
    note: 'Feature #1 already has hand-written entries and the owner scoped regeneration to Features #2, #3 and #4. These cards are supplementary - do not overwrite the existing Feature #1 entries without the owner deciding to adopt them.',
  },
  {
    file: 'src/__tests__/api/authApi.spec.ts',
    feature: '#1 Authentication (supplementary)',
    module: 'api/authApi',
    prerequisite: 'Global fetch stubbed and the shared axios client mocked. No network access.',
    note: 'exchangeLineCode() is currently unreferenced by application code - nothing in src/ calls it, and authentication runs through the LINE redirect flow in AuthCallbackView. It is covered because the Test Record documents it; the document should not imply the app exercises this path.',
  },
]

function runSuite() {
  mkdirSync(dirname(RAW_RESULT), { recursive: true })
  rmSync(RAW_RESULT, { force: true })

  // Invoke Vitest's own entry with the current node binary rather than going
  // through `npx`: on Windows that resolves to npx.cmd, which Node refuses to
  // execFile without a shell.
  const vitestBin = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')
  try {
    execFileSync(
      process.execPath,
      [vitestBin, 'run', '--reporter=json', `--outputFile=${RAW_RESULT}`],
      { cwd: ROOT, stdio: 'inherit' },
    )
  } catch {
    // A non-zero exit means failing tests, and Vitest still writes the results.
    // A failed case must appear in the document as F rather than vanishing, so
    // carry on - but only if the results file actually exists (below).
    console.warn('\n[test-record] Suite reported failures - they will be recorded as F.\n')
  }

  if (!existsSync(RAW_RESULT)) {
    throw new Error(
      `Vitest produced no results at ${RAW_RESULT}. The suite could not be run, so no ` +
        `record was generated - refusing to emit a document with no evidence behind it.`,
    )
  }
  return JSON.parse(readFileSync(RAW_RESULT, 'utf8'))
}

/** Group a file's assertions by their second-level describe (the method under test). */
function groupByMethod(assertions) {
  const groups = new Map()
  for (const a of assertions) {
    const method = a.ancestorTitles[1] ?? a.ancestorTitles[0] ?? '(ungrouped)'
    if (!groups.has(method)) groups.set(method, [])
    groups.get(method).push(a)
  }
  return groups
}

const escapePipes = (s) => String(s).replace(/\|/g, '\\|')

function actualOutput(a, specFile) {
  const id = `${specFile} > ${a.fullName}`
  if (a.status === 'passed') {
    return `Executed and passed in ${a.duration?.toFixed(1) ?? '0'}ms. All assertions in \`${id}\` held.`
  }
  if (a.status === 'failed') {
    const first = (a.failureMessages?.[0] ?? 'no message').split('\n')[0]
    return `Executed and FAILED. \`${id}\` - ${first}`
    }
  return `Not executed (status: ${a.status}). \`${id}\``
}

function build(result) {
  const byFile = new Map()
  for (const tr of result.testResults) {
    byFile.set(relative(ROOT, tr.name).split('\\').join('/'), tr.assertionResults)
  }

  const lines = []
  lines.push('# Frontend Unit Test Record (generated)')
  lines.push('')
  lines.push(
    '> **Generated file - do not edit by hand.** Produced by `tools/generate-test-record.mjs`',
  )
  lines.push('> from real Vitest output. Regenerate with `npm run test:record`.')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  // testResults is one entry per spec file; numTotalTestSuites counts describe
  // blocks, which reads as a misleadingly large "suite" count.
  lines.push(
    `**Result: ${result.numPassedTests}/${result.numTotalTests} passed** across ${result.testResults.length} spec files.`,
  )
  lines.push('')
  lines.push('## Reproducibility')
  lines.push('')
  lines.push(
    'No test in this suite performs network access. Every API module is replaced with a mock, so results are deterministic and repeatable on any machine, with or without a running backend. Each card names the exact Vitest test id so any single case can be re-run.',
  )
  lines.push('')
  lines.push('## ID numbering')
  lines.push('')
  lines.push(
    `IDs use the placeholder prefix \`${ID_PREFIX}-\`. The existing document runs UTC-01 to UTC-35 and the backend generator emits from UTC-36. **Agree a real range with the project owner before renumbering** - these must not collide with backend-generated groups.`,
  )
  lines.push('')

  let groupNo = 0
  let currentFeature = null

  for (const spec of SPEC_MAP) {
    const assertions = byFile.get(spec.file)
    if (!assertions) {
      console.warn(`[test-record] No results for ${spec.file} - skipping.`)
      continue
    }

    if (spec.feature !== currentFeature) {
      currentFeature = spec.feature
      lines.push('---')
      lines.push('')
      lines.push(`# Feature ${spec.feature}`)
      lines.push('')
    }

    for (const [method, cases] of groupByMethod(assertions)) {
      groupNo += 1
      const groupId = `${ID_PREFIX}-${String(groupNo).padStart(2, '0')}`

      lines.push(`## ${groupId}`)
      lines.push('')
      lines.push(`**Module:** \`${spec.module}\`  `)
      lines.push(`**Method Under Test:** \`${method}\`  `)
      lines.push(`**Spec file:** \`${spec.file}\`  `)
      lines.push(`**Prerequisite data:** ${spec.prerequisite}`)
      if (spec.note) {
        lines.push('')
        lines.push(`> **Note:** ${spec.note}`)
      }
      lines.push('')
      lines.push('| ID | Method Under Test | Prerequisite / Mock Setup | Input / Test Data | Expected Unit Output | Actual Unit Output | P/F |')
      lines.push('|---|---|---|---|---|---|---|')

      cases.forEach((a, i) => {
        const caseId = `${groupId}-TC-${String(i + 1).padStart(2, '0')}`
        const pf = a.status === 'passed' ? 'P' : a.status === 'failed' ? 'F' : '-'
        lines.push(
          [
            caseId,
            `\`${escapePipes(method)}\``,
            escapePipes(spec.prerequisite),
            `\`${escapePipes(a.fullName)}\``,
            escapePipes(a.title),
            escapePipes(actualOutput(a, spec.file)),
            pf,
          ].join(' | '),
        )
        lines[lines.length - 1] = `| ${lines[lines.length - 1]} |`
      })

      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('## Field derivation')
  lines.push('')
  lines.push('| Field | Source |')
  lines.push('|---|---|')
  lines.push('| ID | Assigned sequentially by the generator |')
  lines.push('| Method Under Test | The second-level `describe()` block in the spec |')
  lines.push('| Prerequisite / Mock Setup | `SPEC_MAP` in `tools/generate-test-record.mjs` |')
  lines.push('| Input / Test Data | The Vitest test id, which locates the exact inputs in the spec |')
  lines.push('| Expected Unit Output | The `it()` string, lifted verbatim |')
  lines.push('| Actual Unit Output | Observed run status and duration from the Vitest JSON reporter |')
  lines.push('| P/F | `passed` -> P, `failed` -> F |')
  lines.push('')

  return lines.join('\n')
}

const result = runSuite()
mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, build(result), 'utf8')
rmSync(RAW_RESULT, { force: true })

console.log(`\n[test-record] Wrote ${relative(ROOT, OUT_FILE)}`)
console.log(`[test-record] ${result.numPassedTests}/${result.numTotalTests} tests passed.`)
if (result.numFailedTests > 0) process.exitCode = 1
