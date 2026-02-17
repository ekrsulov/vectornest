import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

const ObjectSnapPanelComponent: React.FC = () => {
  // Subscribe to objectSnap state
  const objectSnap = useCanvasStore(state => state.objectSnap);
  const updateObjectSnapState = useCanvasStore(state => state.updateObjectSnapState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateObjectSnapState ?? (() => { }));
  const handleToggleObjectSnap = createToggleHandler('enabled');

  const isEnabled = objectSnap?.enabled ?? false;

  return (
    <Panel
      title="Object Snap"
      isCollapsible={false}
      headerActions={<PanelSwitch isChecked={isEnabled} onChange={handleToggleObjectSnap} title="Enable OSNAP" aria-label="Enable OSNAP" />}
    >
      <VStack spacing={2} align="stretch">
        {/* All snap visualization controls removed - now in Editor Panel */}
      </VStack>
    </Panel>
  );
};

// Export memoized version
export const ObjectSnapPanel = React.memo(ObjectSnapPanelComponent);
