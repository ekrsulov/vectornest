import React from 'react';
import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';

interface PencilPanelProps { hideTitle?: boolean }

export const PencilPanel: React.FC<PencilPanelProps> = ({ hideTitle = false }) => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);

  const handlePathModeChange = (mode: 'new' | 'add') => {
    updatePencilState?.({ reusePath: mode === 'add' });
  };

  const currentMode = (pencil?.reusePath ?? false) ? 'add' : 'new';

  return (
    <Panel title="Pencil" hideHeader={hideTitle}>
      <VStack spacing={2} align="stretch" pb={0.5}>
        {/* Path Mode Selection */}
        <HStack spacing={1} justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>Path Mode:</Text>
          <JoinedButtonGroup
            options={[
              { value: 'add', label: 'Add' },
              { value: 'new', label: 'New' }
            ]}
            value={currentMode}
            onChange={handlePathModeChange}
            size="sm"
          />
        </HStack>

        <Box pr={0.5}>
          <SliderControl
            label="Tolerance:"
            value={pencil?.simplificationTolerance ?? 0}
            min={0}
            max={10}
            step={0.1}
            onChange={(value) => updatePencilState?.({ simplificationTolerance: value })}
            formatter={(value) => value.toFixed(1)}
            labelWidth="60px"
            valueWidth="35px"
            marginBottom='0'
          />
        </Box>
      </VStack>
    </Panel>
  );
};
