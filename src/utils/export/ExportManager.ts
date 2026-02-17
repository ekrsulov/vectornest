import {
    exportSelection,
    serializePathsForExport
} from '../exportUtils';
import { canvasStoreApi, type CanvasStore } from '../../store/canvasStore';
import { defsContributionRegistry } from '../defsContributionRegistry';
import { prepareExportAnimationState } from '../animationStatePreparation';

export class ExportManager {
    static exportSelection(
        format: 'svg' | 'png',
        documentName: string,
        selectedOnly: boolean = false,
        padding: number = 20,
        state: CanvasStore = canvasStoreApi.getState()
    ): void {
        const { elements, selectedIds } = state;
        const defs = defsContributionRegistry.serializeDefs(state, elements);

        exportSelection(
            format,
            elements,
            selectedIds,
            documentName,
            selectedOnly,
            padding,
            defs,
            state
        );
    }

    static generateSvgContent(
        selectedOnly: boolean = false,
        padding: number = 0,
        state: CanvasStore = canvasStoreApi.getState()
    ): { content: string, hasUnsavedChanges: boolean } {
        const exportState = prepareExportAnimationState(state);

        const { elements, selectedIds } = exportState;
        const defs = defsContributionRegistry.serializeDefs(exportState, elements);

        const result = serializePathsForExport(elements, selectedIds, {
            selectedOnly,
            padding,
            defs,
            state: exportState,
        });

        return {
            content: result ? result.svgContent : '',
            hasUnsavedChanges: false
        };
    }
}
