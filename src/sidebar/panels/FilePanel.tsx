import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, VStack, Text, Box, Flex, useToast } from '@chakra-ui/react';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { Upload, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

import { logger } from '../../utils/logger';
import { Panel } from '../../ui/Panel';
import { useSvgImport } from '../../hooks/useSvgImport';
import { ExportManager } from '../../utils/export/ExportManager';
import { FilePanelImportOptions } from './file/FilePanelAdvancedSection';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import type { SourcePluginSlice } from '../../plugins/source/sourcePluginSlice';
import { SourceDialog } from '../../plugins/source/SourceDialog';
import { PanelSwitch } from '../../ui/PanelSwitch';

const HIDDEN_INPUT_STYLE: React.CSSProperties = { display: 'none' };

export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const toast = useToast();

  const {
    importAppendToExisting: appendToExisting = true,
    importResize: resizeImport,
    importResizeWidth: resizeWidth,
    importResizeHeight: resizeHeight,
    importApplyUnion: applyUnion,
    importAddFrame: addFrame
  } = settings;

  const setAppendToExisting = (value: boolean) => updateSettings({ importAppendToExisting: value });
  const setResizeImport = (value: boolean) => updateSettings({ importResize: value });
  const setResizeWidth = (value: number) => updateSettings({ importResizeWidth: value });
  const setResizeHeight = (value: number) => updateSettings({ importResizeHeight: value });
  const setApplyUnion = (value: boolean) => updateSettings({ importApplyUnion: value });
  const setAddFrame = (value: boolean) => updateSettings({ importAddFrame: value });

  const [saveSelectedOnly, setSaveSelectedOnly] = useState(false);
  const svgInputRef = useRef<HTMLInputElement>(null);


  // Document name state
  const documentName = useCanvasStore(state => state.documentName);
  const setDocumentName = useCanvasStore(state => state.setDocumentName);
  const setSourceDialogOpen = useCanvasStore(
    (state) => (state as unknown as SourcePluginSlice).setSourceDialogOpen
  );
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  // Handle document name change with throttling
  const handleDocumentNameChange = useCallback((newName: string) => {
    setLocalDocumentName(newName);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving indicator immediately
    setIsSaving(true);

    // Throttle the save operation
    saveTimeoutRef.current = setTimeout(() => {
      setDocumentName(newName);
      setIsSaving(false);
    }, 500); // 500ms delay
  }, [setDocumentName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    saveDocument();
  };

  const handleSaveAsSvg = () => {
    ExportManager.exportSelection('svg', documentName, saveSelectedOnly, settings.exportPadding);
  };

  const handleSaveAsPng = () => {
    ExportManager.exportSelection('png', documentName, saveSelectedOnly, settings.exportPadding);
  };

  const handleLoad = async () => {
    try {
      await loadDocument(appendToExisting);
    } catch (error) {
      logger.error('Failed to load document', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load document. Please check the file format.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleImportSVG = () => {
    svgInputRef.current?.click();
  };

  const handleOpenSourceDialog = () => {
    setSourceDialogOpen?.(true);
  };

  const { importSvgFiles } = useSvgImport();

  const handleSVGFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Use the first file's name (without extension) as document name
    const firstName = files[0].name.replace(/\.svg$/i, '');
    setDocumentName(firstName);
    setLocalDocumentName(firstName);

    await importSvgFiles(files, {
      appendMode: appendToExisting,
      resizeImport,
      resizeWidth,
      resizeHeight,
      applyUnion,
      addFrame
    });

    // Reset file input
    if (svgInputRef.current) {
      svgInputRef.current.value = '';
    }
  };

  return (
    <Panel>
      <VStack spacing={2} align="stretch">
        <Box>
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="gray.700"
            _dark={{ color: 'gray.300' }}
            mb={1.5}
            pt="3px"
          >
            EXPORT
          </Text>

          {/* Name inline row */}
          <HStack spacing={1.5} pb={0.5} align="center">
            <Text
              fontSize="12px"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              flexShrink={0}
            >
              Name
            </Text>
            <Box flex={1}>
              <PanelTextInput
                value={localDocumentName}
                onChange={handleDocumentNameChange}
                placeholder="Document name"
                width="190px"
                height="20px"
              />
            </Box>
            {isSaving && (
              <Text fontSize="10px" color="gray.400" _dark={{ color: 'gray.600' }} flexShrink={0}>
                saving…
              </Text>
            )}
          </HStack>

          <Box pr={0.5} pb={1}>
            <SliderControl
              label="Export Padding"
              value={settings.exportPadding}
              min={0}
              max={100}
              step={5}
              onChange={(value) => updateSettings({ exportPadding: value })}
              title="Padding in pixels around exported SVG/PNG"
            />
          </Box>

          <Flex justify="space-between" align="center" pb={1.5}>
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Save selected elements only
            </Text>
            <PanelSwitch
              isChecked={saveSelectedOnly}
              onChange={(event) => setSaveSelectedOnly(event.target.checked)}
              title="Save selected elements only"
              aria-label="Save selected elements only"
            />
          </Flex>

          <HStack spacing={1} pb={1.5}>
            <PanelStyledButton onClick={handleSaveAsSvg} flex={1} size="sm">
              <HStack spacing={1.5}>
                <Download size={11} />
                <span>SVG</span>
              </HStack>
            </PanelStyledButton>
            <PanelStyledButton onClick={handleSaveAsPng} flex={1} size="sm">
              <HStack spacing={1.5}>
                <Download size={11} />
                <span>PNG</span>
              </HStack>
            </PanelStyledButton>
          </HStack>

          <Box>
            <PanelStyledButton onClick={handleOpenSourceDialog} width="full" size="sm">
              SVG Source
            </PanelStyledButton>
          </Box>
        </Box>

        <Box pt={2}>
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="gray.700"
            _dark={{ color: 'gray.300' }}
            mb={1.5}
          >
            IMPORT
          </Text>

          <FilePanelImportOptions
            appendToExisting={appendToExisting}
            onAppendToExistingChange={setAppendToExisting}
            addFrame={addFrame}
            onAddFrameChange={setAddFrame}
            applyUnion={applyUnion}
            onApplyUnionChange={setApplyUnion}
            resizeImport={resizeImport}
            onResizeImportChange={setResizeImport}
            resizeWidth={resizeWidth}
            onResizeWidthChange={setResizeWidth}
            resizeHeight={resizeHeight}
            onResizeHeightChange={setResizeHeight}
          />

          <PanelStyledButton onClick={handleImportSVG} width="full" size="sm">
            <HStack spacing={1.5}>
              <Upload size={11} />
              <span>Import SVG</span>
            </HStack>
          </PanelStyledButton>

          <input
            ref={svgInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            style={HIDDEN_INPUT_STYLE}
            onChange={handleSVGFileSelected}
          />
        </Box>

        {import.meta.env.DEV && (
          <Box pt={2}>
            <Text
              fontSize="12px"
              fontWeight="bold"
              color="gray.700"
              _dark={{ color: 'gray.300' }}
              mb={1.5}
            >
              JSON
            </Text>

            <HStack spacing={1}>
              <PanelStyledButton onClick={handleSave} flex={1} size="sm">
                Save
              </PanelStyledButton>
              <PanelStyledButton onClick={handleLoad} flex={1} size="sm">
                Load
              </PanelStyledButton>
            </HStack>
          </Box>
        )}
      </VStack>
      <SourceDialog />
    </Panel>
  );
};
