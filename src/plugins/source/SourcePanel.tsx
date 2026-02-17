import React from 'react';
import { VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import type { SourcePluginSlice } from './sourcePluginSlice';
import { SourceDialog } from './SourceDialog';

export const SourcePanel: React.FC = () => {
    const setSourceDialogOpen = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceDialogOpen
    );

    const handleOpenDialog = () => {
        setSourceDialogOpen(true);
    };

    return (
        <Panel hideHeader={true}>
            <VStack spacing={2} align="stretch">
                <PanelStyledButton onClick={handleOpenDialog}>
                    SVG Source
                </PanelStyledButton>
            </VStack>
            <SourceDialog />
        </Panel>
    );
};
