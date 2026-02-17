# TTPE Playwright Tests

This directory contains end-to-end tests for the TTPE (Text-to-Path Editor) application using Playwright.

# TTPE Playwright Tests

This directory contains end-to-end tests for the TTPE (Text-to-Path Editor) application using Playwright.

## Test Structure

The tests cover the main functionalities of the application:

### Core Functionality
- **basic.spec.ts**: Basic application loading and mode switching
- **global_actions.spec.ts**: Global application actions and shortcuts

### Drawing Tools
- **pencil.spec.ts**: Pencil drawing functionality
- **shape.spec.ts**: Shape creation (squares, circles, triangles, rectangles)
- **text.spec.ts**: Text input and formatting
- **line.spec.ts**: Line drawing functionality

### Selection and Manipulation
- **selection.spec.ts**: Element selection and transformation
- **duplicate_on_drag.spec.ts**: Duplicate on drag functionality (Command/Ctrl+Drag)
- **movement.spec.ts**: Element movement and positioning
- **align.spec.ts**: Element alignment (horizontal, vertical, center, etc.)

### Editing and Modification
- **edit.spec.ts**: Path editing with smooth brush
- **path_edit.spec.ts**: Advanced path editing operations
- **subpath.spec.ts**: Subpath manipulation
- **boolean_ops.spec.ts**: Boolean operations (union, intersection, etc.)

### Layout and Organization
- **distribution.spec.ts**: Element distribution and spacing
- **grouping.spec.ts**: Element grouping functionality
- **order.spec.ts**: Element layering and z-order management
- **visibility.spec.ts**: Element visibility controls

### View and Navigation
- **view_control.spec.ts**: View controls (zoom, pan, fit to screen)
- **grid.spec.ts**: Grid system functionality
- **guides.spec.ts**: Guideline system

### Styling and Appearance
- **style_eyedropper.spec.ts**: Style copying with eyedropper tool

### File Operations
- **file_management.spec.ts**: File import/export operations

## Running Tests

### Prerequisites

Make sure you have Playwright installed:

```bash
bun add --dev @playwright/test
bunx playwright install
```

### Run All Tests

```bash
bun test
```

### Run Tests with UI

```bash
bun run test:ui
```

### Run Specific Test File

```bash
npx playwright test pencil.spec.ts
```

### Run Tests in Headed Mode (visible browser)

```bash
npx playwright test --headed
```

### Generate Test Report

```bash
npx playwright show-report
```

## Test Configuration

The tests are configured in `playwright.config.ts` with:

- Base URL: `http://localhost:5173`
- Automatic dev server startup
- Tests run in Chromium, Firefox, and WebKit
- HTML test reports

## Test Coverage

The tests cover:

1. **Application Loading & Global Actions**
   - Canvas and sidebar presence
   - Plugin button availability
   - Global shortcuts and actions

2. **Mode Switching**
   - Switching between different tools (Select, Pencil, Shape, Text, Line, etc.)

3. **Drawing Tools**
   - Pencil drawing paths on canvas
   - Shape creation (square, circle, triangle, rectangle)
   - Text input and font formatting
   - Line drawing functionality

4. **Selection and Transformation**
   - Selecting created elements
   - Transformation panel functionality
   - Duplicating elements
   - Element movement and positioning
   - Alignment operations (horizontal, vertical, center, etc.)

5. **Editing and Path Operations**
   - Smooth brush mode toggling
   - Advanced path editing operations
   - Subpath manipulation
   - Boolean operations (union, intersection, difference)
   - Path modification tools

6. **Layout and Organization**
   - Element distribution and spacing
   - Grouping functionality
   - Layer ordering and z-index management
   - Element visibility controls

7. **View and Navigation**
   - View controls (zoom, pan, fit to screen)
   - Grid system functionality
   - Guideline system

8. **Styling and Appearance**
   - Style copying with eyedropper tool

9. **File Operations**
   - File import/export operations

## Writing New Tests

When adding new tests:

1. Create a new `.spec.ts` file in the `tests/` directory
2. Use descriptive test names and `test.describe` blocks
3. Follow the existing pattern of creating elements before testing interactions
4. Use `page.locator()` with appropriate selectors (titles, text content, etc.)
5. Test both positive and negative scenarios where applicable

## Debugging Tests

To debug failing tests:

1. Run tests in headed mode: `bunx playwright test --headed`
2. Use the Playwright UI: `bun run test:ui`
3. Add `await page.pause()` in test code for manual inspection
4. Check the HTML report for screenshots and traces

## CI/CD Integration

For CI/CD pipelines, you can:

1. Install browsers in CI: `npx playwright install --with-deps`
2. Run tests with retries: `npx playwright test --retries=2`
3. Generate reports: `npx playwright test --reporter=html,json`