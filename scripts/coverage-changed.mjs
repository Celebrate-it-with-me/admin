#!/usr/bin/env node
// Coverage of the NEW or MODIFIED lines of the current branch (owner policy: >= 95 %).
// Reads coverage/coverage-final.json (written by `npm run test:coverage`) and
// `git diff --unified=0 <base>...HEAD`. No dependencies.
//   COVERAGE_BASE       base ref for the diff (default origin/develop)
//   COVERAGE_THRESHOLD  minimum percentage (default 95)
//   COVERAGE_FILE       path to coverage-final.json (default coverage/coverage-final.json)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Parses `git diff --unified=0` into { file: Set<lineNumber> } with the added/modified lines of the new side. */
export function parseDiff(diffText) {
  const result = {}
  let file = null
  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim()
      file = p === '/dev/null' ? null : p.replace(/^b\//, '')
      if (file) result[file] ??= new Set()
    } else if (file && line.startsWith('@@')) {
      const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
      if (!m) continue
      const start = Number(m[1])
      const count = m[2] === undefined ? 1 : Number(m[2])
      for (let i = 0; i < count; i++) result[file].add(start + i)
    }
  }
  return result
}

/** From istanbul coverage-final.json: { file: { executable: Set, uncovered: Set } } keyed by the file path as written. */
export function lineCoverage(coverage) {
  const out = {}
  for (const [file, data] of Object.entries(coverage)) {
    const executable = new Set()
    const uncovered = new Set()
    for (const [id, loc] of Object.entries(data.statementMap)) {
      const line = loc.start.line
      executable.add(line)
      if (!data.s[id]) uncovered.add(line)
    }
    // a line with a statement hit but another statement starting on it not hit counts as uncovered (strict)
    out[file] = { executable, uncovered }
  }
  return out
}

function findCoverage(cov, diffFile) {
  const norm = (p) => p.replace(/\\/g, '/')
  const target = norm(diffFile)
  const key = Object.keys(cov).find((k) => norm(k) === target || norm(k).endsWith('/' + target))
  return key ? cov[key] : null
}

/** Computes per-file and total coverage of the changed lines. Files with no executable changed lines are ignored. */
export function computeChanged(diff, cov) {
  const files = []
  let covered = 0
  let total = 0
  for (const [file, lines] of Object.entries(diff)) {
    const fc = findCoverage(cov, file)
    if (!fc) continue
    const executable = [...lines].filter((l) => fc.executable.has(l)).sort((a, b) => a - b)
    if (executable.length === 0) continue
    const uncovered = executable.filter((l) => fc.uncovered.has(l))
    files.push({ file, total: executable.length, covered: executable.length - uncovered.length, uncovered })
    total += executable.length
    covered += executable.length - uncovered.length
  }
  return { files, total, covered, pct: total === 0 ? 100 : (covered / total) * 100 }
}

export function formatReport(res, threshold) {
  const rows = res.files.map((f) => {
    const pct = ((f.covered / f.total) * 100).toFixed(1).padStart(5)
    const miss = f.uncovered.length ? `  uncovered lines: ${f.uncovered.join(',')}` : ''
    return `${pct}%  ${f.covered}/${f.total}  ${f.file}${miss}`
  })
  const head = res.total === 0
    ? 'No executable changed lines: nothing to measure (100 %).'
    : `Changed-line coverage: ${res.pct.toFixed(2)} % (${res.covered}/${res.total}), threshold ${threshold} %`
  return [...rows, head].join('\n')
}

function main() {
  const base = process.env.COVERAGE_BASE || 'origin/develop'
  const threshold = Number(process.env.COVERAGE_THRESHOLD ?? 95)
  const file = process.env.COVERAGE_FILE || 'coverage/coverage-final.json'
  const diffText = execFileSync('git', ['diff', '--unified=0', '--no-color', `${base}...HEAD`, '--', 'src'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const cov = lineCoverage(JSON.parse(readFileSync(file, 'utf8')))
  const res = computeChanged(parseDiff(diffText), cov)
  console.log(formatReport(res, threshold))
  process.exit(res.pct < threshold ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
