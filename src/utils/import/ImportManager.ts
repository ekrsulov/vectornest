import { canvasStoreApi } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { logger } from '../logger';
import { translateCommands } from '../transformationUtils';
import {
    addImportedElementsToCanvas,
    translateImportedElements
} from '../importHelpers';
import { processSvgFile, createFrame, type ProcessedSvg } from '../importProcessingUtils';
import { updateGridLayout, INITIAL_GRID_LAYOUT, type GridLayoutState } from '../importLayoutUtils';
import { mergeImportedResources } from '../importContributionRegistry';
import { DEFAULT_MODE } from '../../constants';
import type { ImportedArtboardMetadata } from '../svg/importTypes';

export interface ImportOptions {
    appendMode?: boolean;
    resizeImport?: boolean;
    resizeWidth?: number;
    resizeHeight?: number;
    applyUnion?: boolean;
    addFrame?: boolean;
}

export class ImportManager {
    static async importFiles(files: FileList | File[], options: ImportOptions = {}): Promise<number> {
        const state = canvasStoreApi.getState();
        const {
            settings,
            addElement,
            updateElement,
            clearSelection,
            selectElements,
            setActivePlugin
        } = state;

        const {
            appendMode = false,
            resizeImport = settings.importResize,
            resizeWidth = settings.importResizeWidth,
            resizeHeight = settings.importResizeHeight,
            applyUnion = settings.importApplyUnion,
            addFrame = settings.importAddFrame
        } = options;

        if (!files || files.length === 0) return 0;

        try {

            if (!appendMode) {
                clearSelection();
            }

            const selectionIds: string[] = [];
            let importedPathCount = 0;
            let gridLayout = { ...INITIAL_GRID_LAYOUT };
            let importedGroupCounter = 1;
            const getNextGroupName = () => `Imported Group ${importedGroupCounter++}`;

            const currentElements = state.elements;
            const maxZIndex = currentElements.reduce((max, e) => Math.max(max, e.zIndex), -1);
            const globalZIndexCounter = { value: maxZIndex + 1 };

            // Single file imports should preserve original coordinates (no padding/offset)
            // unless extra processing is requested (frame, union, resize)
            const isSinglePlainImport = files.length === 1 && !addFrame && !applyUnion && !resizeImport;
            const shouldApplyImportedArtboard = files.length === 1 &&
                isSinglePlainImport &&
                (!appendMode || currentElements.length === 0);
            let importedArtboardMetadata: ImportedArtboardMetadata | null = null;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                const processed = await processSvgFile(file, {
                    resizeImport,
                    resizeWidth,
                    resizeHeight,
                    applyUnion
                });

                if (!processed) continue;

                // Process the imported content
                const {
                    workingElements,
                    pathDataArray,
                    bounds,
                    dimensions,
                    pluginImports,
                    artboardMetadata,
                    position
                } = this.processImportedContent(processed, gridLayout, isSinglePlainImport);

                // Update layout for next item
                gridLayout = position.newState;
                if (shouldApplyImportedArtboard && artboardMetadata) {
                    importedArtboardMetadata = artboardMetadata;
                }

                // Merge defined resources
                this.mergeResources(pluginImports);

                // Add frame if requested
                if (addFrame) {
                    const { frameId } = this.addFrameElement(
                        dimensions,
                        bounds,
                        position.translateX,
                        position.translateY,
                        resizeImport,
                        resizeWidth,
                        resizeHeight,
                        settings.defaultStrokeColor,
                        globalZIndexCounter,
                        addElement
                    );
                    selectionIds.push(frameId);
                    importedPathCount += 1;
                }

                // Add Elements to Canvas
                const { createdIds, childIds, sourceIdMap, hiddenElementIds } = addImportedElementsToCanvas(
                    workingElements,
                    addElement,
                    updateElement,
                    getNextGroupName,
                    null,
                    globalZIndexCounter
                );

                // Merge imported resources via contributions (includes animations)
                mergeImportedResources(pluginImports ?? {}, sourceIdMap, state);

                if (hiddenElementIds.length) {
                    hiddenElementIds.forEach((id) => state.toggleElementVisibility(id));
                }

                selectionIds.push(...childIds);
                importedPathCount += pathDataArray.length;

                logger.info('SVG file processed', {
                    fileName: file.name,
                    createdElementCount: createdIds.length
                });
            }

            if (shouldApplyImportedArtboard) {
                this.applyImportedArtboard(state, importedArtboardMetadata);
            }

            if (selectionIds.length > 0) {
                selectElements(selectionIds);
                setActivePlugin(DEFAULT_MODE);
            }

            return importedPathCount;

        } catch (error) {
            logger.error('ImportManager: Failed to import SVGs', error);
            throw error;
        }
    }

    private static processImportedContent(
        processed: ProcessedSvg,
        gridLayout: GridLayoutState,
        isSinglePlainImport: boolean
    ) {
        const {
            elements: initialElements,
            pathDataArray,
            bounds,
            dimensions,
            pluginImports,
            artboardMetadata,
        } = processed;
        const { width: finalGroupWidth, height: finalGroupHeight } = bounds;

        // Update Grid Layout (no padding if only one SVG without extras)
        const { newState, position } = updateGridLayout(
            gridLayout,
            finalGroupWidth,
            finalGroupHeight,
            { skipPadding: isSinglePlainImport }
        );

        // Calculate Translation
        const translateX = isSinglePlainImport ? 0 : position.x - bounds.minX;
        const translateY = isSinglePlainImport ? 0 : position.y - bounds.minY;

        const workingElements = translateImportedElements(initialElements, translateX, translateY);

        return {
            workingElements,
            pathDataArray,
            bounds,
            dimensions,
            pluginImports,
            artboardMetadata,
            position: { newState, translateX, translateY }
        };
    }

    private static applyImportedArtboard(
        state: CanvasStore,
        artboardMetadata: ImportedArtboardMetadata | null
    ) {
        if (!artboardMetadata) {
            return;
        }

        const storeWithArtboard = state as CanvasStore & {
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

        if (typeof storeWithArtboard.updateArtboardState !== 'function') {
            return;
        }

        const { exportBounds } = artboardMetadata;
        storeWithArtboard.updateArtboardState({
            enabled: artboardMetadata.enabled,
            selectedPresetId: artboardMetadata.selectedPresetId,
            customWidth: artboardMetadata.customWidth,
            customHeight: artboardMetadata.customHeight,
            backgroundColor: artboardMetadata.backgroundColor,
            showMargins: artboardMetadata.showMargins,
            marginSize: artboardMetadata.marginSize,
            exportBounds: {
                minX: exportBounds.minX,
                minY: exportBounds.minY,
                width: exportBounds.width,
                height: exportBounds.height,
            },
        });
    }

    private static mergeResources(pluginImports: Record<string, unknown[]>) {
        // Exclude animations from this early merge - they need element IDs which aren't available yet.
        // Animations will be processed in the second mergeImportedResources call after elements are created.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { animation, ...defsWithoutAnimations } = pluginImports ?? {};
        mergeImportedResources(defsWithoutAnimations, new Map<string, string>(), canvasStoreApi.getState());
    }

    private static addFrameElement(
        dimensions: { width: number, height: number },
        bounds: { width: number, height: number },
        translateX: number,
        translateY: number,
        resizeImport: boolean,
        resizeWidth: number,
        resizeHeight: number,
        strokeColor: string,
        globalZIndexCounter: { value: number },
        addElement: (element: { type: string; data: Record<string, unknown> }, zIndex?: number) => string
    ) {
        const frameWidth = resizeImport ? resizeWidth : (dimensions.width || bounds.width);
        const frameHeight = resizeImport ? resizeHeight : (dimensions.height || bounds.height);
        const frame = createFrame(frameWidth, frameHeight, strokeColor);

        const translatedFrameSubPaths = frame.subPaths.map(subPath =>
            translateCommands(subPath, translateX, translateY)
        );

        const translatedFrame = {
            ...frame,
            subPaths: translatedFrameSubPaths,
        };

        const frameZIndex = globalZIndexCounter.value++;
        const frameId = addElement({
            type: 'path',
            data: translatedFrame,
        }, frameZIndex);

        return { frameId, frameZIndex };
    }
}
