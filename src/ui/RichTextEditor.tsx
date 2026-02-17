import React, { useEffect, useRef } from 'react';
import { Box, HStack, VStack, Text } from '@chakra-ui/react';
import { Bold, Italic, Underline } from 'lucide-react';
import { ToggleButton } from './ToggleButton';
import { MultiPaintPicker } from './MultiPaintPicker';
import { SliderControl } from './SliderControl';
import { FontSelector } from './FontSelector';
import { JoinedButtonGroup } from './JoinedButtonGroup';
import { useRichTextFormatting } from '../hooks/useRichTextFormatting';

export type RichSpan = {
  text: string;
  line: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  fillColor?: string;
};

export type RichTextValue = {
  html: string;
  spans: RichSpan[];
  plainText: string;
};

/** Cached DOM element reused across parseRichText calls to avoid repeated allocations */
const _parseContainer = document.createElement('div');

const parseRichText = (html: string): RichTextValue => {
  _parseContainer.innerHTML = html || '';
  const container = _parseContainer;
  const spans: RichSpan[] = [];
  let currentLine = 0;

  const pushText = (text: string, style: Partial<RichSpan>) => {
    if (!text) return;
    spans.push({
      text,
      line: currentLine,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      fillColor: style.fillColor,
    });
  };

  const walk = (node: Node, style: Partial<RichSpan>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent ?? '';
      pushText(content, style);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        currentLine += 1;
        return;
      }

      const nextStyle: Partial<RichSpan> = { ...style };
      const tag = el.tagName.toLowerCase();
      if (tag === 'b' || tag === 'strong') nextStyle.fontWeight = 'bold';
      if (tag === 'i' || tag === 'em') nextStyle.fontStyle = 'italic';
      if (tag === 'u') nextStyle.textDecoration = 'underline';

      const inlineStyle = el.style;
      if (inlineStyle?.fontWeight) nextStyle.fontWeight = inlineStyle.fontWeight;
      if (inlineStyle?.fontStyle) nextStyle.fontStyle = inlineStyle.fontStyle as RichSpan['fontStyle'];
      if (inlineStyle?.textDecoration) nextStyle.textDecoration = inlineStyle.textDecoration as RichSpan['textDecoration'];
      const colorAttr = el.getAttribute('data-fill') || inlineStyle?.color || el.getAttribute('color');
      if (colorAttr) nextStyle.fillColor = colorAttr;

      const isBlock = ['div', 'p'].includes(tag);
      if (isBlock && spans.length > 0) {
        currentLine += 1;
      }

      el.childNodes.forEach(child => walk(child, nextStyle));

      if (isBlock) {
        currentLine += 1;
      }
    }
  };

  container.childNodes.forEach(child => walk(child, {}));

  let plain = '';
  let lastLine = 0;
  spans.forEach((s, idx) => {
    if (idx === 0) {
      lastLine = s.line;
    } else if (s.line > lastLine) {
      plain += '\n'.repeat(s.line - lastLine);
      lastLine = s.line;
    }
    plain += s.text;
  });

  return { spans, plainText: plain, html };
};

interface RichTextEditorProps {
  value: string;
  label?: string;
  onChange: (value: RichTextValue) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAnchor?: string;
  textTransform?: string;
  onFontSizeChange?: (size: number) => void;
  onFontFamilyChange?: (font: string) => void;
  onLineHeightChange?: (value: number) => void;
  onLetterSpacingChange?: (value: number) => void;
  onTextAnchorChange?: (value: string) => void;
  onTextTransformChange?: (value: string) => void;
  availableFonts?: string[];
  isScanningFonts?: boolean;
  lineTrackSliderPr?: string | number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  label,
  onChange,
  onKeyDown,
  fontSize = 16,
  fontFamily = 'Arial',
  fontWeight = 'normal',
  fontStyle = 'normal',
  lineHeight = 1.2,
  letterSpacing = 0,
  textAnchor = 'start',
  textTransform = 'none',
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onTextAnchorChange,
  onTextTransformChange,
  availableFonts = [],
  isScanningFonts = false,
  lineTrackSliderPr = 0,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textColorSlotRef = useRef<HTMLDivElement>(null);
  const {
    currentColor,
    isBold,
    isItalic,
    isUnderline,
    saveSelection,
    handleCommand,
  } = useRichTextFormatting({
    editorRef,
    parseRichText,
    onChange,
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <VStack spacing={1} align="stretch">
      {label && <Text fontSize="xs" color="gray.600">{label}</Text>}
      
      {/* First row: formatting buttons and size slider */}
      <HStack spacing={2} align="flex-start">
        <HStack spacing={1} align="flex-start">
          <MultiPaintPicker
            label="Text Color"
            value={currentColor}
            onChange={(colorValue) => {
              handleCommand('foreColor', colorValue);
            }}
            defaultColor="#000000"
            mode="fill"
            floatingContainerRef={textColorSlotRef}
          />
          <ToggleButton
            isActive={isBold}
            onClick={() => handleCommand('bold')}
            icon={<Bold size={12} />}
            aria-label="Bold"
            size="sm"
          />
          <ToggleButton
            isActive={isItalic}
            onClick={() => handleCommand('italic')}
            icon={<Italic size={12} />}
            aria-label="Italic"
            size="sm"
          />
          <ToggleButton
            isActive={isUnderline}
            onClick={() => handleCommand('underline')}
            icon={<Underline size={12} />}
            aria-label="Underline"
            size="sm"
          />
        </HStack>
        {onFontSizeChange && (
          <Box flex="1" maxW="80px">
            <SliderControl
              inline={true}
              value={fontSize}
              min={6}
              max={300}
              step={1}
              onChange={onFontSizeChange}
            />
          </Box>
        )}
      </HStack>
      <Box ref={textColorSlotRef} w="100%" />

      {/* Second row: Font selector */}
      {onFontFamilyChange && (
        <FontSelector
          value={fontFamily}
          onChange={onFontFamilyChange}
          fonts={availableFonts}
          disabled={isScanningFonts}
          loading={isScanningFonts}
        />
      )}

      {/* Third row: Align */}
      {onTextAnchorChange && (
        <HStack spacing={2} align="center">
          <Text fontSize="sm" color="gray.600" minW="70px">Align</Text>
          <JoinedButtonGroup
            size="sm"
            flex="1"
            value={textAnchor}
            onChange={onTextAnchorChange}
            options={[
              { value: 'start', label: 'Left' },
              { value: 'middle', label: 'Center' },
              { value: 'end', label: 'Right' },
            ]}
          />
        </HStack>
      )}

      {/* Fourth row: Transform */}
      {onTextTransformChange && (
        <HStack spacing={2} align="center">
          <Text fontSize="sm" color="gray.600" minW="70px">Transform</Text>
          <JoinedButtonGroup
            size="sm"
            flex="1"
            value={textTransform}
            onChange={onTextTransformChange}
            options={[
              { value: 'none', label: 'None' },
              { value: 'uppercase', label: 'UP' },
              { value: 'lowercase', label: 'low' },
              { value: 'capitalize', label: 'Cap' },
            ]}
          />
        </HStack>
      )}

      {/* Fifth row: Line Height */}
      {onLineHeightChange && (
        <HStack align="center" spacing={1}>
          <Text fontSize="sm" color="gray.600" minW="70px">Line H</Text>
          <Box flex="1" pr={lineTrackSliderPr}>
            <SliderControl
              inline={true}
              value={lineHeight}
              min={0.5}
              max={3}
              step={0.05}
              onChange={onLineHeightChange}
            />
          </Box>
        </HStack>
      )}

      {/* Sixth row: Tracking */}
      {onLetterSpacingChange && (
        <HStack align="center" spacing={1}>
          <Text fontSize="sm" color="gray.600" minW="70px">Track</Text>
          <Box flex="1" pr={lineTrackSliderPr}>
            <SliderControl
              inline={true}
              value={letterSpacing}
              min={-5}
              max={20}
              step={0.1}
              onChange={onLetterSpacingChange}
              formatter={(v) => `${v}px`}
            />
          </Box>
        </HStack>
      )}

      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          const parsed = parseRichText(html);
          onChange(parsed);
          saveSelection();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        sx={{
          minHeight: '100px',
          border: '1px solid',
          borderColor: 'gray.300',
          borderRadius: '4px',
          padding: '6px',
          fontSize: '14px', // Fixed size for editor, actual size reflected in canvas
          fontFamily,
          fontWeight,
          fontStyle,
          lineHeight,
          letterSpacing: `${letterSpacing}px`,
          textAlign: textAnchor === 'start' ? 'left' : textAnchor === 'middle' ? 'center' : 'right',
          textTransform,
          outline: 'none',
          _focusWithin: {
            borderColor: 'gray.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-gray-500)'
          }
        }}
      />
    </VStack>
  );
};
