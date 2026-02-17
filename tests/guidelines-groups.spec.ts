import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

test.describe('Guidelines with Groups', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrap(page);
  });

  test('groups should contribute guidelines based on their bounding box', async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      const { addElement, selectElements, createGroupFromSelection, updateGuidelinesState } = storeApi.getState();

      // Enable guidelines
      updateGuidelinesState({ enabled: true });

      // Create two rectangles
      const createRectangle = (x: number, y: number, width: number, height: number) => addElement({
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x, y } },
            { type: 'L', position: { x: x + width, y } },
            { type: 'L', position: { x: x + width, y: y + height } },
            { type: 'L', position: { x, y: y + height } },
            { type: 'Z' },
          ]],
          strokeWidth: 2,
          strokeColor: '#000000',
          strokeOpacity: 1,
          fillColor: '#ff0000',
          fillOpacity: 1,
        },
      });

      // Create rectangles to be grouped (at x=100)
      const rect1 = createRectangle(100, 100, 50, 50);
      const rect2 = createRectangle(120, 120, 30, 30);

      // Create a group from the two rectangles
      selectElements([rect1, rect2]);
      const groupId = createGroupFromSelection('Test Group');

      // Create a separate rectangle (at x=300) that should align with the group
      const rect3 = createRectangle(300, 100, 50, 50);

      if (!groupId) {
        throw new Error('Failed to create group');
      }

      // Now test if the group contributes guidelines
      // The group bbox should be from minX=100 to maxX=150
      const state = storeApi.getState();
      
      // Test 1: Center alignment (test bounds center should match group center)
      const centerTestBounds = {
        minX: 100,  // Center at 125 (same as group)
        maxX: 150,
        minY: 100,
        maxY: 150,
      };

      const centerGuidelines = state.findAlignmentGuidelines?.(rect3, centerTestBounds, [rect3]);
      const hasCenterAlignment = centerGuidelines?.some(g => 
        (g.type === 'centerX' || g.type === 'centerY') && g.elementIds.includes(groupId)
      ) ?? false;

      // Test 2: Left edge alignment (test bounds left edge should match group left edge)
      const leftTestBounds = {
        minX: 100,  // Same as group's minX
        maxX: 120,
        minY: 200,
        maxY: 220,
      };

      const leftGuidelines = state.findAlignmentGuidelines?.(rect3, leftTestBounds, [rect3]);
      const hasLeftAlignment = leftGuidelines?.some(g => 
        g.type === 'left' && g.elementIds.includes(groupId)
      ) ?? false;

      // Test 3: Right edge alignment
      const rightTestBounds = {
        minX: 130,
        maxX: 150,  // Same as group's maxX
        minY: 200,
        maxY: 220,
      };

      const rightGuidelines = state.findAlignmentGuidelines?.(rect3, rightTestBounds, [rect3]);
      const hasRightAlignment = rightGuidelines?.some(g => 
        g.type === 'right' && g.elementIds.includes(groupId)
      ) ?? false;

      return {
        groupId,
        hasCenterAlignment,
        hasLeftAlignment,
        hasRightAlignment,
        centerGuidelines: centerGuidelines?.map(g => ({ type: g.type, elementIds: g.elementIds })) || [],
        leftGuidelines: leftGuidelines?.map(g => ({ type: g.type, elementIds: g.elementIds })) || [],
        rightGuidelines: rightGuidelines?.map(g => ({ type: g.type, elementIds: g.elementIds })) || [],
      };
    });

    expect(result.groupId).toBeTruthy();
    expect(result.hasCenterAlignment).toBe(true);
    expect(result.hasLeftAlignment).toBe(true);
    expect(result.hasRightAlignment).toBe(true);
  });

  test('groups should contribute distance guidelines', async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      const { addElement, selectElements, createGroupFromSelection, updateGuidelinesState } = storeApi.getState();

      // Enable guidelines and distance matching
      updateGuidelinesState({ 
        enabled: true,
        distanceEnabled: true,
      });

      // Create rectangles
      const createRectangle = (x: number, y: number, width: number, height: number) => addElement({
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x, y } },
            { type: 'L', position: { x: x + width, y } },
            { type: 'L', position: { x: x + width, y: y + height } },
            { type: 'L', position: { x, y: y + height } },
            { type: 'Z' },
          ]],
          strokeWidth: 2,
          strokeColor: '#000000',
          strokeOpacity: 1,
          fillColor: '#00ff00',
          fillOpacity: 1,
        },
      });

      // Create rectangles at x=100 and group them
      const rect1 = createRectangle(100, 100, 50, 50);
      const rect2 = createRectangle(110, 110, 40, 40);
      selectElements([rect1, rect2]);
      const groupId = createGroupFromSelection('Distance Group');

      // Create another separate rect at x=200 (50px gap from group)
      const rect3 = createRectangle(200, 100, 50, 50);

      if (!groupId) {
        throw new Error('Failed to create group');
      }

      const state = storeApi.getState();
      
      // Group bounds should be: minX=100, maxX=150, minY=100, maxY=150
      // rect3 is at: minX=200, maxX=250, minY=100, maxY=150
      // Horizontal distance from group.maxX (150) to rect3.minX (200) = 50
      
      const testBounds = {
        minX: 200,
        maxX: 250,
        minY: 100,
        maxY: 150,
      };

      const alignmentGuidelines = state.findAlignmentGuidelines?.(rect3, testBounds, [rect3]) || [];
      const distanceGuidelines = state.findDistanceGuidelines?.(rect3, testBounds, alignmentGuidelines, [rect3]);

      return {
        groupId,
        distanceGuidelines: distanceGuidelines || [],
        distanceDetails: distanceGuidelines?.map(g => ({ 
          axis: g.axis, 
          distance: g.distance,
          referenceElementIds: g.referenceElementIds,
        })) || [],
        hasDistanceToGroup: distanceGuidelines?.some(g => 
          g.referenceElementIds.includes(groupId)
        ) ?? false,
      };
    });

    expect(result.groupId).toBeTruthy();
    // Distance guidelines should exist (may be more than just the group)
    expect(result.distanceGuidelines.length).toBeGreaterThan(0);
    // At least one distance guideline should reference the group
    expect(result.hasDistanceToGroup).toBe(true);
  });
});
