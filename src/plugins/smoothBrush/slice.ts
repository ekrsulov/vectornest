import type { StoreApi } from 'zustand';
import type { PathData, Command, SubPath } from '../../types';
import { extractEditablePoints, updateCommands, extractSubpaths, simplifyPoints } from '../../utils/pathParserUtils';
import type { CanvasStore } from '../../store/canvasStore';

export interface SmoothBrush {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    simplifyPoints: boolean;
    simplificationTolerance: number;
    minDistance: number;
    affectedPoints: Array<{
        commandIndex: number;
        pointIndex: number;
        x: number;
        y: number;
    }>;
}

export interface SmoothBrushPluginSlice {
    smoothBrush: SmoothBrush;

    // Actions
    updateSmoothBrush: (brush: Partial<SmoothBrush>) => void;
    applySmoothBrush: (centerX?: number, centerY?: number) => void;
    activateSmoothBrush: () => void;
    deactivateSmoothBrush: () => void;
    resetSmoothBrush: () => void;
    updateSmoothBrushCursor: (x: number, y: number) => void;
    updateAffectedPoints: (centerX: number, centerY: number) => void;
}

export const createSmoothBrushPluginSlice = (
    set: StoreApi<CanvasStore>['setState'],
    get: StoreApi<CanvasStore>['getState'],
    _api: StoreApi<CanvasStore>
): SmoothBrushPluginSlice => ({
    smoothBrush: {
        radius: 18,
        strength: 0.35,
        isActive: false,
        cursorX: 0,
        cursorY: 0,
        simplifyPoints: false,
        simplificationTolerance: 0.3,
        minDistance: 0.5,
        affectedPoints: [],
    },

    updateSmoothBrush: (brush) => {
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, ...brush },
        });
    },

    applySmoothBrush: (centerX?: number, centerY?: number) => {
        const state = get();
        if (!state.smoothBrush) return;

        const { radius, strength, simplifyPoints: shouldSimplifyPoints, simplificationTolerance, minDistance } =
            state.smoothBrush;

        // Find the active element (first selected or the one being edited)
        let targetElementId: string | null = null;
        if ((state.selectedCommands?.length ?? 0) > 0 && state.selectedCommands) {
            targetElementId = state.selectedCommands[0].elementId;
        } else if (state.editingPoint) {
            targetElementId = state.editingPoint.elementId;
        } else if (state.selectedIds && state.selectedIds.length > 0) {
            targetElementId = state.selectedIds[0];
        }

        if (!targetElementId) return;

        const element = state.elements.find((el) => el.id === targetElementId);
        if (!element || element.type !== 'path') return;

        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        let editablePoints = extractEditablePoints(commands);

        // Filter editable points for selected subpaths
        const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
        const selectedSubpathsForElement = hasSelectedSubpaths
            ? (state.selectedSubpaths ?? []).filter((sp: { elementId: string; subpathIndex: number }) => sp.elementId === targetElementId)
            : [];

        if (selectedSubpathsForElement.length > 0) {
            const subpaths = extractSubpaths(commands);
            const filteredPoints: typeof editablePoints = [];

            selectedSubpathsForElement.forEach((selected: { subpathIndex: number }) => {
                const subpathData = subpaths[selected.subpathIndex];
                if (subpathData) {
                    const pointsInSubpath = editablePoints.filter(
                        (point) => point.commandIndex >= subpathData.startIndex && point.commandIndex <= subpathData.endIndex
                    );
                    filteredPoints.push(...pointsInSubpath);
                }
            });

            editablePoints = filteredPoints;
        }

        let rebuildPath = false;
        let simplifiedPointsForRebuild: typeof editablePoints = [];

        const affectedPoints: Array<{
            commandIndex: number;
            pointIndex: number;
            x: number;
            y: number;
        }> = [];

        const updatedPoints: typeof editablePoints = [];

        if ((state.selectedCommands?.length ?? 0) > 0) {
            // Apply smoothing only to selected commands
            (state.selectedCommands ?? []).forEach((selectedCmd: { elementId: string; commandIndex: number; pointIndex: number }) => {
                const point = editablePoints.find(
                    (p) => p.commandIndex === selectedCmd.commandIndex && p.pointIndex === selectedCmd.pointIndex
                );

                if (point) {
                    // Skip start and end points of the path
                    const pointIndex = editablePoints.indexOf(point);
                    if (pointIndex === 0 || pointIndex === editablePoints.length - 1) return;

                    affectedPoints.push({
                        commandIndex: point.commandIndex,
                        pointIndex: point.pointIndex,
                        x: point.x,
                        y: point.y,
                    });

                    // Calculate smoothed position by averaging with neighbors
                    let sumX = 0,
                        sumY = 0,
                        count = 0;

                    for (let offset = -1; offset <= 1; offset++) {
                        const neighborIndex = editablePoints.indexOf(point) + offset;
                        if (neighborIndex >= 0 && neighborIndex < editablePoints.length) {
                            const neighbor = editablePoints[neighborIndex];
                            sumX += neighbor.x;
                            sumY += neighbor.y;
                            count++;
                        }
                    }

                    if (count > 0) {
                        const avgX = sumX / count;
                        const avgY = sumY / count;

                        const newX = point.x + (avgX - point.x) * strength;
                        const newY = point.y + (avgY - point.y) * strength;

                        updatedPoints.push({
                            commandIndex: point.commandIndex,
                            pointIndex: point.pointIndex,
                            x: newX,
                            y: newY,
                            isControl: point.isControl,
                            anchor: point.anchor,
                        });
                    }
                }
            });
        } else {
            // Radius-based smoothing for brush mode
            editablePoints.forEach((point, index) => {
                if (index === 0 || index === editablePoints.length - 1) return;

                if (centerX !== undefined && centerY !== undefined) {
                    const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
                    if (distance > radius) return;
                }

                affectedPoints.push({
                    commandIndex: point.commandIndex,
                    pointIndex: point.pointIndex,
                    x: point.x,
                    y: point.y,
                });

                let sumX = 0,
                    sumY = 0,
                    count = 0;

                for (let offset = -1; offset <= 1; offset++) {
                    const neighborIndex = index + offset;
                    if (neighborIndex >= 0 && neighborIndex < editablePoints.length) {
                        const neighbor = editablePoints[neighborIndex];
                        sumX += neighbor.x;
                        sumY += neighbor.y;
                        count++;
                    }
                }

                if (count > 0) {
                    const avgX = sumX / count;
                    const avgY = sumY / count;

                    let weight = strength;
                    if (centerX !== undefined && centerY !== undefined) {
                        const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
                        weight = strength * (1 - distance / radius);
                    }

                    const newX = point.x + (avgX - point.x) * weight;
                    const newY = point.y + (avgY - point.y) * weight;

                    updatedPoints.push({
                        commandIndex: point.commandIndex,
                        pointIndex: point.pointIndex,
                        x: newX,
                        y: newY,
                        isControl: point.isControl,
                        anchor: point.anchor,
                    });
                }
            });
        }

        // Update affected points for feedback
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, affectedPoints },
        });

        // Update the path if points were affected
        if (updatedPoints.length > 0) {
            // Apply point simplification if enabled
            if (shouldSimplifyPoints) {
                const updatedPointsMap = new Map<string, typeof updatedPoints[0]>();
                updatedPoints.forEach((p) => {
                    updatedPointsMap.set(`${p.commandIndex}-${p.pointIndex}`, p);
                });

                const smoothedCommands = updateCommands(
                    commands,
                    updatedPoints.map((u) => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } }))
                );
                const allPointsAfterSmoothing = extractEditablePoints(smoothedCommands);

                const pointsToSimplify = allPointsAfterSmoothing.filter((p) => {
                    return updatedPointsMap.has(`${p.commandIndex}-${p.pointIndex}`);
                });

                const simplifiedUpdatedPoints = simplifyPoints(pointsToSimplify, simplificationTolerance, minDistance);

                const finalPointsAfterSimplification: typeof allPointsAfterSmoothing = [];
                const originalKeys = new Set(updatedPoints.map((p) => `${p.commandIndex}-${p.pointIndex}`));

                allPointsAfterSmoothing.forEach((p) => {
                    if (!originalKeys.has(`${p.commandIndex}-${p.pointIndex}`)) {
                        finalPointsAfterSimplification.push(p);
                    }
                });

                simplifiedUpdatedPoints.forEach((sp) => {
                    finalPointsAfterSimplification.push({
                        commandIndex: sp.commandIndex,
                        pointIndex: sp.pointIndex,
                        x: sp.x,
                        y: sp.y,
                        isControl: sp.isControl,
                        anchor: { x: sp.x, y: sp.y },
                    });
                });

                finalPointsAfterSimplification.sort((a, b) => {
                    if (a.commandIndex !== b.commandIndex) {
                        return a.commandIndex - b.commandIndex;
                    }
                    return a.pointIndex - b.pointIndex;
                });

                simplifiedPointsForRebuild = finalPointsAfterSimplification;
                rebuildPath = true;
            }

            if (rebuildPath && simplifiedPointsForRebuild.length > 0) {
                const originalSubpaths = extractSubpaths(commands);

                if (originalSubpaths.length > 1) {
                    const newSubPaths: SubPath[] = [];

                    originalSubpaths.forEach((subpath) => {
                        const subpathPoints = simplifiedPointsForRebuild.filter(
                            (point) => point.commandIndex >= subpath.startIndex && point.commandIndex <= subpath.endIndex
                        );

                        if (subpathPoints.length > 0) {
                            const newSubPath: Command[] = [
                                { type: 'M', position: { x: subpathPoints[0].x, y: subpathPoints[0].y } },
                            ];

                            for (let i = 1; i < subpathPoints.length; i++) {
                                newSubPath.push({
                                    type: 'L',
                                    position: { x: subpathPoints[i].x, y: subpathPoints[i].y },
                                });
                            }

                            newSubPaths.push(newSubPath);
                        }
                    });

                    state.updateElement(targetElementId, {
                        data: { ...pathData, subPaths: newSubPaths },
                    });
                } else {
                    const newSubPath: Command[] = [
                        { type: 'M', position: { x: simplifiedPointsForRebuild[0].x, y: simplifiedPointsForRebuild[0].y } },
                    ];

                    for (let i = 1; i < simplifiedPointsForRebuild.length; i++) {
                        newSubPath.push({
                            type: 'L',
                            position: { x: simplifiedPointsForRebuild[i].x, y: simplifiedPointsForRebuild[i].y },
                        });
                    }

                    state.updateElement(targetElementId, {
                        data: { ...pathData, subPaths: [newSubPath] },
                    });
                }
            } else {
                const updatedCommands = updateCommands(
                    commands,
                    updatedPoints.map((u) => ({ ...u, type: 'independent' as const, anchor: { x: u.x, y: u.y } }))
                );
                const newSubPaths = extractSubpaths(updatedCommands).map((s) => s.commands);

                state.updateElement(targetElementId, {
                    data: { ...pathData, subPaths: newSubPaths },
                });
            }
        }
    },

    activateSmoothBrush: () => {
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, isActive: true },
        });
        
        // Disable path interaction to prevent selection while smooth brush is active
        const state = get();
        if (state.setPathInteractionDisabled) {
            state.setPathInteractionDisabled(true);
        }
    },

    deactivateSmoothBrush: () => {
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, isActive: false, affectedPoints: [] },
        });
        
        // Re-enable path interaction when smooth brush is deactivated
        const state = get();
        if (state.setPathInteractionDisabled) {
            state.setPathInteractionDisabled(false);
        }
    },

    resetSmoothBrush: () => {
        set({
            smoothBrush: {
                radius: 18,
                strength: 0.35,
                isActive: false,
                cursorX: 0,
                cursorY: 0,
                simplifyPoints: false,
                simplificationTolerance: 0.3,
                minDistance: 0.5,
                affectedPoints: [],
            },
        });
    },

    updateSmoothBrushCursor: (x: number, y: number) => {
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, cursorX: x, cursorY: y },
        });
    },

    updateAffectedPoints: (centerX: number, centerY: number) => {
        const state = get();
        if (!state.smoothBrush) return;

        const { radius } = state.smoothBrush;

        // Find the active element
        let targetElementId: string | null = null;
        if ((state.selectedCommands?.length ?? 0) > 0 && state.selectedCommands) {
            targetElementId = state.selectedCommands[0].elementId;
        } else if (state.editingPoint) {
            targetElementId = state.editingPoint.elementId;
        } else if (state.selectedIds && state.selectedIds.length > 0) {
            targetElementId = state.selectedIds[0];
        }

        if (!targetElementId) {
            const currentBrush = get().smoothBrush;
            set({
                smoothBrush: { ...currentBrush, affectedPoints: [] },
            });
            return;
        }

        const element = state.elements.find((el) => el.id === targetElementId);
        if (!element || element.type !== 'path') {
            const currentBrush = get().smoothBrush;
            set({
                smoothBrush: { ...currentBrush, affectedPoints: [] },
            });
            return;
        }

        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        let editablePoints = extractEditablePoints(commands);

        // Filter editable points for selected subpaths
        const hasSelectedSubpaths = (state.selectedSubpaths?.length ?? 0) > 0;
        const selectedSubpathsForElement = hasSelectedSubpaths
            ? (state.selectedSubpaths ?? []).filter((sp: { elementId: string; subpathIndex: number }) => sp.elementId === targetElementId)
            : [];

        if (selectedSubpathsForElement.length > 0) {
            const subpaths = extractSubpaths(commands);
            const filteredPoints: typeof editablePoints = [];

            selectedSubpathsForElement.forEach((selected: { subpathIndex: number }) => {
                const subpathData = subpaths[selected.subpathIndex];
                if (subpathData) {
                    const pointsInSubpath = editablePoints.filter(
                        (point) => point.commandIndex >= subpathData.startIndex && point.commandIndex <= subpathData.endIndex
                    );
                    filteredPoints.push(...pointsInSubpath);
                }
            });

            editablePoints = filteredPoints;
        }

        // Calculate affected points based on radius
        const affectedPoints: Array<{
            commandIndex: number;
            pointIndex: number;
            x: number;
            y: number;
        }> = [];

        editablePoints.forEach((point, index) => {
            // Skip start and end points
            if (index === 0 || index === editablePoints.length - 1) return;

            const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
            if (distance <= radius) {
                affectedPoints.push({
                    commandIndex: point.commandIndex,
                    pointIndex: point.pointIndex,
                    x: point.x,
                    y: point.y,
                });
            }
        });

        // Update affected points for feedback
        const currentBrush = get().smoothBrush;
        set({
            smoothBrush: { ...currentBrush, affectedPoints },
        });
    },
});
