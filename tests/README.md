# E2E Tests (Playwright)

This directory contains end-to-end tests for VectorNest.

## Conventions

- Tests live in `tests/` using the `*.spec.ts` pattern.
- Shared utilities are in `tests/helpers.ts`.
- Test assets (for example SVG files) are kept in `tests/`.

## Run tests

From the project root:

```bash
# Start the dev server in a separate terminal first
bun run dev

# Run all E2E tests against the already-running dev server
bun run test:e2e

# Run a specific test file against the already-running dev server
PLAYWRIGHT_EXTERNAL_SERVER=1 bunx playwright test tests/file.spec.ts

# Run tests by name against the already-running dev server
PLAYWRIGHT_EXTERNAL_SERVER=1 bunx playwright test --grep "test name"

# Open Playwright UI mode for debugging
bun run test:ui

# Let Playwright manage its own webServer instead
bun run test:e2e:managed
```

## Server mode

Playwright is configured to use an already-running dev server by default.

- Default mode: external server (`PLAYWRIGHT_EXTERNAL_SERVER=1`)
- Opt-out mode: managed server (`PLAYWRIGHT_EXTERNAL_SERVER=0`)

This avoids starting a second Vite instance when the app is already running locally.

## Requirements

- Project dependencies installed.
- Playwright browsers installed (`bunx playwright install`).
- For the default E2E flow, a dev server running at `http://localhost:5173`.

## Best practices

- Keep tests independent and deterministic.
- Use descriptive names in `test` and `test.describe`.
- Reuse helpers to avoid duplication.
- Prefer stable selectors.
