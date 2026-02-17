import type { Point, PathData } from '../../types';
import { computeRegionsFromPaths, mergeRegions } from './regionUtils';

/** A region is a closed area formed by intersecting paths */
export interface Region {
    /** Unique identifier for this region */
    id: string;
    /** Path data defining this region's boundary */
    pathData: PathData;
    /** Bounding box for quick hit testing */
    bounds: { x: number; y: number; width: number; height: number };
    /** Center point of the region */
    center: Point;
    /** Source element IDs that contributed to this region */
    sourceElementIds: string[];
}

export interface ShapeBuilderState {
    /** Whether shape builder mode is active */
    enabled: boolean;
    /** Current interaction mode */
    mode: 'merge' | 'subtract';
    /** Detected intersection regions from selected paths */
    regions: Region[];
    /** Currently hovered region ID */
    hoveredRegionId: string | null;
    /** Region IDs collected during drag operation */
    selectedRegionIds: string[];
    /** Whether user is currently dragging */
    isDragging: boolean;
    /** Starting point of drag operation */
    dragStartPoint: Point | null;
    /** Path of points during drag for visual feedback */
    dragPath: Point[];
}

export interface ShapeBuilderSlice {
    shapeBuilder?: ShapeBuilderState;
    updateShapeBuilderState?: (update: Partial<ShapeBuilderState>) => void;
    computeShapeBuilderRegions?: () => void;
    mergeShapeBuilderRegions?: (regionIds: string[]) => void;
    subtractShapeBuilderRegions?: (regionIds: string[]) => void;
    applyShapeBuilderOperation?: () => void;
}

const DEFAULT_STATE: ShapeBuilderState = {
    enabled: true,
    mode: 'merge',
    regions: [],
    hoveredRegionId: null,
    selectedRegionIds: [],
    isDragging: false,
    dragStartPoint: null,
    dragPath: [],
};

export const createShapeBuilderSlice = (
    set: (partial: Partial<ShapeBuilderSlice> | ((state: ShapeBuilderSlice) => Partial<ShapeBuilderSlice>)) => void,
    get: () => ShapeBuilderSlice & { selectedIds?: string[]; elements?: Array<{ id: string; type: string; data: unknown }> },
): ShapeBuilderSlice => {

    const computeRegions = async () => {
        const state = get();
        const selectedIds = state.selectedIds ?? [];
        const elements = state.elements ?? [];

        // Get selected path elements
        const pathElements = elements.filter(
            el => selectedIds.includes(el.id) && el.type === 'path'
        );

        if (pathElements.length < 2) {
            set({ shapeBuilder: { ...DEFAULT_STATE, regions: [] } });
            return;
        }

        const pathDataArray = pathElements.map(el => ({
            pathData: el.data as PathData,
            elementId: el.id,
        }));

        const regions = computeRegionsFromPaths(pathDataArray);

        set(state => ({
            shapeBuilder: {
                ...(state.shapeBuilder ?? DEFAULT_STATE),
                regions,
            },
        }));
    };

    return {
        shapeBuilder: DEFAULT_STATE,

        updateShapeBuilderState: (update) => {
            set(state => ({
                shapeBuilder: {
                    ...(state.shapeBuilder ?? DEFAULT_STATE),
                    ...update,
                },
            }));
        },

        computeShapeBuilderRegions: () => {
            computeRegions();
        },

        mergeShapeBuilderRegions: async (regionIds) => {
            if (regionIds.length < 2) return;

            const state = get();
            const shapeBuilder = state.shapeBuilder ?? DEFAULT_STATE;
            const regions = shapeBuilder.regions;

            const regionsToMerge = regions.filter(r => regionIds.includes(r.id));
            if (regionsToMerge.length < 2) return;

            const mergedPathData = mergeRegions(regionsToMerge);
            if (!mergedPathData) return;

            // This will be handled by the caller to create the new element
            // For now, just clear the state
            set(state => ({
                shapeBuilder: {
                    ...(state.shapeBuilder ?? DEFAULT_STATE),
                    selectedRegionIds: [],
                    isDragging: false,
                    dragPath: [],
                },
            }));
        },

        subtractShapeBuilderRegions: async (regionIds) => {
            if (regionIds.length === 0) return;

            // Subtract removes the selected regions from the result
            // Implementation will be in regionUtils
            set(state => ({
                shapeBuilder: {
                    ...(state.shapeBuilder ?? DEFAULT_STATE),
                    selectedRegionIds: [],
                    isDragging: false,
                    dragPath: [],
                },
            }));
        },

        applyShapeBuilderOperation: async () => {
            const state = get();
            const shapeBuilder = state.shapeBuilder ?? DEFAULT_STATE;

            if (shapeBuilder.selectedRegionIds.length === 0) return;

            if (shapeBuilder.mode === 'merge') {
                const { mergeShapeBuilderRegions } = get();
                mergeShapeBuilderRegions?.(shapeBuilder.selectedRegionIds);
            } else {
                const { subtractShapeBuilderRegions } = get();
                subtractShapeBuilderRegions?.(shapeBuilder.selectedRegionIds);
            }
        },
    };
};
