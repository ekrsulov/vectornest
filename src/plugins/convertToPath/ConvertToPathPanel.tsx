import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { convertSelectionToPaths, countConvertibleShapes } from './conversion';

export const ConvertToPathPanel: React.FC = () => {
  const convertibleCount = useCanvasStore((state) => countConvertibleShapes(state.selectedIds ?? [], state.elements ?? []));
  const hasConvertible = convertibleCount > 0;

  const handleConvert = () => {
    convertSelectionToPaths();
  };

  const label = hasConvertible
    ? (convertibleCount > 1 ? `Convert ${convertibleCount} items` : 'Convert selection')
    : 'No convertible shapes in selection';

  return (
    <Panel
      title="Convert to Path"
      isCollapsible
      defaultOpen={false}
    >
      <VStack spacing={0.5} align="stretch">
        <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
          Convert native shapes in the current selection into normalized paths.
        </Text>
        {!hasConvertible && (
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.500' }}>
            Select rectangles, circles, polygons or other native shapes to enable conversion.
          </Text>
        )}
        <PanelStyledButton onClick={handleConvert} isDisabled={!hasConvertible}>
          {label}
        </PanelStyledButton>
        {hasConvertible && (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.500' }}>
            {convertibleCount} native shape{convertibleCount === 1 ? '' : 's'} detected in the selection.
          </Text>
        )}
      </VStack>
    </Panel>
  );
};
