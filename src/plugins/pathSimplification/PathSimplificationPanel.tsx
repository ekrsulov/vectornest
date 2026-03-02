import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { PathSimplificationPluginSlice } from './slice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { Panel } from '../../ui/Panel';

export const PathSimplificationPanel: React.FC = () => {
    const pathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).pathSimplification);
    const selectedSubpaths = useCanvasStore((state) => state.selectedSubpaths ?? []);
    const updatePathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).updatePathSimplification);
    const applyPathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).applyPathSimplification);

    const hasSelectedSubpaths = selectedSubpaths && selectedSubpaths.length > 0;
    const pathSimplificationLabel = hasSelectedSubpaths ? 'Subpath Simplification' : 'Path Simplification';

    return (
        <Panel
            title={pathSimplificationLabel}
            isCollapsible={true}
            defaultOpen={false}
            headerActions={
                <PanelStyledButton
                    size="xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        applyPathSimplification();
                    }}
                >
                    Apply
                </PanelStyledButton>
            }
        >
            <RenderCountBadgeWrapper componentName="PathSimplificationPanel" position="top-left" />
            <VStack spacing={1} align="stretch" pt={0.5} pb={0.5}>
                <Box pr={0.5}>
                    <SliderControl
                        label="Tolerance"
                        value={pathSimplification.tolerance}
                        min={0}
                        max={10}
                        step={1}
                        onChange={(value) => updatePathSimplification({ tolerance: value })}
                        formatter={(value) => value.toFixed(1)}
                        labelWidth="60px"
                        valueWidth="40px"
                        marginBottom="0"
                    />
                </Box>
            </VStack>
        </Panel>
    );
};
