import React from 'react';
import { VStack, HStack, FormControl, FormLabel, useColorModeValue, Badge } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { Undo2, Redo2 } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import type { CanvasStore } from '../../store/canvasStore';
import type { PenPluginSlice } from './slice';

import { undoPathPoint, redoPathPoint, closePath, finalizePath, cancelPath } from './actions';

/**
 * Get badge color based on pen mode
 */
const getModeBadgeColor = (mode: string): string => {
    switch (mode) {
        case 'idle': return 'gray';
        case 'drawing': return 'green';
        case 'editing': return 'blue';
        case 'continuing': return 'orange';
        default: return 'gray';
    }
};

/**
 * Selector for pen panel state - only includes properties needed for the UI
 * Excludes frequently-changing properties like previewAnchor, hoverTarget, 
 * cursorState, dragState, activeGuidelines to prevent unnecessary re-renders
 */
const selectPenPanelState = (state: CanvasStore) => {
    const penState = (state as unknown as PenPluginSlice).pen;
    if (!penState) {
        return null;
    }

    // Calculate derived values here to avoid subscribing to the entire currentPath object
    const currentPath = penState.currentPath;
    const anchorsCount = currentPath?.anchors?.length ?? 0;
    const hasHandles = currentPath?.anchors?.some(
        (a: { inHandle?: unknown; outHandle?: unknown }) => a.inHandle || a.outHandle
    ) ?? false;

    return {
        // Preferences (change infrequently)
        autoAddDelete: penState.autoAddDelete,
        guidelinesEnabled: penState.guidelinesEnabled,
        showHandleDistance: penState.showHandleDistance,
        // Mode (changes on state transitions, not on mouse move)
        mode: penState.mode,
        // Derived values for undo/redo (avoid subscribing to full arrays)
        pathHistoryIndex: penState.pathHistoryIndex,
        pathHistoryLength: penState.pathHistory?.length ?? 0,
        // Derived values for path actions (avoid subscribing to full currentPath)
        hasPath: !!currentPath,
        anchorsCount,
        canClosePath: anchorsCount >= 3 || (anchorsCount === 2 && hasHandles),
        canFinishPath: anchorsCount >= 2,
    };
};

export const PenPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const panelState = useShallowCanvasSelector(selectPenPanelState);
    const updatePenState = useCanvasStore((state) => state.updatePenState);

    const labelColor = useColorModeValue('gray.600', 'gray.300');

    if (!panelState || !updatePenState) {
        return null;
    }

    const {
        autoAddDelete,
        guidelinesEnabled,
        showHandleDistance,
        mode,
        pathHistoryIndex,
        pathHistoryLength,
        hasPath,
        canClosePath,
        canFinishPath,
    } = panelState;

    // Check if undo/redo are available
    const canUndo = mode === 'drawing' && (pathHistoryIndex ?? -1) > 0;
    const canRedo = mode === 'drawing' && (pathHistoryIndex ?? -1) < (pathHistoryLength - 1);

    // Mode badge for header
    const modeBadge = (
        <Badge
            colorScheme={getModeBadgeColor(mode)}
            fontSize="9px"
            textTransform="capitalize"
            variant="subtle"
        >
            {mode}
        </Badge>
    );

    return (
        <Panel title="Pen Tool" hideHeader={hideTitle} headerActions={modeBadge}>
            <VStack spacing={0} align="stretch">
                {/* Tool Preferences */}
                <VStack spacing={1} align="stretch">
                    <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="auto-add-delete" mb="0" fontSize="12px" flex="1" color={labelColor}>
                            Auto Add/Delete
                        </FormLabel>
                        <PanelSwitch
                            id="auto-add-delete"
                            isChecked={autoAddDelete}
                            onChange={(e) => updatePenState({ autoAddDelete: e.target.checked })}
                        />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="guidelines-enabled" mb="0" fontSize="12px" flex="1" color={labelColor}>
                            Snap to Guidelines
                        </FormLabel>
                        <PanelSwitch
                            id="guidelines-enabled"
                            isChecked={guidelinesEnabled}
                            onChange={(e) => updatePenState({ guidelinesEnabled: e.target.checked })}
                        />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="show-handle-distance" mb="0" fontSize="12px" flex="1" color={labelColor}>
                            Show Handle Distance
                        </FormLabel>
                        <PanelSwitch
                            id="show-handle-distance"
                            isChecked={showHandleDistance}
                            onChange={(e) => updatePenState({ showHandleDistance: e.target.checked })}
                        />
                    </FormControl>
                </VStack>

                {/* Actions */}
                {mode === 'drawing' && (
                    <VStack spacing={0} align="stretch">
                        {/* Undo/Redo buttons */}
                        <HStack spacing={5} justify="center">
                            <PanelActionButton
                                label="Undo point (⌘Z)"
                                icon={Undo2}
                                onClick={() => undoPathPoint(useCanvasStore.getState)}
                                isDisabled={!canUndo}
                            />
                            <PanelActionButton
                                label="Redo point (⌘⇧Z)"
                                icon={Redo2}
                                onClick={() => redoPathPoint(useCanvasStore.getState)}
                                isDisabled={!canRedo}
                            />
                        </HStack>

                        {/* Path actions */}
                        <HStack spacing={1}>
                            <PanelStyledButton
                                size="md"
                                flex={1}
                                isDisabled={!canClosePath}
                                onClick={() => closePath(useCanvasStore.getState)}
                            >
                                Close
                            </PanelStyledButton>
                            <PanelStyledButton
                                size="md"
                                flex={1}
                                isDisabled={!hasPath || !canFinishPath}
                                onClick={() => finalizePath(useCanvasStore.getState)}
                            >
                                Finish
                            </PanelStyledButton>
                            <PanelStyledButton
                                size="md"
                                flex={1}
                                onClick={() => cancelPath(useCanvasStore.getState)}
                            >
                                Cancel
                            </PanelStyledButton>
                        </HStack>
                    </VStack>
                )}
            </VStack>
        </Panel>
    );
};

