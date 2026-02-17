import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, VStack, Input, FormLabel, Text, Box, useToast } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';

import { logger } from '../../utils';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useSvgImport } from '../../hooks/useSvgImport';
import { ExportManager } from '../../utils/export/ExportManager';
import { FilePanelAdvancedSection } from './file/FilePanelAdvancedSection';

const HIDDEN_INPUT_STYLE: React.CSSProperties = { display: 'none' };

export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const toast = useToast();

  const {
    importResize: resizeImport,
    importResizeWidth: resizeWidth,
    importResizeHeight: resizeHeight,
    importApplyUnion: applyUnion,
    importAddFrame: addFrame
  } = settings;

  const setResizeImport = (value: boolean) => updateSettings({ importResize: value });
  const setResizeWidth = (value: number) => updateSettings({ importResizeWidth: value });
  const setResizeHeight = (value: number) => updateSettings({ importResizeHeight: value });
  const setApplyUnion = (value: boolean) => updateSettings({ importApplyUnion: value });
  const setAddFrame = (value: boolean) => updateSettings({ importAddFrame: value });

  const [pngSelectedOnly, setPngSelectedOnly] = useState(false);
  const [svgSelectedOnly, setSvgSelectedOnly] = useState(false);
  const svgInputRef = useRef<HTMLInputElement>(null);


  // Document name state
  const documentName = useCanvasStore(state => state.documentName);
  const setDocumentName = useCanvasStore(state => state.setDocumentName);
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  // Handle document name change with throttling
  const handleDocumentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
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
    ExportManager.exportSelection('svg', documentName, svgSelectedOnly, settings.exportPadding);
  };

  const handleSaveAsPng = () => {
    ExportManager.exportSelection('png', documentName, pngSelectedOnly, settings.exportPadding);
  };

  const handleLoad = async () => {
    try {
      await loadDocument(true); // Always append for now
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

  const { importSvgFiles } = useSvgImport();

  const handleSVGFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await importSvgFiles(files, {
      appendMode: true, // Always append in FilePanel for now, or we could add a toggle
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
      <VStack spacing={0} align="stretch">
        {/* Document Name */}
        <HStack spacing={0} align="center">
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={0} pt={0.5} flexShrink={0}>
            Name
          </FormLabel>
          <Box flex={1} pt={0.5} pr={0.5}>
            <Input
              value={localDocumentName}
              onChange={handleDocumentNameChange}
              placeholder="Enter document name"
              size="sm"
              h="20px"
              borderRadius="0"
              _focus={{
                borderColor: 'gray.600',
                boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
              }}
            />
          </Box>
          {isSaving && (
            <Text
              fontSize="12px"
              color="gray.500"
              bg="white"
              _dark={{
                color: 'gray.400',
                bg: 'gray.700'
              }}
              px={1}
              flexShrink={0}
            >
              Saving...
            </Text>
          )}
        </HStack>

        <HStack spacing={1} pt={2}>
          <PanelStyledButton
            onClick={handleImportSVG}
            flex={1}
            size="sm"
          >
            Import SVG
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleSaveAsSvg}
            flex={1}
            size="sm"
          >
            SVG
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleSaveAsPng}
            flex={1}
            size="sm"
          >
            PNG
          </PanelStyledButton>
        </HStack>

        {/* Hidden file input for SVG import */}
        <input
          ref={svgInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          style={HIDDEN_INPUT_STYLE}
          onChange={handleSVGFileSelected}
        />

        <FilePanelAdvancedSection
          exportPadding={settings.exportPadding}
          onExportPaddingChange={(value) => updateSettings({ exportPadding: value })}
          pngSelectedOnly={pngSelectedOnly}
          onPngSelectedOnlyChange={setPngSelectedOnly}
          svgSelectedOnly={svgSelectedOnly}
          onSvgSelectedOnlyChange={setSvgSelectedOnly}
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
          onSave={handleSave}
          onLoad={handleLoad}
        />

        {/* Reset Application */}
        <Box pt={0}>
          <PanelStyledButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              useCanvasStore.persist.clearStorage();
              window.location.reload();
            }}
            size="sm"
            width="full"
            title="Reset Application - This will clear all data and reload the page"
          >
            Reset App
          </PanelStyledButton>
        </Box>
      </VStack>
    </Panel>
  );
};
