import type { StoreApi } from 'zustand';
import type { Point, CanvasElement, PathData } from '../../types';
import { extractSubpaths, getCommandStartPoint } from '../../utils/pathParserUtils';
import type { CanvasStore } from '../../store/canvasStore';

export interface AddPointPluginSlice {
    addPointMode: {
        isActive: boolean;
        hoverPosition: Point | null;
        targetElement: string | null;
        targetSegment: { commandIndex: number; t: number } | null;
    };

    // Actions
    activateAddPointMode: () => void;
    deactivateAddPointMode: () => void;
    updateAddPointHover: (
        position: Point | null,
        elementId: string | null,
        segmentInfo: { commandIndex: number; t: number } | null
    ) => void;
    insertPointOnPath: () => { elementId: string; commandIndex: number; pointIndex: number } | null;
}

export const createAddPointPluginSlice = (
    set: StoreApi<CanvasStore>['setState'],
    get: StoreApi<CanvasStore>['getState'],
    _api: StoreApi<CanvasStore>
): AddPointPluginSlice => ({
    addPointMode: {
        isActive: false,
        hoverPosition: null,
        targetElement: null,
        targetSegment: null,
    },

    activateAddPointMode: () => {
        const currentMode = get().addPointMode;
        set({
            addPointMode: {
                ...currentMode,
                isActive: true,
            },
        });
    },

    deactivateAddPointMode: () => {
        set({
            addPointMode: {
                isActive: false,
                hoverPosition: null,
                targetElement: null,
                targetSegment: null,
            },
        });
    },

    updateAddPointHover: (position, elementId, segmentInfo) => {
        const currentMode = get().addPointMode;
        set({
            addPointMode: {
                ...currentMode,
                hoverPosition: position,
                targetElement: elementId,
                targetSegment: segmentInfo,
            },
        });
    },

    insertPointOnPath: () => {
        const state = get();
        const addPointMode = state.addPointMode;

        if (
            !addPointMode ||
            !addPointMode.isActive ||
            !addPointMode.hoverPosition ||
            !addPointMode.targetElement ||
            !addPointMode.targetSegment
        ) {
            return null;
        }

        const element = state.elements.find((el: CanvasElement) => el.id === addPointMode.targetElement);
        if (!element || element.type !== 'path') return null;

        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const { commandIndex, t } = addPointMode.targetSegment;

        const command = commands[commandIndex];
        if (!command || (command.type !== 'L' && command.type !== 'C')) return null;

        // Get the start point for this command
        const startPoint = getCommandStartPoint(commands, commandIndex);
        if (!startPoint) return null;

        const newCommands = [...commands];
        const insertPosition = addPointMode.hoverPosition;

        // Store info about the newly inserted point
        let newPointInfo: { elementId: string; commandIndex: number; pointIndex: number } | null = null;

        if (command.type === 'L') {
            // For line segments, insert a new L command
            newCommands.splice(commandIndex, 1, { type: 'L', position: insertPosition }, { type: 'L', position: command.position });
            // The new point is at commandIndex, and L commands have pointIndex 0
            newPointInfo = { elementId: addPointMode.targetElement, commandIndex, pointIndex: 0 };
        } else if (command.type === 'C') {
            // For cubic bezier segments, split the curve using De Casteljau's algorithm
            const p0 = startPoint;
            const p1 = command.controlPoint1;
            const p2 = command.controlPoint2;
            const p3 = command.position;

            // First level interpolation
            const p01 = { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
            const p12 = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
            const p23 = { x: p2.x + t * (p3.x - p2.x), y: p2.y + t * (p3.y - p2.y) };

            // Second level interpolation
            const p012 = { x: p01.x + t * (p12.x - p01.x), y: p01.y + t * (p12.y - p01.y) };
            const p123 = { x: p12.x + t * (p23.x - p12.x), y: p12.y + t * (p23.y - p12.y) };

            // Third level interpolation - the point on curve
            const pOnCurve = { x: p012.x + t * (p123.x - p012.x), y: p012.y + t * (p123.y - p012.y) };

            // Create two new cubic bezier commands
            newCommands.splice(
                commandIndex,
                1,
                {
                    type: 'C',
                    controlPoint1: { ...p01, commandIndex, pointIndex: 0, anchor: pOnCurve, isControl: true },
                    controlPoint2: { ...p012, commandIndex, pointIndex: 1, anchor: pOnCurve, isControl: true },
                    position: pOnCurve,
                },
                {
                    type: 'C',
                    controlPoint1: { ...p123, commandIndex: commandIndex + 1, pointIndex: 0, anchor: p3, isControl: true },
                    controlPoint2: { ...p23, commandIndex: commandIndex + 1, pointIndex: 1, anchor: p3, isControl: true },
                    position: p3,
                }
            );
            // The new point is at commandIndex, pointIndex 2 (the position of the first C command)
            newPointInfo = { elementId: addPointMode.targetElement, commandIndex, pointIndex: 2 };
        }

        // Update the path with new commands
        const newSubPaths = extractSubpaths(newCommands).map((s) => s.commands);
        state.updateElement(addPointMode.targetElement, {
            data: {
                ...pathData,
                subPaths: newSubPaths,
            },
        });

        // Select the newly created point and start dragging immediately
        if (newPointInfo) {
            set({
                selectedCommands: [newPointInfo],
                editingPoint: {
                    elementId: newPointInfo.elementId,
                    commandIndex: newPointInfo.commandIndex,
                    pointIndex: newPointInfo.pointIndex,
                    isDragging: true,
                    offsetX: insertPosition.x,
                    offsetY: insertPosition.y,
                },
                draggingSelection: null,
                addPointMode: {
                    ...addPointMode,
                    hoverPosition: null,
                    targetElement: null,
                    targetSegment: null,
                },
            });
        } else {
            // Clear hover state after inserting if no point info
            set({
                addPointMode: {
                    ...addPointMode,
                    hoverPosition: null,
                    targetElement: null,
                    targetSegment: null,
                },
            });
        }

        return newPointInfo;
    },
});
