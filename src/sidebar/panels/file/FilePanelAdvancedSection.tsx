import React from 'react';
import { Flex, Text, VStack } from '@chakra-ui/react';
import { NumberInput } from '../../../ui/NumberInput';
import { PanelSwitch } from '../../../ui/PanelSwitch';

interface FilePanelImportOptionsProps {
  appendToExisting: boolean;
  onAppendToExistingChange: (checked: boolean) => void;
  addFrame: boolean;
  onAddFrameChange: (checked: boolean) => void;
  applyUnion: boolean;
  onApplyUnionChange: (checked: boolean) => void;
  resizeImport: boolean;
  onResizeImportChange: (checked: boolean) => void;
  resizeWidth: number;
  onResizeWidthChange: (value: number) => void;
  resizeHeight: number;
  onResizeHeightChange: (value: number) => void;
  swapColors: boolean;
  onSwapColorsChange: (checked: boolean) => void;
}

export const FilePanelImportOptions: React.FC<FilePanelImportOptionsProps> = ({
  appendToExisting,
  onAppendToExistingChange,
  addFrame,
  onAddFrameChange,
  applyUnion,
  onApplyUnionChange,
  resizeImport,
  onResizeImportChange,
  resizeWidth,
  onResizeWidthChange,
  resizeHeight,
  onResizeHeightChange,
  swapColors,
  onSwapColorsChange,
}) => (
  <VStack spacing={0.5} align="stretch" pt={0.5}>
    <Flex justify="space-between" align="center" h="24px">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Append
      </Text>
      <PanelSwitch
        isChecked={appendToExisting}
        onChange={(event) => onAppendToExistingChange(event.target.checked)}
        title="Append to existing"
        aria-label="Append to existing"
      />
    </Flex>

    <Flex justify="space-between" align="center" h="24px">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Add frame
      </Text>
      <PanelSwitch
        isChecked={addFrame}
        onChange={(event) => onAddFrameChange(event.target.checked)}
        title="Add frame"
        aria-label="Add frame"
      />
    </Flex>

    <Flex justify="space-between" align="center" h="24px">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Union Paths
      </Text>
      <PanelSwitch
        isChecked={applyUnion}
        onChange={(event) => onApplyUnionChange(event.target.checked)}
        title="Union paths"
        aria-label="Union paths"
      />
    </Flex>

    <Flex justify="space-between" align="center" h="24px">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Swap black/white
      </Text>
      <PanelSwitch
        isChecked={swapColors}
        onChange={(event) => onSwapColorsChange(event.target.checked)}
        title="Swap black and white"
        aria-label="Swap black and white"
      />
    </Flex>

    <Flex justify="space-between" align="center" h="24px">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Resize SVG
      </Text>
      <PanelSwitch
        isChecked={resizeImport}
        onChange={(event) => onResizeImportChange(event.target.checked)}
        title="Resize SVG"
        aria-label="Resize SVG"
      />
    </Flex>

    {resizeImport && (
      <VStack spacing={1} align="stretch">
        <NumberInput
          label="W"
          value={resizeWidth}
          onChange={onResizeWidthChange}
          min={1}
          max={1000}
          inputWidth="50px"
        />
        <NumberInput
          label="H"
          value={resizeHeight}
          onChange={onResizeHeightChange}
          min={1}
          max={1000}
          inputWidth="50px"
        />
      </VStack>
    )}
  </VStack>
);
