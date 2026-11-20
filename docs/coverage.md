# Coverage in cwm_admin

Owner policy (AGENTS.md section 8, TASKS.md section 12): from v0.1.0 the new or modified code of every branch must have at least 95 % coverage. There is no global threshold yet; the baseline is below it, so the gate is on the changed lines only.

## Flow

```bash
# 1. Full suite with v8 coverage (heavy: use the queue, max 2 workers)
/home/hhcarmenate/cwm/scripts/heavy.sh docker exec cwm_admin npm run test:coverage
# 2. Coverage of the lines this branch adds or changes vs origin/develop (exit 1 under 95 %)
docker exec cwm_admin npm run test:coverage:changed
```

From a worktree, use `docker exec -w /app/.worktrees/<name> cwm_admin ...`. Run `git fetch` first so `origin/develop` is current.

## What is measured

- `vite.config.ts` (`test.coverage`): provider v8, `include: src/**/*.{ts,vue}` (files no test imports count as 0 %), reporters `text-summary`, `json-summary`, `json` and `lcov`. Excluded: tests, `src/test/**`, `__mocks__`, `*.d.ts`, `src/main.ts`, `src/plugins/**`, `src/assets/**`, `src/styles/**`.
- Output goes to `coverage/` (git-ignored): `coverage-final.json` (read by the changed-lines script), `coverage-summary.json`, `lcov.info` and `lcov-report/index.html`.
- `COVERAGE_ENFORCE=1` turns on global thresholds (`COVERAGE_THRESHOLD`, default 95) for the whole run. Off by default.
- With `--coverage` the test and hook timeouts are 30 s because v8 instrumentation slows the tests.

## Changed-lines check

`scripts/coverage-changed.mjs` (Node, no dependencies) reads `coverage/coverage-final.json` and `git diff --unified=0 origin/develop...HEAD -- src`, keeps the added or modified lines that hold executable statements, and prints the percentage per file and in total with the uncovered line numbers. A line counts as uncovered if any statement starting on it was not hit. Files with no executable changed lines (types, comments, excluded files) are ignored; with nothing to measure the result is 100 %.

| Variable | Default | Meaning |
|---|---|---|
| `COVERAGE_BASE` | `origin/develop` | Base ref of the diff |
| `COVERAGE_THRESHOLD` | `95` | Minimum percentage; exit 1 below it |
| `COVERAGE_FILE` | `coverage/coverage-final.json` | Coverage input |

Tests of the script itself: `npm run test:scripts` (node:test, fixtures inline).

## Dependencies

`vitest` and `@vitest/coverage-v8` are pinned to the same exact version (5.1.0); keep them in step when upgrading. After merging a change to either, restart the container (`docker restart cwm_admin`) so it reinstalls.
