import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { RoundPathPluginSlice } from './slice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { Panel } from '../../ui/Panel';

export const RoundPathPanel: React.FC = () => {
    const pathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).pathRounding);
    const selectedSubpaths = useCanvasStore((state) => (state as any).selectedSubpaths || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const updatePathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).updatePathRounding);
    const applyPathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).applyPathRounding);

    const hasSelectedSubpaths = selectedSubpaths && selectedSubpaths.length > 0;
    const roundPathLabel = hasSelectedSubpaths ? 'Round Subpath' : 'Round Path';

    return (
        <Panel
            title={roundPathLabel}
            isCollapsible={true}
            defaultOpen={false}
            headerActions={
                <PanelStyledButton
                    size="xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        applyPathRounding();
                    }}
                >
                    Apply
                </PanelStyledButton>
            }
        >
            <RenderCountBadgeWrapper componentName="RoundPathPanel" position="top-left" />
            <VStack spacing={1} align="stretch" pt={0.5} pb={0.5}>
                <Box pr={0.5}>
                    <SliderControl
                        label="Radius:"
                        value={pathRounding.radius}
                        min={0.1}
                        max={50}
                        step={0.1}
                        onChange={(value) => updatePathRounding({ radius: value })}
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
