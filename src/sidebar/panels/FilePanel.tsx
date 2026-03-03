import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, VStack, Text, Box, useToast } from '@chakra-ui/react';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { Upload, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

import { logger } from '../../utils/logger';
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

    // Use the first file's name (without extension) as document name
    const firstName = files[0].name.replace(/\.svg$/i, '');
    setDocumentName(firstName);
    setLocalDocumentName(firstName);

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
      <VStack spacing={2} align="stretch">
        {/* Import */}
        <PanelStyledButton onClick={handleImportSVG} width="full" size="sm">
          <HStack spacing={1.5}>
            <Upload size={11} />
            <span>Import SVG</span>
          </HStack>
        </PanelStyledButton>

        {/* Export */}
        <Box>
          <Text
            fontSize="12px"
            color="gray.700"
            _dark={{ color: 'gray.300' }}
            mb={1.5}
          >
            EXPORT
          </Text>

          {/* Name inline row */}
          <HStack spacing={1.5} mb={1.5} align="center">
            <Text
              fontSize="12px"
              fontWeight="medium"
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

          <HStack spacing={1}>
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
        </Box>

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
