import { Page, Locator, expect } from '@playwright/test';

// Cross-platform modifier for keyboard shortcuts (Cmd on macOS, Ctrl elsewhere)
export const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

const TOOL_GROUP_MAP: Record<string, 'Basic Tools' | 'Creation Tools' | 'Advanced Tools'> = {
  Select: 'Basic Tools',
  Subpath: 'Basic Tools',
  Transform: 'Basic Tools',
  Edit: 'Basic Tools',
  Pan: 'Basic Tools',
  Pen: 'Creation Tools',
  Pencil: 'Creation Tools',
  Text: 'Creation Tools',
  Shape: 'Creation Tools',
  'Shape Builder': 'Advanced Tools',
  'Trim Path': 'Advanced Tools',
  'Wrap 3D': 'Advanced Tools',
  Arrows: 'Advanced Tools',
  Measure: 'Advanced Tools',
  'Smart Eraser': 'Advanced Tools',
};

const TOOL_GROUPS = ['Basic Tools', 'Creation Tools', 'Advanced Tools'] as const;

const getToolGroup = (label: string): string => TOOL_GROUP_MAP[label] ?? '';

/**
 * BottomActionBar group button
 */
export function getToolMenuButton(page: Page, groupLabel: string): Locator {
  return page.getByRole('button', { name: groupLabel });
}

async function getDirectToolButton(page: Page, label: string): Promise<Locator | null> {
  const buttons = page.locator(`button[aria-label="${label}"]`);
  const count = await buttons.count();
  if (count === 0) return null;

  let bestIndex = -1;
  let bestY = -Infinity;

  for (let i = 0; i < count; i += 1) {
    const candidate = buttons.nth(i);
    let isCandidateVisible = false;

    try {
      isCandidateVisible = await candidate.isVisible();
    } catch {
      isCandidateVisible = false;
    }

    if (!isCandidateVisible) continue;

    const box = await candidate.boundingBox();
    if (!box) continue;

    if (box.y > bestY) {
      bestY = box.y;
      bestIndex = i;
    }
  }

  return bestIndex >= 0 ? buttons.nth(bestIndex) : null;
}

type ToolControl =
  | { type: 'button'; locator: Locator }
  | { type: 'menuitem'; locator: Locator };

async function resolveToolControl(page: Page, label: string): Promise<ToolControl> {
  const directButton = await getDirectToolButton(page, label);
  if (directButton) {
    return { type: 'button', locator: directButton };
  }

  return { type: 'menuitem', locator: await openMenuForTool(page, label) };
}

/**
 * Open the appropriate menu and return the tool menu item.
 * Prefers the mapped group, falls back to other groups if not found.
 * 
 * Note: Tool groups have special behavior - when inactive, clicking activates
 * the default tool. When active, clicking opens the menu. We check the button's
 * snapshot state to determine if we need one or two clicks.
 */
async function openMenuForTool(page: Page, label: string): Promise<Locator> {
  const preferred = getToolGroup(label);
  const groupsToTry = preferred
    ? [preferred, ...TOOL_GROUPS.filter((g) => g !== preferred)]
    : [...TOOL_GROUPS];

  for (const group of groupsToTry) {
    const menuButton = getToolMenuButton(page, group);
    
    // Wait for the button to be available (in case UI is still loading)
    try {
      await menuButton.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      continue; // Button not found, try next group
    }
    
    if (await menuButton.count() === 0) continue;
    
    // Check button snapshot to see if it contains [active] marker
    const snapshot = await menuButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      // Check data attributes that might indicate active state
      const dataActive = el.getAttribute('data-active');
      const ariaPressed = el.getAttribute('aria-pressed');
      // Check if button has specific background color (active buttons have different bg)
      const bgColor = computed.backgroundColor;
      return { dataActive, ariaPressed, bgColor };
    });
    
    // Determine if the group button is currently active
    // A button is active if any tool from its group is currently selected
    const isActive = snapshot.ariaPressed === 'true' || 
                     snapshot.dataActive === 'true' ||
                     // Fallback: check if background color suggests it's active (not transparent/white)
                     (snapshot.bgColor && !snapshot.bgColor.includes('rgba(0, 0, 0, 0)') && !snapshot.bgColor.includes('rgb(255, 255, 255)'));
    
    // If not active, click once to activate the group
    if (!isActive) {
      await menuButton.click({ force: true });
      await page.waitForTimeout(300);
    }
    
    // Click to open the menu
    await menuButton.click({ force: true });
    await page.waitForTimeout(200);
    
    // Wait for menu to open and menuitem to be available
    const menuItem = page.getByRole('menuitem', { name: label }).first();
    try {
      await menuItem.waitFor({ state: 'visible', timeout: 1000 });
      return menuItem;
    } catch {
      // Menu item not found in this group, close menu and try next
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }
  }

  throw new Error(`Tool "${label}" not found in BottomActionBar groups`);
}

/**
 * Select a tool by opening its group menu and clicking the menu item
 */
export async function selectTool(page: Page, title: string): Promise<void> {
  const control = await resolveToolControl(page, title);
  await control.locator.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(100);
}

export async function expectToolVisible(page: Page, title: string): Promise<void> {
  const control = await resolveToolControl(page, title);
  await expect(control.locator).toBeVisible();
  if (control.type === 'menuitem') {
    await page.keyboard.press('Escape');
  }
}

export async function expectToolEnabled(page: Page, title: string): Promise<void> {
  const control = await resolveToolControl(page, title);
  await expect(control.locator).toBeEnabled();
  if (control.type === 'menuitem') {
    await page.keyboard.press('Escape');
  }
}

export async function isToolButtonEnabled(page: Page, title: string): Promise<boolean> {
  const control = await resolveToolControl(page, title);
  const enabled = await control.locator.isEnabled();
  if (control.type === 'menuitem') {
    await page.keyboard.press('Escape');
  }
  return enabled;
}

/**
 * Get the canvas SVG element
 */
export function getCanvas(page: Page): Locator {
  return page.locator('svg[data-canvas="true"]');
}

/**
 * Get canvas paths (excluding minimap and other overlay paths)
 * This returns only the main canvas elements, not the minimap preview
 */
export function getCanvasPaths(page: Page): Locator {
  // Get paths that have data-element-id attribute, which are the actual canvas elements
  // This excludes paths in the minimap and other overlays
  return page.locator('path[data-element-id]');
}

/**
 * Wait for network to be idle
 */
export async function waitForLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

function getPanelHeaderLocator(page: Page, heading: string | RegExp): Locator {
  return page.locator('[data-panel-header]').filter({
    has: page.getByRole('heading', { name: heading }),
  });
}

export async function firstVisible(locator: Locator): Promise<Locator> {
  const count = await locator.count();
  let bestVisible: { locator: Locator; x: number; y: number } | null = null;
  let bestBoxed: { locator: Locator; x: number; y: number } | null = null;

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    const box = await candidate.boundingBox().catch(() => null);
    const visible = await isVisible(candidate);

    if (box) {
      const rankedCandidate = { locator: candidate, x: box.x, y: box.y };

      if (
        !bestBoxed ||
        rankedCandidate.x > bestBoxed.x ||
        (rankedCandidate.x === bestBoxed.x && rankedCandidate.y > bestBoxed.y)
      ) {
        bestBoxed = rankedCandidate;
      }

      if (
        visible &&
        (
          !bestVisible ||
          rankedCandidate.x > bestVisible.x ||
          (rankedCandidate.x === bestVisible.x && rankedCandidate.y > bestVisible.y)
        )
      ) {
        bestVisible = rankedCandidate;
      }
    }
  }

  if (bestVisible) {
    return bestVisible.locator;
  }

  if (bestBoxed) {
    return bestBoxed.locator;
  }

  return locator.first();
}

export async function getPanelContainer(page: Page, heading: string | RegExp): Promise<Locator> {
  const panelHeader = await firstVisible(getPanelHeaderLocator(page, heading));
  return panelHeader.locator('xpath=parent::*');
}

async function expandPanelIfCollapsed(page: Page, heading: string | RegExp): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const panelHeaders = getPanelHeaderLocator(page, heading);
    if (await panelHeaders.count() === 0) {
      await page.waitForTimeout(50);
      continue;
    }

    const panelHeader = await firstVisible(panelHeaders);
    if (!(await isVisible(panelHeader))) {
      await page.waitForTimeout(50);
      continue;
    }

    const collapseToggles = panelHeader.locator('[data-panel-collapse-toggle]');
    if (await collapseToggles.count() > 0) {
      const collapseToggle = await firstVisible(collapseToggles);
      const ariaLabel = await collapseToggle.getAttribute('aria-label');

      if (ariaLabel === 'Expand panel') {
        await collapseToggle.click({ force: true });
        await page.waitForTimeout(150);
      }
      return;
    }

    const ariaExpanded = await panelHeader.getAttribute('aria-expanded');
    const role = await panelHeader.getAttribute('role');

    if (role === 'button' && ariaExpanded === 'false') {
      await panelHeader.click({ force: true });
      await page.waitForTimeout(150);
    }
    return;
  }
}

/**
 * Open settings panel. Supports both the old "Settings" and new "Prefs" labels.
 */
export async function openSettingsPanel(page: Page): Promise<void> {
  const settingsButton = await firstVisible(
    page.getByRole('button', { name: /Prefs|Settings/ })
  );
  await settingsButton.waitFor({ state: 'visible', timeout: 5000 });
  await settingsButton.click({ force: true });
  await page.waitForTimeout(200);
}

/**
 * Expand a collapsible panel section by clicking its chevron if collapsed
 * Many panels now have chevrons to show/hide their content
 */
export async function expandPanelSection(page: Page, sectionHeading: string): Promise<void> {
  await expandPanelIfCollapsed(page, sectionHeading);
}

/**
 * Expand clipboard panel content if collapsed
 */
export async function expandClipboardPanel(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Clipboard');
}

/**
 * Expand smooth brush options if collapsed
 */
export async function expandSmoothBrushOptions(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Smooth Brush');
}

/**
 * Expand grid options if collapsed
 */
export async function expandGridOptions(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Grid');
}

/**
 * Expand guidelines options if collapsed
 */
export async function expandGuidelinesOptions(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Guidelines');
}

/**
 * Expand snap points options if collapsed
 */
export async function expandSnapPointsOptions(page: Page): Promise<void> {
  // First enable snap points if not enabled
  const snapPointsToggle = await firstVisible(page.getByRole('checkbox', { name: 'Show Snap Points' }));
  const count = await snapPointsToggle.count();
  if (count > 0 && !(await snapPointsToggle.isChecked())) {
    await snapPointsToggle.click();
    await page.waitForTimeout(100);
  }
  
  await expandPanelIfCollapsed(page, 'Snap Points');
}

/**
 * Expand Round Path options panel in Edit mode
 */
export async function expandRoundPathOptions(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, /Round Path|Round Subpath/);
}

/**
 * Expand Path Operations options panel in Select mode
 */
export async function expandPathOperationsOptions(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Path Operations');
}

/**
 * Expand Configuration section in Settings panel
 */
export async function expandSettingsConfiguration(page: Page): Promise<void> {
  await expandPanelIfCollapsed(page, 'Configuration');
}

/**
 * Create a shape by dragging on the canvas
 * Shapes require drag gestures, not just clicks
 */
export async function createShape(page: Page, shapeType: 'Square' | 'Circle' = 'Square', position?: { x: number; y: number }): Promise<void> {
  await selectTool(page, 'Shape');
  await page.waitForTimeout(100);
  
  // Select shape type
  await page.locator(`[aria-label="${shapeType}"]`).click();
  
  const canvas = getCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  // Calculate center position or use provided position
  const centerX = position?.x ?? canvasBox.width / 2;
  const centerY = position?.y ?? canvasBox.height / 2;
  
  // Draw shape by dragging
  await page.mouse.move(canvasBox.x + centerX - 50, canvasBox.y + centerY - 50);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + centerX + 50, canvasBox.y + centerY + 50, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}
