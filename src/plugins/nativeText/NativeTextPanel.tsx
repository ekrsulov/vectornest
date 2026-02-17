import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { useCanvasStore } from '../../store/canvasStore';
import type { NativeTextPluginSlice } from './slice';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { SliderControl } from '../../ui/SliderControl';
import { RichTextEditor } from '../../ui/RichTextEditor';
import { CustomSelect } from '../../ui/CustomSelect';
import { getAvailableFonts, logger } from '../../utils';
import { duplicateElements } from '../../utils/duplicationUtils';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { preventSpacebarPropagation } from '../../utils/panelHelpers';
import { isTTFFont } from '../../utils/ttfFontUtils';
import { isPathElement, type PathElement } from '../../types';
import { NumberInput } from '../../ui/NumberInput';
interface NativeTextPanelProps {
  hideTitle?: boolean;
}

export const NativeTextPanel: React.FC<NativeTextPanelProps> = ({ hideTitle = false }) => {
  const nativeText = useCanvasStore((state) => (state as unknown as NativeTextPluginSlice).nativeText);
  const setNativeTextSettings = useCanvasStore((state) => (state as unknown as NativeTextPluginSlice).setNativeTextSettings);
  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const style = useCanvasStore((state) => state.style);

  const selectedText = useMemo(() => {
    const first = elements.find((el) => selectedIds.includes(el.id) && el.type === 'nativeText');
    return first ?? null;
  }, [elements, selectedIds]);
  const selectedPath = useMemo<PathElement | null>(() => {
    const first = elements.find((el) => selectedIds.includes(el.id) && isPathElement(el));
    return first ? first as PathElement : null;
  }, [elements, selectedIds]);
  const hasSelectedPath = !!selectedPath;

  const handleDuplicate = useCallback(() => {
    if (selectedText) {
      const elementMap = new Map(elements.map(el => [el.id, el]));
      const addElement = useCanvasStore.getState().addElement;
      const updateElement = useCanvasStore.getState().updateElement;
      duplicateElements([selectedText.id], elementMap, addElement, updateElement);
    }
  }, [selectedText, elements]);

  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [isScanningFonts, setIsScanningFonts] = useState(true);

  useEffect(() => {
    const loadFonts = async () => {
      setIsScanningFonts(true);
      try {
        const fonts = getAvailableFonts().filter((font) => !isTTFFont(font));
        setAvailableFonts(fonts);
      } catch (error) {
        logger.error('Error detecting fonts', error);
        setAvailableFonts(['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia']);
      } finally {
        setIsScanningFonts(false);
      }
    };

    loadFonts();
  }, []);

  const fallbackText: NativeTextPluginSlice['nativeText'] = nativeText ?? {
    text: '',
    richText: '',
    spans: [],
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAnchor: 'start',
    dominantBaseline: 'alphabetic',
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: 'none',
    writingMode: 'horizontal-tb',
    lengthAdjust: undefined,
    textLength: undefined,
  };
  const current = selectedText ? (selectedText.data as NativeTextPluginSlice['nativeText']) : fallbackText;
  const pathTextDefaults = useMemo(() => {
    const tp = selectedPath?.data.textPath;
    return {
      text: tp?.text ?? current.text,
      richText: tp?.richText ?? tp?.text ?? current.text,
      spans: tp?.spans,
      fontSize: tp?.fontSize ?? current.fontSize,
      fontFamily: tp?.fontFamily ?? current.fontFamily,
      fontWeight: tp?.fontWeight ?? current.fontWeight,
      fontStyle: tp?.fontStyle ?? current.fontStyle,
      textDecoration: tp?.textDecoration ?? current.textDecoration,
      textAnchor: tp?.textAnchor ?? 'start',
      startOffset: tp?.startOffset ?? 0,
      letterSpacing: tp?.letterSpacing ?? current.letterSpacing ?? 0,
      lengthAdjust: tp?.lengthAdjust ?? current.lengthAdjust,
      textLength: tp?.textLength ?? current.textLength,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath?.id, current.text, current.fontSize, current.fontFamily, current.fontWeight, current.fontStyle, current.textDecoration, current.letterSpacing, current.lengthAdjust, current.textLength]);
  const [pathTextState, setPathTextState] = useState(pathTextDefaults);
  const isSameTextPath = (
    a: NonNullable<PathElement['data']['textPath']> | undefined,
    b: NonNullable<PathElement['data']['textPath']>
  ) => {
    if (!a) return false;
    const keys: Array<keyof NonNullable<PathElement['data']['textPath']>> = [
      'text', 'richText', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      'textDecoration', 'textAnchor', 'startOffset', 'letterSpacing',
      'fillColor', 'fillOpacity', 'strokeColor', 'strokeWidth', 'strokeOpacity',
      'dominantBaseline'
    ];
    for (const key of keys) {
      if (a[key] !== b[key]) return false;
    }
    const spansA = a.spans ?? [];
    const spansB = b.spans ?? [];
    if (spansA.length !== spansB.length) return false;
    const spansEqual = JSON.stringify(spansA) === JSON.stringify(spansB);
    return spansEqual;
  };
  const applyChange = (field: keyof NativeTextPluginSlice['nativeText'], value: unknown) => {
    if (selectedText) {
      updateElement?.(selectedText.id, { data: { ...selectedText.data, [field]: value } });
    } else {
      setNativeTextSettings?.({ [field]: value } as Partial<NativeTextPluginSlice['nativeText']>);
    }
  };

  useEffect(() => {
    if (!selectedText && availableFonts.length > 0) {
      const defaultFont = 'Arial';
      const isCurrentAllowed = availableFonts.includes(current.fontFamily) && !isTTFFont(current.fontFamily);
      if (!isCurrentAllowed && availableFonts.includes(defaultFont)) {
        setNativeTextSettings?.({ fontFamily: defaultFont });
      }
    }
  }, [availableFonts, current.fontFamily, selectedText, setNativeTextSettings]);

  const handleRichChange = (value: { html: string; spans: NonNullable<NativeTextPluginSlice['nativeText']['spans']>; plainText: string }) => {
    if (selectedText) {
      updateElement?.(selectedText.id, { 
        data: { 
          ...selectedText.data, 
          richText: value.html,
          spans: value.spans,
          text: value.plainText
        } 
      });
    } else {
      setNativeTextSettings?.({ 
        richText: value.html,
        spans: value.spans,
        text: value.plainText
      });
    }
  };

  useEffect(() => {
    if (!hasSelectedPath || !selectedPath || !updateElement) return;
    const styleState = style;
    const next = {
      ...pathTextState,
      richText: pathTextState.richText,
      spans: pathTextState.spans,
      fillColor: styleState?.fillColor ?? selectedPath.data.textPath?.fillColor ?? '#000',
      fillOpacity: styleState?.fillOpacity ?? selectedPath.data.textPath?.fillOpacity ?? 1,
      strokeColor: styleState?.strokeColor ?? selectedPath.data.textPath?.strokeColor ?? 'none',
      strokeWidth: styleState?.strokeWidth ?? selectedPath.data.textPath?.strokeWidth ?? 0,
      strokeOpacity: styleState?.strokeOpacity ?? selectedPath.data.textPath?.strokeOpacity ?? 1,
    };
    if (isSameTextPath(selectedPath.data.textPath, next)) {
      return;
    }
    updateElement(selectedPath.id, {
      data: {
        ...selectedPath.data,
        textPath: next,
      },
    });
  }, [hasSelectedPath, pathTextState, selectedPath, style, updateElement]);

  useEffect(() => {
    setPathTextState(pathTextDefaults);
  }, [pathTextDefaults]);

  if (!nativeText || !setNativeTextSettings) return null;

  return (
    <Panel title="Native Text" hideHeader={hideTitle}>
      <VStack spacing={1} align="stretch" pt={0.5}>
        {!hasSelectedPath && (
          <>
            <RichTextEditor
              value={current.richText || current.text || ''}
              onKeyDown={preventSpacebarPropagation as unknown as React.KeyboardEventHandler<HTMLDivElement>}
              onChange={handleRichChange}
              fontSize={current.fontSize}
              fontFamily={current.fontFamily}
              fontWeight={current.fontWeight}
              fontStyle={current.fontStyle}
              lineHeight={current.lineHeight}
              letterSpacing={current.letterSpacing}
              textAnchor={current.textAnchor}
              textTransform={current.textTransform}
              onFontSizeChange={(size) => applyChange('fontSize', size)}
              onFontFamilyChange={(font) => applyChange('fontFamily', font)}
              onLineHeightChange={(value) => applyChange('lineHeight', parseFloat(value.toFixed(2)))}
              onLetterSpacingChange={(value) => applyChange('letterSpacing', parseFloat(value.toFixed(2)))}
              onTextAnchorChange={(value) => applyChange('textAnchor', value as NativeTextPluginSlice['nativeText']['textAnchor'])}
            onTextTransformChange={(value) => applyChange('textTransform', value)}
              availableFonts={availableFonts}
              isScanningFonts={isScanningFonts}
              lineTrackSliderPr={0.5}
            />
            <HStack align="center" spacing={2}>
              <Text fontSize="sm" color="gray.600" minW="70px">Writing</Text>
              <CustomSelect
                size="sm"
                flex="1"
                value={current.writingMode ?? 'horizontal-tb'}
              onChange={(value) => applyChange('writingMode', value as NativeTextPluginSlice['nativeText']['writingMode'])}
              options={[
                { value: 'horizontal-tb', label: 'Horizontal' },
                { value: 'vertical-rl', label: 'Vertical RL' },
                { value: 'vertical-lr', label: 'Vertical LR' },
                { value: 'tb', label: 'Top to bottom (tb)' },
                { value: 'sideways-rl', label: 'Sideways RL' },
                { value: 'sideways-lr', label: 'Sideways LR' },
              ]}
            />
          </HStack>
          <HStack align="center" spacing={2}>
            <Text fontSize="sm" color="gray.600" minW="70px">Baseline</Text>
            <CustomSelect
              size="sm"
              flex="1"
              value={current.dominantBaseline ?? 'alphabetic'}
              onChange={(value) => applyChange('dominantBaseline', value as NativeTextPluginSlice['nativeText']['dominantBaseline'])}
              options={[
                { value: 'alphabetic', label: 'Alphabetic' },
                { value: 'middle', label: 'Middle' },
                { value: 'hanging', label: 'Hanging' },
                { value: 'ideographic', label: 'Ideographic' },
              ]}
            />
          </HStack>
          <HStack align="center" spacing={2}>
            <Text fontSize="sm" color="gray.600" minW="70px">Length mode</Text>
            <CustomSelect
              size="sm"
              flex="1"
              value={current.lengthAdjust ?? 'spacing'}
              onChange={(value) => applyChange('lengthAdjust', value as NativeTextPluginSlice['nativeText']['lengthAdjust'])}
              options={[
                { value: 'spacing', label: 'Spacing' },
                { value: 'spacingAndGlyphs', label: 'Spacing+Glyphs' },
              ]}
            />
          </HStack>
          <NumberInput
            label="TextLength"
            labelWidth="70px"
            value={current.textLength ?? 0}
            min={0}
            step={5}
            onChange={(v) => applyChange('textLength', Number.isFinite(v) && v > 0 ? v : undefined)}
            suffix="px"
          />
        </>
      )}
        {hasSelectedPath && (
        <VStack align="stretch" spacing={1}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">Text on Path</Text>
            <RichTextEditor
              value={pathTextState.richText || pathTextState.text}
              onKeyDown={preventSpacebarPropagation as unknown as React.KeyboardEventHandler<HTMLDivElement>}
              onChange={(val) => {
              setPathTextState(prev => ({
                ...prev,
                richText: val.html,
                spans: val.spans,
                text: val.plainText,
              }));
            }}
            fontSize={pathTextState.fontSize}
            fontFamily={pathTextState.fontFamily}
            fontWeight={pathTextState.fontWeight}
            fontStyle={pathTextState.fontStyle}
            letterSpacing={pathTextState.letterSpacing}
            onFontSizeChange={(size) => setPathTextState((prev) => ({ ...prev, fontSize: size }))}
              onFontFamilyChange={(font) => setPathTextState((prev) => ({ ...prev, fontFamily: font }))}
              availableFonts={availableFonts}
              isScanningFonts={isScanningFonts}
              lineTrackSliderPr={0.5}
            />
          <HStack align="center" spacing={0}>
            <Text fontSize="sm" color="gray.600" minW="80px">Offset %</Text>
            <Box flex="1" p="0">
              {(() => {
                const startOffsetValue = typeof pathTextState.startOffset === 'number'
                  ? pathTextState.startOffset
                  : parseFloat(pathTextState.startOffset ?? '0') || 0;
                return (
              <SliderControl
                inline={true}
                value={startOffsetValue}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setPathTextState((prev) => ({ ...prev, startOffset: v }))}
              />
                );
              })()}
            </Box>
          </HStack>
          <HStack align="center" spacing={0}>
            <Text fontSize="sm" color="gray.600" minW="80px">Length mode</Text>
            <CustomSelect
              size="sm"
              flex="1"
              value={pathTextState.lengthAdjust ?? 'spacing'}
              onChange={(value) => setPathTextState((prev) => ({ ...prev, lengthAdjust: value as 'spacing' | 'spacingAndGlyphs' }))}
              options={[
                { value: 'spacing', label: 'Spacing' },
                { value: 'spacingAndGlyphs', label: 'Spacing+Glyphs' },
              ]}
            />
          </HStack>
          <NumberInput
            label="TextLength"
            labelWidth="80px"
            value={pathTextState.textLength ?? 0}
            min={0}
            step={5}
            onChange={(v) => setPathTextState((prev) => ({ ...prev, textLength: Number.isFinite(v) && v > 0 ? v : undefined }))}
            suffix="px"
          />
          <HStack align="center" spacing={0}>
            <Text fontSize="sm" color="gray.600" minW="80px">Tracking</Text>
            <Box flex="1" p="0" pr={0.5}>
              <SliderControl
                inline={true}
                value={pathTextState.letterSpacing ?? 0}
                min={-5}
                max={20}
                step={0.5}
                onChange={(v) => setPathTextState((prev) => ({ ...prev, letterSpacing: v }))}
                formatter={(v) => `${v}px`}
              />
            </Box>
          </HStack>
          <HStack align="center" spacing={0}>
            <Text fontSize="sm" color="gray.600" minW="80px">Align</Text>
            <JoinedButtonGroup
              size="md"
              flex="1"
              value={pathTextState.textAnchor}
              onChange={(value) => setPathTextState((prev) => ({ ...prev, textAnchor: value as 'start' | 'middle' | 'end' }))}
              options={[
                { value: 'start', label: 'Left' },
                { value: 'middle', label: 'Center' },
                { value: 'end', label: 'Right' },
              ]}
            />
          </HStack>
          {selectedPath?.data.textPath && (
            <PanelStyledButton
              onClick={() => {
                if (!selectedPath || !updateElement) return;
                updateElement(selectedPath.id, {
                  data: { ...selectedPath.data, textPath: undefined },
                });
                // Switch back to select to avoid accidental edits
                const state = useCanvasStore.getState();
                state.setActivePlugin('select');
              }}
            >
              Remove text on path
            </PanelStyledButton>
          )}
        </VStack>
        )}
        {selectedText && (
          <PanelStyledButton
            onClick={handleDuplicate}
            w="full"
          >
            Duplicate
          </PanelStyledButton>
        )}
        <Text fontSize="xs" color="gray.500">
          {selectedText ? 'Editing selected native text.' : hasSelectedPath ? 'Editing text on path.' : 'Click on canvas with Native Text tool to place text.'}
        </Text>
      </VStack>
    </Panel>
  );
};
