import React from 'react';
import { Box, HStack, VStack } from '@chakra-ui/react';
import { Panel } from '../../../ui/Panel';
import { PanelToggle } from '../../../ui/PanelToggle';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { NumberInput } from '../../../ui/NumberInput';
import { SliderControl } from '../../../ui/SliderControl';

interface FilePanelAdvancedSectionProps {
  exportPadding: number;
  onExportPaddingChange: (value: number) => void;
  pngSelectedOnly: boolean;
  onPngSelectedOnlyChange: (checked: boolean) => void;
  svgSelectedOnly: boolean;
  onSvgSelectedOnlyChange: (checked: boolean) => void;
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
  onSave: () => void;
  onLoad: () => void;
}

export const FilePanelAdvancedSection: React.FC<FilePanelAdvancedSectionProps> = ({
  exportPadding,
  onExportPaddingChange,
  pngSelectedOnly,
  onPngSelectedOnlyChange,
  svgSelectedOnly,
  onSvgSelectedOnlyChange,
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
  onSave,
  onLoad,
}) => (
  <Panel
    title="Advanced"
    isCollapsible={true}
    defaultOpen={false}
  >
    <VStack spacing={2} align="stretch" pt={0.5} pb={2}>
      <Box pr={0.5}>
        <SliderControl
          label="Export Padding:"
          value={exportPadding}
          min={0}
          max={100}
          step={5}
          onChange={onExportPaddingChange}
          title="Padding in pixels around exported SVG/PNG"
        />
      </Box>

      <PanelToggle
        isChecked={true}
        onChange={() => { }}
        isDisabled={true}
      >
        Append to existing
      </PanelToggle>

      <PanelToggle
        isChecked={pngSelectedOnly}
        onChange={(event) => onPngSelectedOnlyChange(event.target.checked)}
      >
        Save selected elements only (PNG)
      </PanelToggle>

      <PanelToggle
        isChecked={svgSelectedOnly}
        onChange={(event) => onSvgSelectedOnlyChange(event.target.checked)}
      >
        Save selected elements only (SVG)
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

      {import.meta.env.DEV && (
        <HStack spacing={1}>
          <PanelStyledButton
            onClick={onSave}
            flex={1}
            size="sm"
          >
            Save
          </PanelStyledButton>

          <PanelStyledButton
            onClick={onLoad}
            flex={1}
            size="sm"
          >
            Load
          </PanelStyledButton>
        </HStack>
      )}
    </VStack>
  </Panel>
);
