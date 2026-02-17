import type { SnapSource, SnapContext, SnapPoint } from '../../snap/types';
import type { Point, CanvasElement } from '../../types';
import { isPathElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { ObjectSnapPluginSlice } from './slice';
import type { SnapPointsSlice } from '../../store/slices/features/snapPointsSlice';
import { collectSnapPoints } from '../../snap/snapSourceHelper';

type ObjectSnapStore = CanvasStore & ObjectSnapPluginSlice & SnapPointsSlice;

export class ObjectSnapSource implements SnapSource {
    id = 'objectSnap';

    constructor(private store: { getState: () => CanvasStore }) { }

    isEnabled(): boolean {
        const state = this.store.getState() as ObjectSnapStore;
        return state.objectSnap?.enabled ?? false;
    }

    getSnapPoints(context: SnapContext, point: Point): SnapPoint[] {
        const state = this.store.getState() as ObjectSnapStore;
        const objectSnap = state.objectSnap;
        const snapPointsConfig = state.snapPoints; // Global snap configuration

        if (!objectSnap?.enabled) return [];

        const elements = state.elements as CanvasElement[];

        const relevantElements = elements.filter((el: CanvasElement) =>
            (!state.isElementHidden || !state.isElementHidden(el.id))
        );

        // Build exclusion info for the element being edited
        let excludeCommands: Array<{ subpathIndex: number; commandIndex: number }> | undefined;
        let editElementId: string | undefined = undefined;
        let commandIndexForEdit: number | undefined = undefined;
        let pointIndexForEdit: number | undefined = undefined;

        const activePoint = context.dragPointInfo;

        if (activePoint) {
            const { elementId } = activePoint;
            const pointIndex = activePoint.pointIndex ?? activePoint.commandIndex ?? 0;
            const commandIndex = activePoint.commandIndex ?? pointIndex;
            editElementId = elementId;
            commandIndexForEdit = commandIndex;
            pointIndexForEdit = pointIndex;
            const excludeMidpointCommands = new Set<number>();

            // pointIndex here is actually the commandIndex (global)
            if (commandIndex === 0) {
                // Editing the M point (start point)
                excludeMidpointCommands.add(1);

                // Check if path is closed (has Z command)
                const element = elements.find(el => el.id === elementId);
                if (element && isPathElement(element) && element.data?.subPaths) {
                    const commands = element.data.subPaths.flat();
                    const zIndex = commands.findIndex(cmd => cmd.type === 'Z');
                    if (zIndex !== -1) {
                        excludeMidpointCommands.add(zIndex);
                    }
                }
            } else {
                // Editing a non-M point
                excludeMidpointCommands.add(commandIndex);     // Segment ending at this point
                excludeMidpointCommands.add(commandIndex + 1); // Segment starting from this point
            }

            excludeCommands = Array.from(excludeMidpointCommands).map(cmdIndex => ({
                subpathIndex: 0,
                commandIndex: cmdIndex
            }));
        }

        // When editing a point, exclude the element from intersection calculations
        const excludeElementIds = editElementId ? [editElementId] : undefined;

        // Filter function for additional filtering
        const filterSnapPoints = (snapPoints: SnapPoint[]) => {
            return snapPoints.filter(snapPoint => {
                // For the element being edited, apply stricter filtering
                if (editElementId && snapPoint.elementId === editElementId) {
                    // Exclude bbox-corner (bounding box corners)
                    if (snapPoint.type === 'bbox-corner') {
                        return false;
                    }

                    // Exclude midpoints that are bbox perimeter (no commandIndex in metadata)
                    // Segment midpoints have metadata.commandIndex, bbox midpoints don't
                    if (snapPoint.type === 'midpoint' && snapPoint.metadata?.commandIndex === undefined) {
                        return false;
                    }

                    // Exclude the exact anchor point being edited
                    if (commandIndexForEdit !== undefined || pointIndexForEdit !== undefined) {
                        // Never snap to the anchor of the element being edited
                        if ((snapPoint as { type: string }).type === 'anchor') {
                            return false;
                        }
                        if (
                            (snapPoint as { type: string }).type === 'anchor' &&
                            (
                                snapPoint.metadata?.commandIndex === commandIndexForEdit ||
                                snapPoint.metadata?.commandIndex === pointIndexForEdit
                            ) &&
                            snapPoint.metadata?.pointIndex === 0
                        ) {
                            return false;
                        }
                    }

                    // Exclude midpoints of adjacent segments
                    if (snapPoint.type === 'midpoint' &&
                        snapPoint.metadata?.commandIndex !== undefined &&
                        excludeCommands?.some(cmd => cmd.commandIndex === snapPoint.metadata?.commandIndex)) {
                        return false;
                    }
                }

                // Fallback: also exclude points that are very close (for safety)
                const dx = snapPoint.point.x - point.x;
                const dy = snapPoint.point.y - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= 0.5) {
                    return false;
                }

                return true;
            });
        };

        return collectSnapPoints(context, point, {
            sourceId: this.id,
            enableSnapping: true,
            elements: relevantElements,
            snapPointsConfig,
            excludeElementIds,
            excludeCommands,
            editElementId,
            filterSnapPoints,
            // No skipPathElementIds: we still want snap points of the edited path (minus filtered ones)
        });
    }
}
