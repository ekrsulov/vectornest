import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import type { CanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import type { BatchSimplifyPluginSlice } from './slice';

const selectBatchSimplifyPanelState = (state: CanvasStore) => {
    const batchSimplifyState = (state as unknown as BatchSimplifyPluginSlice).batchSimplify;
    const selectedIds = state.selectedIds ?? [];
    const elements = state.elements ?? [];

    const pathCount = selectedIds.filter((id) => {
        const element = elements.find((candidate) => candidate.id === id);
        return element?.type === 'path';
    }).length;

    return {
        tolerance: batchSimplifyState?.tolerance ?? 1,
        updateBatchSimplify: (state as unknown as BatchSimplifyPluginSlice).updateBatchSimplify,
        applyBatchSimplify: (state as unknown as BatchSimplifyPluginSlice).applyBatchSimplify,
        pathCount,
    };
};

export const BatchSimplifyPanel: React.FC = () => {
    const {
        tolerance,
        updateBatchSimplify,
        applyBatchSimplify,
        pathCount,
    } = useShallowCanvasSelector(selectBatchSimplifyPanelState);

    const hasSelection = pathCount > 0;

    const applyLabel = hasSelection
        ? pathCount === 1
            ? 'Apply to 1 path'
            : `Apply to ${pathCount} paths`
        : 'No paths selected';

    return (
        <Panel
            title="Batch Simplify"
            isCollapsible
            defaultOpen={false}
        >
            <VStack spacing={1} align="stretch">
                <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
                    Simplify all selected path elements at once using the same tolerance.
                </Text>
                <Box pr={0.5}>
                    <SliderControl
                        label="Tolerance"
                        value={tolerance}
                        min={0}
                        max={10}
                        step={1}
                        onChange={(value) => updateBatchSimplify?.({ tolerance: value })}
                        formatter={(value) => value.toFixed(1)}
                        labelWidth="68px"
                        valueWidth="40px"
                        marginBottom="0"
                    />
                </Box>
                <PanelStyledButton
                    onClick={() => applyBatchSimplify?.()}
                    isDisabled={!hasSelection}
                >
                    {applyLabel}
                </PanelStyledButton>
                {hasSelection && (
                    <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }}>
                        {pathCount} path{pathCount === 1 ? '' : 's'} detected in selection.
                    </Text>
                )}
            </VStack>
        </Panel>
    );
};
