import React from 'react';
import { VStack, HStack, Text, Tag } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import type { ShapeBuilderSlice } from './slice';

interface ShapeBuilderPanelProps {
    hideTitle?: boolean;
}

/**
 * Shape Builder panel following plugin-panel-style.md guidelines.
 * Shows mode toggle (merge/subtract) and color-while-building option.
 */
export const ShapeBuilderPanel: React.FC<ShapeBuilderPanelProps> = ({ hideTitle = false }) => {
    const shapeBuilder = useCanvasStore(
        state => (state as unknown as ShapeBuilderSlice).shapeBuilder
    );
    const updateShapeBuilderState = useCanvasStore(
        state => (state as unknown as ShapeBuilderSlice).updateShapeBuilderState
    );

    const mode = shapeBuilder?.mode ?? 'merge';
    const regionsCount = shapeBuilder?.regions?.length ?? 0;

    const handleModeChange = (newMode: 'merge' | 'subtract') => {
        updateShapeBuilderState?.({ mode: newMode });
    };

    return (
        <Panel 
            title="Shape Builder" 
            hideHeader={hideTitle}
            headerActions={
                regionsCount > 0 ? (
                    <Tag size="sm" colorScheme="blue" fontSize="xs">
                        {regionsCount} {regionsCount === 1 ? 'region' : 'regions'}
                    </Tag>
                ) : null
            }
        >
            <VStack spacing={1} align="stretch">
                {/* Mode selection */}
                <HStack spacing={1} justify="space-between">
                    <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>Mode:</Text>
                    <JoinedButtonGroup
                        options={[
                            { value: 'subtract', label: 'Subtract' },
                            { value: 'merge', label: 'Merge' }
                        ]}
                        value={mode}
                        onChange={handleModeChange}
                        size="sm"
                    />
                </HStack>
            </VStack>
        </Panel>
    );
};
