import React from 'react';
import { VStack } from '@chakra-ui/react';
import { PanelToggle } from '../../../ui/PanelToggle';
import { NumberInput } from '../../../ui/NumberInput';

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
  <VStack spacing={2} align="stretch" pt={0.5} pb={2}>
    <PanelToggle
      isChecked={appendToExisting}
      onChange={(event) => onAppendToExistingChange(event.target.checked)}
    >
      Append to existing
    </PanelToggle>

    <PanelToggle
      isChecked={addFrame}
      onChange={(event) => onAddFrameChange(event.target.checked)}
    >
      Add frame to imported SVG
    </PanelToggle>

    <PanelToggle
      isChecked={applyUnion}
      onChange={(event) => onApplyUnionChange(event.target.checked)}
    >
      Apply union to imported paths
    </PanelToggle>

    <PanelToggle
      isChecked={swapColors}
      onChange={(event) => onSwapColorsChange(event.target.checked)}
    >
      Swap black/white colors for theme
    </PanelToggle>

    <PanelToggle
      isChecked={resizeImport}
      onChange={(event) => onResizeImportChange(event.target.checked)}
    >
      Resize imported SVG
    </PanelToggle>

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
