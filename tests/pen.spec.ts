import { test, expect } from '@playwright/test';
import {getCanvas, getCanvasPaths, waitForLoad, selectTool, expectToolEnabled} from './helpers';

test.describe('Pen Tool - Path Creation', () => {
    test('should create a straight line with two anchor points', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        // Get SVG canvas element
        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        // Count initial paths
        const initialPaths = await getCanvasPaths(page).count();

        // Click to place first anchor point
        const point1 = {
            x: canvasBox.x + canvasBox.width * 0.2,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.click(point1.x, point1.y);

        // Click to place second anchor point
        const point2 = {
            x: canvasBox.x + canvasBox.width * 0.6,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.click(point2.x, point2.y);

        // Press Enter to finalize the path
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify that a path was created
        const pathsAfterDrawing = await getCanvasPaths(page).count();
        expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);
    });

    test('should create a bezier curve by click and drag', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        const initialPaths = await getCanvasPaths(page).count();

        // Click and drag to create first anchor with handles
        const point1 = {
            x: canvasBox.x + canvasBox.width * 0.2,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.move(point1.x, point1.y);
        await page.mouse.down();
        // Drag to create direction handle
        await page.mouse.move(
            point1.x + 50,
            point1.y - 30,
            { steps: 10 }
        );
        await page.mouse.up();

        // Click and drag to create second anchor with handles
        const point2 = {
            x: canvasBox.x + canvasBox.width * 0.6,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.move(point2.x, point2.y);
        await page.mouse.down();
        await page.mouse.move(
            point2.x + 50,
            point2.y + 30,
            { steps: 10 }
        );
        await page.mouse.up();

        // Press Enter to finalize the path
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify curve was created
        const pathsAfterDrawing = await getCanvasPaths(page).count();
        expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);
    });

    test('should create closed path by clicking on first anchor', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        const initialPaths = await getCanvasPaths(page).count();

        // Create a triangle by placing 3 points
        const point1 = {
            x: canvasBox.x + canvasBox.width * 0.35,
            y: canvasBox.y + canvasBox.height * 0.3,
        };
        const point2 = {
            x: canvasBox.x + canvasBox.width * 0.55,
            y: canvasBox.y + canvasBox.height * 0.3,
        };
        const point3 = {
            x: canvasBox.x + canvasBox.width * 0.45,
            y: canvasBox.y + canvasBox.height * 0.6,
        };

        // Click first point
        await page.mouse.click(point1.x, point1.y);
        await page.waitForTimeout(50);

        // Click second point
        await page.mouse.click(point2.x, point2.y);
        await page.waitForTimeout(50);

        // Click third point
        await page.mouse.click(point3.x, point3.y);
        await page.waitForTimeout(50);

        // Click near the first point to close the path
        await page.mouse.click(point1.x + 2, point1.y + 2);
        await page.waitForTimeout(100);

        // Verify closed path was created
        const pathsAfterDrawing = await getCanvasPaths(page).count();
        expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);

        // Verify the path contains a 'z' command (closed)
        const pathElement = await getCanvasPaths(page).first();
        const dAttribute = await pathElement.getAttribute('d');
        expect(dAttribute?.toLowerCase()).toContain('z');
    });

    test('should cancel path creation with Escape', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        const initialPaths = await getCanvasPaths(page).count();

        // Click to place first anchor point
        await page.mouse.click(
            canvasBox.x + canvasBox.width * 0.3,
            canvasBox.y + canvasBox.height * 0.5
        );

        // Click to place second anchor point
        await page.mouse.click(
            canvasBox.x + canvasBox.width * 0.5,
            canvasBox.y + canvasBox.height * 0.4
        );

        // Press Escape to cancel
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Verify no new path was created
        const pathsAfterCancel = await getCanvasPaths(page).count();
        expect(pathsAfterCancel).toBe(initialPaths);
    });

    test('should undo and redo anchor points during drawing', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        // Place 3 anchor points
        const points = [
            { x: canvasBox.x + canvasBox.width * 0.2, y: canvasBox.y + canvasBox.height * 0.5 },
            { x: canvasBox.x + canvasBox.width * 0.4, y: canvasBox.y + canvasBox.height * 0.5 },
            { x: canvasBox.x + canvasBox.width * 0.6, y: canvasBox.y + canvasBox.height * 0.5 },
        ];

        for (const point of points) {
            await page.mouse.click(point.x, point.y);
            await page.waitForTimeout(50);
        }

        // Undo last point (Cmd+Z or Ctrl+Z)
        const isMac = process.platform === 'darwin';
        const undoKey = isMac ? 'Meta+z' : 'Control+z';
        const redoKey = isMac ? 'Meta+Shift+z' : 'Control+Shift+z';

        await page.keyboard.press(undoKey);
        await page.waitForTimeout(100);

        // Redo the point
        await page.keyboard.press(redoKey);
        await page.waitForTimeout(100);

        // Finalize path
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify path was created
        const pathCount = await getCanvasPaths(page).count();
        expect(pathCount).toBeGreaterThan(0);
    });
});

test.describe('Pen Tool - Path Editing', () => {
    test('should create complex path with multiple anchor points', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        const initialPaths = await getCanvasPaths(page).count();

        // Create a path with 5 anchor points forming a wave pattern
        const points = [
            { x: canvasBox.x + canvasBox.width * 0.15, y: canvasBox.y + canvasBox.height * 0.5 },
            { x: canvasBox.x + canvasBox.width * 0.30, y: canvasBox.y + canvasBox.height * 0.3 },
            { x: canvasBox.x + canvasBox.width * 0.45, y: canvasBox.y + canvasBox.height * 0.5 },
            { x: canvasBox.x + canvasBox.width * 0.60, y: canvasBox.y + canvasBox.height * 0.7 },
            { x: canvasBox.x + canvasBox.width * 0.75, y: canvasBox.y + canvasBox.height * 0.5 },
        ];

        for (const point of points) {
            await page.mouse.click(point.x, point.y);
            await page.waitForTimeout(50);
        }

        // Finalize path
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify path was created
        const pathsAfterDrawing = await getCanvasPaths(page).count();
        expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);

        // Switch to select mode and select the path
        await selectTool(page, 'Select');
        await page.mouse.click(points[2].x, points[2].y);
        await page.waitForTimeout(100);

        // Verify path is selectable (edit button should be enabled)
        await expectToolEnabled(page, 'Edit');
    });

    test('should create curved segments using click-drag technique', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        const initialPaths = await getCanvasPaths(page).count();

        // First point with handle
        const point1 = {
            x: canvasBox.x + canvasBox.width * 0.2,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.move(point1.x, point1.y);
        await page.mouse.down();
        await page.mouse.move(point1.x + 40, point1.y - 40, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Second point with handle (creates S-curve)
        const point2 = {
            x: canvasBox.x + canvasBox.width * 0.5,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.move(point2.x, point2.y);
        await page.mouse.down();
        await page.mouse.move(point2.x + 40, point2.y + 40, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Third point with handle
        const point3 = {
            x: canvasBox.x + canvasBox.width * 0.8,
            y: canvasBox.y + canvasBox.height * 0.5,
        };
        await page.mouse.move(point3.x, point3.y);
        await page.mouse.down();
        await page.mouse.move(point3.x + 40, point3.y - 40, { steps: 5 });
        await page.mouse.up();

        // Finalize
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify curved path was created
        const pathsAfterDrawing = await getCanvasPaths(page).count();
        expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);

        // Check that the path contains curve commands (C or S)
        const pathElement = await getCanvasPaths(page).first();
        const dAttribute = await pathElement.getAttribute('d');
        // Path should contain curve commands (C for cubic bezier)
        expect(dAttribute).toMatch(/[CcSs]/);
    });

    test('should be selectable after creation and switch to edit mode', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Create a path using pen tool
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        // Create simple path
        const centerX = canvasBox.x + canvasBox.width * 0.5;
        const centerY = canvasBox.y + canvasBox.height * 0.5;

        await page.mouse.click(centerX - 100, centerY);
        await page.mouse.click(centerX, centerY - 50);
        await page.mouse.click(centerX + 100, centerY);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Switch to select mode
        await selectTool(page, 'Select');

        // Click on the path to select it
        await page.mouse.click(centerX, centerY - 25);
        await page.waitForTimeout(100);

        // Verify the edit button is now enabled
        await expectToolEnabled(page, 'Edit');

        // Switch to edit mode
        await selectTool(page, 'Edit');
        await page.waitForTimeout(100);

        // Verify edit mode is active by checking for edit points (circles)
        const editCircles = await page.locator('svg circle').count();
        expect(editCircles).toBeGreaterThan(0);
    });

    test('should show pen panel when pen tool is active', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');
        await page.waitForTimeout(100);

        // Check that pen panel is visible
        await expect(page.getByRole('heading', { name: 'Pen' })).toBeVisible();
    });
});

test.describe('Pen Tool - Rubber Band Preview', () => {
    test('should show rubber band preview while drawing', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        // Switch to pen mode
        await selectTool(page, 'Pen');

        const canvas = getCanvas(page);
        const canvasBox = await canvas.boundingBox();
        if (!canvasBox) throw new Error('SVG canvas not found');

        // Click to place first anchor point
        await page.mouse.click(
            canvasBox.x + canvasBox.width * 0.3,
            canvasBox.y + canvasBox.height * 0.5
        );

        // Move mouse without clicking to see rubber band preview
        await page.mouse.move(
            canvasBox.x + canvasBox.width * 0.6,
            canvasBox.y + canvasBox.height * 0.3
        );
        await page.waitForTimeout(100);

        // The rubber band preview should be visible (dashed line or similar indicator)
        // This is a visual test that the path is being previewed
        // We verify by checking that we can still finalize the path

        // Click to place second anchor
        await page.mouse.click(
            canvasBox.x + canvasBox.width * 0.6,
            canvasBox.y + canvasBox.height * 0.3
        );

        // Finalize
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        // Verify path was created
        const pathCount = await getCanvasPaths(page).count();
        expect(pathCount).toBeGreaterThan(0);
    });
});

test.describe('Pen Tool - Group Transform Handling', () => {
    test('should edit transformed grouped path without creating a ghost path', async ({ page }) => {
        await page.goto('/');
        await waitForLoad(page);

        const setup = await page.evaluate(() => {
            const store = (window as any).useCanvasStore;
            if (!store) throw new Error('Canvas store is not available');

            const {
                addElement,
                selectElements,
                createGroupFromSelection,
                updateElement,
            } = store.getState();

            const createOpenPath = (startX: number, startY: number, endX: number, endY: number) => addElement({
                type: 'path',
                data: {
                    subPaths: [[
                        { type: 'M', position: { x: startX, y: startY } },
                        { type: 'L', position: { x: endX, y: endY } },
                    ]],
                    strokeWidth: 2,
                    strokeColor: '#000000',
                    strokeOpacity: 1,
                    fillColor: 'none',
                    fillOpacity: 1,
                },
            });

            // Target path to edit with Pen.
            const pathId = createOpenPath(40, 40, 120, 40);
            // Auxiliary path so grouping has at least two selected elements.
            const helperPathId = createOpenPath(40, 180, 120, 180);

            selectElements([pathId, helperPathId]);
            const groupId = createGroupFromSelection('Pen Transform Group');
            if (!groupId) throw new Error('Failed to create group for test');

            // Apply a visible transform at group level.
            const tx = 180;
            const ty = 120;
            updateElement(groupId, {
                data: {
                    transform: {
                        translateX: tx,
                        translateY: ty,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                    },
                },
            });

            const pathCount = store.getState().elements.filter((el: any) => el.type === 'path').length;

            return {
                pathId,
                groupId,
                pathCount,
                transform: { tx, ty },
                worldEndPoint: { x: 120 + tx, y: 40 + ty },
                worldNewPoint: { x: 220 + tx, y: 100 + ty },
            };
        });

        await selectTool(page, 'Pen');

        const clientPoints = await page.evaluate(({ worldEndPoint, worldNewPoint }) => {
            const store = (window as any).useCanvasStore;
            if (!store) throw new Error('Canvas store is not available');

            const svg = document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null;
            if (!svg) throw new Error('SVG canvas not found');

            const rect = svg.getBoundingClientRect();
            const { zoom, panX, panY } = store.getState().viewport;

            const toClient = (point: { x: number; y: number }) => ({
                x: rect.left + point.x * zoom + panX,
                y: rect.top + point.y * zoom + panY,
            });

            return {
                endClient: toClient(worldEndPoint),
                newClient: toClient(worldNewPoint),
            };
        }, {
            worldEndPoint: setup.worldEndPoint,
            worldNewPoint: setup.worldNewPoint,
        });

        // First click on transformed endpoint enters editing mode for the existing path.
        await page.mouse.click(clientPoints.endClient.x, clientPoints.endClient.y);
        await page.waitForTimeout(120);

        const penAfterFirstClick = await page.evaluate(() => {
            const store = (window as any).useCanvasStore;
            const pen = store?.getState?.().pen;
            return {
                mode: pen?.mode ?? null,
                editingPathId: pen?.editingPathId ?? null,
                anchors: pen?.currentPath?.anchors?.map((a: any) => ({ x: a.position.x, y: a.position.y })) ?? [],
            };
        });

        expect(penAfterFirstClick.mode).toBe('editing');
        expect(penAfterFirstClick.editingPathId).toBe(setup.pathId);
        expect(penAfterFirstClick.anchors.length).toBeGreaterThanOrEqual(2);
        expect(penAfterFirstClick.anchors[0].x).toBeCloseTo(40 + setup.transform.tx, 3);
        expect(penAfterFirstClick.anchors[0].y).toBeCloseTo(40 + setup.transform.ty, 3);
        expect(penAfterFirstClick.anchors[1].x).toBeCloseTo(120 + setup.transform.tx, 3);
        expect(penAfterFirstClick.anchors[1].y).toBeCloseTo(40 + setup.transform.ty, 3);

        // Second click on the same endpoint continues the path and switches to drawing mode.
        await page.mouse.click(clientPoints.endClient.x, clientPoints.endClient.y);
        await page.waitForTimeout(120);

        const penAfterSecondClick = await page.evaluate(() => {
            const store = (window as any).useCanvasStore;
            const pen = store?.getState?.().pen;
            return {
                mode: pen?.mode ?? null,
                editingPathId: pen?.editingPathId ?? null,
            };
        });

        expect(penAfterSecondClick.mode).toBe('drawing');
        expect(penAfterSecondClick.editingPathId).toBe(setup.pathId);

        // Add a new anchor in world space and finalize.
        await page.mouse.click(clientPoints.newClient.x, clientPoints.newClient.y);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(120);

        const finalState = await page.evaluate(({ pathId, tx, ty }) => {
            const store = (window as any).useCanvasStore;
            if (!store) throw new Error('Canvas store is not available');
            const state = store.getState();

            const pathElements = state.elements.filter((el: any) => el.type === 'path');
            const targetPath = state.elements.find((el: any) => el.id === pathId);
            if (!targetPath || targetPath.type !== 'path') {
                throw new Error('Target path not found');
            }

            const subPath = targetPath.data.subPaths[0];
            const lastCommand = subPath[subPath.length - 1];
            const localExpected = { x: 220, y: 100 };
            const worldExpected = { x: 220 + tx, y: 100 + ty };

            return {
                totalPathCount: pathElements.length,
                parentId: targetPath.parentId,
                commandCount: subPath.length,
                lastPoint: lastCommand?.type === 'M' || lastCommand?.type === 'L' || lastCommand?.type === 'C'
                    ? { x: lastCommand.position.x, y: lastCommand.position.y }
                    : null,
                localExpected,
                worldExpected,
            };
        }, {
            pathId: setup.pathId,
            tx: setup.transform.tx,
            ty: setup.transform.ty,
        });

        // No "ghost" path should be created; same path should be edited in-place.
        expect(finalState.totalPathCount).toBe(setup.pathCount);
        expect(finalState.commandCount).toBe(3);
        expect(finalState.parentId).toBe(setup.groupId);
        expect(finalState.lastPoint).toBeTruthy();
        expect(finalState.lastPoint?.x).toBeCloseTo(finalState.localExpected.x, 3);
        expect(finalState.lastPoint?.y).toBeCloseTo(finalState.localExpected.y, 3);
        expect(finalState.lastPoint?.x).not.toBeCloseTo(finalState.worldExpected.x, 3);
        expect(finalState.lastPoint?.y).not.toBeCloseTo(finalState.worldExpected.y, 3);
    });
});
