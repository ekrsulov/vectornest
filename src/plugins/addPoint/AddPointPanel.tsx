import React from 'react';
import { Box, Flex, Heading } from '@chakra-ui/react';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { AddPointPluginSlice } from './slice';
import { panelSpacing } from '../../theme/spacing';

export const AddPointPanel: React.FC = () => {
    const addPointMode = useCanvasStore((state) => (state as unknown as AddPointPluginSlice).addPointMode);
    const activateAddPointMode = useCanvasStore((state) => (state as unknown as AddPointPluginSlice).activateAddPointMode);
    const deactivateAddPointMode = useCanvasStore((state) => (state as unknown as AddPointPluginSlice).deactivateAddPointMode);

    return (
        <Box position="relative" pt={panelSpacing.betweenPanels}>
            <RenderCountBadgeWrapper componentName="AddPointPanel" position="top-left" />
            <Flex justify="space-between" align="center" minH="24px">
                <Heading size="xs" fontWeight="extrabold">
                    Add Point
                </Heading>
                <PanelSwitch
                    isChecked={addPointMode?.isActive || false}
                    onChange={(e) => {
                        if (e.target.checked) {
                            activateAddPointMode?.();
                        } else {
                            deactivateAddPointMode?.();
                        }
                    }}
                />
            </Flex>
        </Box>
    );
};
