import { Page, Locator, expect } from '@playwright/test';

// Cross-platform modifier for keyboard shortcuts (Cmd on macOS, Ctrl elsewhere)
export const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

const TOOL_GROUP_MAP: Record<string, 'Basic Tools' | 'Creation Tools' | 'Advanced Tools'> = {
  Select: 'Basic Tools',
  Subpath: 'Basic Tools',
  Transform: 'Basic Tools',
  Edit: 'Basic Tools',
  Pen: 'Creation Tools',
  Pencil: 'Creation Tools',
  Text: 'Creation Tools',
  Shape: 'Creation Tools',
  'Shape Builder': 'Advanced Tools',
  'Trim Path': 'Advanced Tools',
  'Wrap 3D': 'Advanced Tools',
  Arrows: 'Advanced Tools',
  Measure: 'Advanced Tools',
};

const TOOL_GROUPS = ['Basic Tools', 'Creation Tools', 'Advanced Tools'] as const;

const getToolGroup = (label: string): string => TOOL_GROUP_MAP[label] ?? '';

/**
 * BottomActionBar group button
 */
export function getToolMenuButton(page: Page, groupLabel: string): Locator {
  return page.getByRole('button', { name: groupLabel });
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
  const menuItem = await openMenuForTool(page, title);
  // Click immediately without scrolling to avoid timing issues
  await menuItem.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(100);
}

export async function expectToolVisible(page: Page, title: string): Promise<void> {
  const menuItem = await openMenuForTool(page, title);
  await expect(menuItem).toBeVisible();
  await page.keyboard.press('Escape');
}

export async function expectToolEnabled(page: Page, title: string): Promise<void> {
  const menuItem = await openMenuForTool(page, title);
  await expect(menuItem).toBeEnabled();
  await page.keyboard.press('Escape');
}

export async function isToolButtonEnabled(page: Page, title: string): Promise<boolean> {
  const menuItem = await openMenuForTool(page, title);
  const enabled = await menuItem.isEnabled();
  await page.keyboard.press('Escape');
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

async function expandPanelIfCollapsed(page: Page, heading: string | RegExp): Promise<void> {
  const panelHeading = page.getByRole('heading', { name: heading }).first();
  if (await panelHeading.count() === 0) return;

  const headerContainer = panelHeading.locator('xpath=ancestor::div[1]');
  const collapseToggle = headerContainer.getByRole('button', { name: /Expand panel|Collapse panel/i }).first();
  if (await collapseToggle.count() === 0) return;

  const ariaLabel = await collapseToggle.getAttribute('aria-label');
  if (ariaLabel?.toLowerCase().includes('expand')) {
    await collapseToggle.click({ force: true });
    await page.waitForTimeout(150);
  }
}

/**
 * Open settings panel. Supports both the old "Settings" and new "Prefs" labels.
 */
export async function openSettingsPanel(page: Page): Promise<void> {
  const settingsButton = page.locator('button[aria-label="Prefs"], button[aria-label="Settings"]').first();
  await settingsButton.waitFor({ state: 'visible', timeout: 5000 });

  const configurationHeading = page.getByRole('heading', { name: 'Configuration' }).first();
  if (await isVisible(configurationHeading)) return;

  await settingsButton.click({ force: true });
  await expect(configurationHeading).toBeVisible({ timeout: 5000 });
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
  const snapPointsToggle = page.getByRole('checkbox', { name: 'Show Snap Points' });
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
