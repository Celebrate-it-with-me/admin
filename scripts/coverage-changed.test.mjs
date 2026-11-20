import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDiff, lineCoverage, computeChanged, formatReport } from './coverage-changed.mjs'

const diff = [
  'diff --git a/src/a.ts b/src/a.ts',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,0 +2,3 @@',
  '+x',
  '@@ -9 +12 @@',
  '+y',
  'diff --git a/src/gone.ts b/src/gone.ts',
  '--- a/src/gone.ts',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  'diff --git a/src/types.ts b/src/types.ts',
  '--- a/src/types.ts',
  '+++ b/src/types.ts',
  '@@ -0,0 +1 @@',
  '+export type T = 1',
].join('\n')

const stmt = (line) => ({ start: { line }, end: { line } })
const cov = {
  '/app/src/a.ts': { statementMap: { 0: stmt(2), 1: stmt(3), 2: stmt(12), 3: stmt(50) }, s: { 0: 1, 1: 0, 2: 0, 3: 0 } },
  '/app/src/types.ts': { statementMap: {}, s: {} },
}

test('parseDiff collects added lines, handles counts, single lines and deletions', () => {
  const d = parseDiff(diff)
  assert.deepEqual([...d['src/a.ts']], [2, 3, 4, 12])
  assert.equal(d['src/gone.ts'], undefined)
})

test('computeChanged counts only executable changed lines and lists uncovered ones', () => {
  const r = computeChanged(parseDiff(diff), lineCoverage(cov))
  assert.equal(r.total, 3) // lines 2, 3, 12 (4 is not executable; line 50 is not changed)
  assert.equal(r.covered, 1)
  assert.deepEqual(r.files[0].uncovered, [3, 12])
  assert.equal(r.files.length, 1) // types.ts has no executable code: ignored
  assert.ok(Math.abs(r.pct - 33.333) < 0.01)
})

test('no executable changes means 100 %', () => {
  const r = computeChanged(parseDiff(diff), lineCoverage({}))
  assert.equal(r.pct, 100)
  assert.match(formatReport(r, 95), /nothing to measure/)
})

test('report mentions uncovered lines and the threshold', () => {
  const r = computeChanged(parseDiff(diff), lineCoverage(cov))
  const out = formatReport(r, 95)
  assert.match(out, /uncovered lines: 3,12/)
  assert.match(out, /threshold 95 %/)
})

test('a line with any unhit statement is uncovered', () => {
  const c = lineCoverage({ 'src/b.ts': { statementMap: { 0: stmt(1), 1: stmt(1) }, s: { 0: 1, 1: 0 } } })
  assert.equal(c['src/b.ts'].uncovered.has(1), true)
})
