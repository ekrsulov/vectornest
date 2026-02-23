# E2E Tests (Playwright)

This directory contains end-to-end tests for VectorNest.

## Conventions

- Tests live in `tests/` using the `*.spec.ts` pattern.
- Shared utilities are in `tests/helpers.ts`.
- Test assets (for example SVG files) are kept in `tests/`.

## Run tests

From the project root:

```bash
# Run all E2E tests
bunx playwright test

# Run a specific test file
bunx playwright test tests/file.spec.ts

# Run tests by name
bunx playwright test --grep "test name"

# Open Playwright UI mode for debugging
bun run test:ui
```

## Requirements

- Project dependencies installed.
- Playwright browsers installed (`bunx playwright install`).

## Best practices

- Keep tests independent and deterministic.
- Use descriptive names in `test` and `test.describe`.
- Reuse helpers to avoid duplication.
- Prefer stable selectors.
