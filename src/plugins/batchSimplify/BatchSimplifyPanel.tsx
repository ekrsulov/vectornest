import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import type { BatchSimplifyPluginSlice } from './slice';

export const BatchSimplifyPanel: React.FC = () => {
    const batchSimplify = useCanvasStore(
        (state) => (state as unknown as BatchSimplifyPluginSlice).batchSimplify
    );
    const updateBatchSimplify = useCanvasStore(
        (state) => (state as unknown as BatchSimplifyPluginSlice).updateBatchSimplify
    );
    const applyBatchSimplify = useCanvasStore(
        (state) => (state as unknown as BatchSimplifyPluginSlice).applyBatchSimplify
    );

    const selectedIds = useCanvasStore((state) => state.selectedIds ?? []);
    const elements = useCanvasStore((state) => state.elements ?? []);

    const pathCount = selectedIds.filter((id) => {
        const el = elements.find((e) => e.id === id);
        return el?.type === 'path';
    }).length;

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
                        value={batchSimplify?.tolerance ?? 1}
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
