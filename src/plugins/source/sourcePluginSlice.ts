import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import { processSvgFile } from '../../utils/importProcessingUtils';
import type { ImportedAnimation } from '../animationSystem';
import type { ClipDefinition, ClippingPluginSlice } from '../clipping/slice';
import { mergeImportedResources } from '../../utils/importContributionRegistry';
import { addImportedElementsToCanvas } from '../../utils/importHelpers';
import type { MaskDefinition, MasksSlice } from '../masks/types';
import { generateShortId } from '../../utils/idGenerator';

type FullStore = CanvasStore & SourcePluginSlice & ClippingPluginSlice & MasksSlice;

export interface SourcePluginSlice {
    source: {
        isDialogOpen: boolean;
        svgContent: string;
        hasUnsavedChanges: boolean;
    };
    setSourceDialogOpen: (isOpen: boolean) => void;
    setSourceSvgContent: (content: string) => void;
    setSourceHasUnsavedChanges: (hasChanges: boolean) => void;
    importSvgToCanvas: (file: File) => Promise<void>;
}

export const createSourcePluginSlice: StateCreator<
    CanvasStore,
    [],
    [],
    SourcePluginSlice
> = (set, get) => ({
    source: {
        isDialogOpen: false,
        svgContent: '',
        hasUnsavedChanges: false,
    },
    setSourceDialogOpen: (isOpen) =>
        set((state) => ({
            source: { ...state.source, isDialogOpen: isOpen },
        })),
    setSourceSvgContent: (content) =>
        set((state) => ({
            source: { ...state.source, svgContent: content },
        })),
    setSourceHasUnsavedChanges: (hasChanges) =>
        set((state) => ({
            source: { ...state.source, hasUnsavedChanges: hasChanges },
        })),
    importSvgToCanvas: async (file: File) => {
        try {
            // Use the same import pipeline as the File panel to keep behavior consistent
            const processed = await processSvgFile(file, {
                resizeImport: false,
                resizeWidth: 0,
                resizeHeight: 0,
                applyUnion: false,
            });

            if (!processed) {
                throw new Error('No elements found in SVG');
            }

            const { elements: importedElements, pluginImports, artboardMetadata } = processed;

            // For Source plugin, we clear existing elements and replace with new ones
            // We use a temporary set of elements to avoid intermediate renders
            const tempElements: CanvasElement[] = [];
            const globalZIndexCounter = { value: 0 };

            // Re-use core addImportedElementsToCanvas logic
            const { sourceIdMap, hiddenElementIds } = addImportedElementsToCanvas(
                importedElements,
                (element, zIndex) => {
                    const id = generateShortId('el');
                    tempElements.push({ ...element, id, zIndex: zIndex! } as CanvasElement);
                    return id;
                },
                (id, updates) => {
                    const idx = tempElements.findIndex(el => el.id === id);
                    if (idx !== -1) {
                        const element = tempElements[idx];
                        const updatedData = updates.data
                            ? { ...element.data, ...(updates.data as Record<string, unknown>) }
                            : element.data;
                        tempElements[idx] = { ...element, ...updates, data: updatedData } as CanvasElement;
                    }
                },
                () => `Imported Group ${Math.floor(Math.random() * 1000)}`,
                null,
                globalZIndexCounter
            );

            // Update main state
            set(() => ({
                elements: tempElements,
                hiddenElementIds,
                selectedIds: [],
                activePlugin: 'select',
            }));

            if (artboardMetadata) {
                const storeWithArtboard = get() as FullStore & {
                    updateArtboardState?: (updates: {
                        enabled?: boolean;
                        selectedPresetId?: string | null;
                        customWidth?: number;
                        customHeight?: number;
                        backgroundColor?: string;
                        showMargins?: boolean;
                        marginSize?: number;
                        exportBounds?: {
                            minX: number;
                            minY: number;
                            width: number;
                            height: number;
                        } | null;
                    }) => void;
                };

                storeWithArtboard.updateArtboardState?.({
                    enabled: artboardMetadata.enabled,
                    selectedPresetId: artboardMetadata.selectedPresetId,
                    customWidth: artboardMetadata.customWidth,
                    customHeight: artboardMetadata.customHeight,
                    backgroundColor: artboardMetadata.backgroundColor,
                    showMargins: artboardMetadata.showMargins,
                    marginSize: artboardMetadata.marginSize,
                    exportBounds: { ...artboardMetadata.exportBounds },
                });
            }

            // Merge imported definitions using shared utilities
            // Exclude animations here - they need sourceIdMap and will be merged separately below
            const { animation: _animations, ...pluginImportsWithoutAnimations } = pluginImports ?? {};
            mergeImportedResources(pluginImportsWithoutAnimations, new Map<string, string>(), get() as FullStore);
            const importedClips = pluginImports?.clip as ClipDefinition[] | undefined;
            if (importedClips?.length) {
                const clipState = get() as FullStore;
                const existingClips = clipState.clips ?? [];
                const mergedById = new Map<string, ClipDefinition>();
                [...existingClips, ...importedClips].forEach((c) => {
                    mergedById.set(c.id, { ...c, name: c.name ?? c.id });
                });
                const mergedClips = Array.from(mergedById.values());
                set(() => ({
                    clips: mergedClips,
                }));
            }
            const importedMasks = pluginImports?.mask as MaskDefinition[] | undefined;
            mergeImportedResources({ mask: importedMasks ?? [] }, new Map<string, string>(), get() as FullStore);
            if (importedMasks?.length) {
                const maskState = get() as FullStore;
                const existingMasks = maskState.masks ?? [];
                const mergedById = new Map<string, MaskDefinition>();
                [...existingMasks, ...importedMasks].forEach((m) => {
                    mergedById.set(m.id, { ...m, name: m.name ?? m.id });
                });
                const mergedMasks = Array.from(mergedById.values());
                set(() => ({
                    masks: mergedMasks,
                    importedMasks: mergedMasks,
                }));
            }

            // Merge animations using the remapped element IDs
            mergeImportedResources({ animation: pluginImports?.animation as ImportedAnimation[] | undefined ?? [] }, sourceIdMap, get() as FullStore);

            // Reset unsaved changes and close dialog
            set((state) => ({
                source: {
                    ...state.source,
                    hasUnsavedChanges: false,
                    isDialogOpen: false,
                }
            }));

        } catch (error) {
            console.error('Failed to import SVG:', error);
            throw error;
        }
    },
});
