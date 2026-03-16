import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, VStack, Text, Box, Flex, useToast } from '@chakra-ui/react';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { Upload, Download, FileCode } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

import { logger } from '../../utils/logger';
import { Panel } from '../../ui/Panel';
import { useSvgImport } from '../../hooks/useSvgImport';
import { ExportManager } from '../../utils/export/ExportManager';
import { FilePanelImportOptions } from './file/FilePanelAdvancedSection';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import type { SourcePluginSlice } from '../../plugins/source/sourcePluginSlice';
import { SourceDialog } from '../../plugins/source/SourceDialog';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { DocumentationCTA } from '../../ui/DocumentationCTA';
import type { ExportTheme } from '../../types';

const HIDDEN_INPUT_STYLE: React.CSSProperties = { display: 'none' };
const buildVersionLabel = `${__APP_COMMIT_HASH__} ${__APP_COMMIT_DATE__}`;

export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const toast = useToast();

  const {
    importAppendToExisting: appendToExisting = false,
    importResize: resizeImport,
    importResizeWidth: resizeWidth,
    importResizeHeight: resizeHeight,
    importApplyUnion: applyUnion,
    importAddFrame: addFrame,
    importSwapColors: swapColors = false,
  } = settings;

  const setAppendToExisting = (value: boolean) => updateSettings({ importAppendToExisting: value });
  const setResizeImport = (value: boolean) => updateSettings({ importResize: value });
  const setResizeWidth = (value: number) => updateSettings({ importResizeWidth: value });
  const setResizeHeight = (value: number) => updateSettings({ importResizeHeight: value });
  const setApplyUnion = (value: boolean) => updateSettings({ importApplyUnion: value });
  const setAddFrame = (value: boolean) => updateSettings({ importAddFrame: value });
  const setSwapColors = (value: boolean) => updateSettings({ importSwapColors: value });

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
    ExportManager.exportSelection(
      'svg', documentName, saveSelectedOnly, settings.exportPadding,
      undefined, settings.exportPrecision, settings.exportTheme,
    );
  };

  const handleSaveAsPng = () => {
    ExportManager.exportSelection(
      'png', documentName, saveSelectedOnly, settings.exportPadding,
      undefined, settings.exportPrecision, settings.exportTheme,
    );
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
      addFrame,
      skipDarkModeColorTransform: !swapColors,
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
            Export
          </Text>

          {/* Name inline row */}
          <HStack spacing={1.5} pb={1.5} align="center">
            <Text
              fontSize="12px"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              flexShrink={0}
              w="56px"
            >
              Name
            </Text>
            <Box flex={1}>
              <PanelTextInput
                value={localDocumentName}
                onChange={handleDocumentNameChange}
                placeholder="Document name"
                width="168px"
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
              label="Padding"
              labelWidth="56px"
              value={settings.exportPadding}
              min={0}
              max={100}
              step={5}
              onChange={(value) => updateSettings({ exportPadding: value })}
              title="Padding in pixels around exported SVG/PNG"
            />
          </Box>

          <Box pr={0.5} pb={1}>
            <SliderControl
              label="Precision"
              labelWidth="56px"
              value={settings.exportPrecision}
              min={0}
              max={4}
              step={1}
              onChange={(value) => updateSettings({ exportPrecision: value })}
              title="Number of decimal places for numeric values in exported SVG"
            />
          </Box>

          <Flex justify="space-between" align="center" pb={1.5}>
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Theme
            </Text>
            <JoinedButtonGroup<ExportTheme>
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={settings.exportTheme}
              onChange={(value) => updateSettings({ exportTheme: value })}
              size="sm"
              disableTooltips
            />
          </Flex>

          <Flex justify="space-between" align="center" pb={2}>
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Selected
            </Text>
            <PanelSwitch
              isChecked={saveSelectedOnly}
              onChange={(event) => setSaveSelectedOnly(event.target.checked)}
              title="Selected Only"
              aria-label="Selected Only"
            />
          </Flex>

          <HStack spacing={1} pb={1.5}>
            <PanelStyledButton onClick={handleSaveAsSvg} flex={1} size="sm" h="44px" fontSize="12px">
              <HStack spacing={1.5}>
                <Download size={14} />
                <Text as="span" fontSize="12px" fontWeight="semibold">SVG</Text>
              </HStack>
            </PanelStyledButton>
            <PanelStyledButton onClick={handleSaveAsPng} flex={1} size="sm" h="44px" fontSize="12px">
              <HStack spacing={1.5}>
                <Download size={14} />
                <Text as="span" fontSize="12px" fontWeight="semibold">PNG</Text>
              </HStack>
            </PanelStyledButton>
          </HStack>

        </Box>

        <Box pt={2}>
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="gray.700"
            _dark={{ color: 'gray.300' }}
            mb={1.5}
          >
            Import
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
            swapColors={swapColors}
            onSwapColorsChange={setSwapColors}
          />

          <PanelStyledButton onClick={handleImportSVG} width="full" size="sm" h="44px" fontSize="12px">
            <HStack spacing={1.5}>
              <Upload size={14} />
              <Text as="span" fontSize="12px" fontWeight="semibold">Import SVG</Text>
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

        <Box pt={2}>
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="gray.700"
            _dark={{ color: 'gray.300' }}
            mb={1.5}
          >
            Source
          </Text>

          <PanelStyledButton onClick={handleOpenSourceDialog} width="full" size="sm" h="44px" fontSize="12px">
            <HStack spacing={1.5}>
              <FileCode size={14} />
              <Text as="span" fontSize="12px" fontWeight="semibold">View SVG</Text>
            </HStack>
          </PanelStyledButton>
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

        <Box pt={3}>
          <DocumentationCTA versionLabel={buildVersionLabel} />
        </Box>
      </VStack>
      <SourceDialog
        selectedOnly={saveSelectedOnly}
        padding={settings.exportPadding}
        precision={settings.exportPrecision}
        exportTheme={settings.exportTheme}
      />
    </Panel>
  );
};
