import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { PathElement, PathData } from '../../../types';
import type { GlobalStyleProperties, CopiedStyleProperties } from '../../../types/style';
import { DEFAULT_STROKE_COLOR_LIGHT } from '../../../utils/defaultColors';
import { buildElementMap } from '../../../utils/elementMapUtils';

const extractStyleFromPathData = (pathData: PathData): CopiedStyleProperties => ({
    strokeWidth: pathData.strokeWidth,
    strokeColor: pathData.strokeColor,
    strokeOpacity: pathData.strokeOpacity,
    fillColor: pathData.fillColor,
    fillOpacity: pathData.fillOpacity,
    strokeLinecap: pathData.strokeLinecap,
    strokeLinejoin: pathData.strokeLinejoin,
    fillRule: pathData.fillRule,
    strokeDasharray: pathData.strokeDasharray,
    opacity: pathData.opacity ?? 1,
});

/**
 * Global style configuration slice
 * Controls stroke/fill properties shared across all drawing plugins
 * (Pencil, Pen, Shape, Text, Arrows, GridFill)
 */
export interface StyleSlice {
    style: GlobalStyleProperties;

    // Style eyedropper state
    styleEyedropper: {
        isActive: boolean;
        copiedStyle: CopiedStyleProperties | null;
    };

    // Actions
    updateStyle: (state: Partial<StyleSlice['style']>) => void;
    activateStyleEyedropper: () => void;
    deactivateStyleEyedropper: () => void;
    copyStyleFromPath: (pathId: string) => void;
    applyStyleToPath: (pathId: string) => void;
}

export const createStyleSlice: StateCreator<
    CanvasStore,
    [],
    [],
    StyleSlice
> = (set, get) => ({
    style: {
        // Stroke defaults
        strokeWidth: 4,
        strokeColor: DEFAULT_STROKE_COLOR_LIGHT,
        strokeOpacity: 1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeDasharray: 'none',

        // Fill defaults
        fillColor: 'none',
        fillOpacity: 1,
        fillRule: 'nonzero',

        // Global defaults
        opacity: 1,
    },

    styleEyedropper: {
        isActive: false,
        copiedStyle: null,
    },

    updateStyle: (updates) => {
        set((state) => ({
            style: {
                ...state.style,
                ...updates,
            },
        }));
    },

    activateStyleEyedropper: () => {
        const state = get();
        // Copy style from the currently selected path
        const selectedSet = new Set(state.selectedIds);
        const selectedPaths = state.elements.filter(
            el => selectedSet.has(el.id) && el.type === 'path'
        ) as PathElement[];

        if (selectedPaths.length === 1) {
            const pathData = selectedPaths[0].data as PathData;
            set({
                styleEyedropper: {
                    isActive: true,
                    copiedStyle: extractStyleFromPathData(pathData),
                },
            });
        }
    },

    deactivateStyleEyedropper: () => {
        set({
            styleEyedropper: {
                isActive: false,
                copiedStyle: null,
            },
        });
    },

    copyStyleFromPath: (pathId: string) => {
        const state = get();
        const elementMap = buildElementMap(state.elements);
        const element = elementMap.get(pathId) as PathElement | undefined;
        if (element && element.type === 'path') {
            const pathData = element.data as PathData;
            set((currentState) => ({
                styleEyedropper: {
                    ...currentState.styleEyedropper,
                    copiedStyle: extractStyleFromPathData(pathData),
                },
            }));
        }
    },

    applyStyleToPath: (pathId: string) => {
        const state = get();
        const { copiedStyle, isActive } = state.styleEyedropper;

        if (isActive && copiedStyle) {
            state.updateElement(pathId, {
                data: copiedStyle,
            });
            // Deactivate after applying
            state.deactivateStyleEyedropper();
        }
    },
});
