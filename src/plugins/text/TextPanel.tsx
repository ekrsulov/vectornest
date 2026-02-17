import React, { useState, useEffect } from 'react';
import {
  HStack,
  VStack,
  Textarea,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../../ui/FontSelector';
import { ToggleButton } from '../../ui/ToggleButton';
import { NumberInput } from '../../ui/NumberInput';
import { Panel } from '../../ui/Panel';
import { logger } from '../../utils';
import { createPropertyUpdater, createPropertyGetters, preventSpacebarPropagation } from '../../utils/panelHelpers';

interface TextPanelProps { hideTitle?: boolean }

export const TextPanel: React.FC<TextPanelProps> = ({ hideTitle = false }) => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const text = useCanvasStore(state => state.text);
  const updateTextState = useCanvasStore(state => state.updateTextState);

  // Create property updater and current values helper
  const updateProperty = createPropertyUpdater(updateTextState);
  const current = createPropertyGetters(text, {
    fontSize: 16,
    fontFamily: 'Arial',
    text: '',
    fontWeight: 'normal' as 'normal' | 'bold',
    fontStyle: 'normal' as 'normal' | 'italic'
  });

  // Font detection state
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [isScanningFonts, setIsScanningFonts] = useState(true);

  // Load available fonts on component mount
  useEffect(() => {
    const loadFonts = async () => {
      setIsScanningFonts(true);
      try {
        const fonts = getAvailableFonts();
        setAvailableFonts(fonts);
      } catch (error) {
        logger.error('Error detecting fonts', error);
        // Fallback to basic fonts if detection fails
        setAvailableFonts(['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia']);
      } finally {
        setIsScanningFonts(false);
      }
    };

    loadFonts();
  }, []);

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState?.({ fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState?.({ fontStyle: value });
  };

  return (
    <Panel title="Text" hideHeader={hideTitle}>
      <VStack spacing={2} align="stretch" p={0.5}>
        {/* Font Selector */}
        <FontSelector
          value={current.fontFamily}
          onChange={updateProperty('fontFamily')}
          fonts={availableFonts}
          disabled={isScanningFonts}
          loading={isScanningFonts}
        />

        {/* Text Input */}
        <Textarea
          value={current.text}
          onChange={(e) => updateProperty('text')(e.target.value)}
          onKeyDown={preventSpacebarPropagation}
          placeholder="Enter text"
          size="sm"
          rows={3}
          resize="vertical"
          minH="60px"
          borderRadius="0"
          _focus={{
            borderColor: 'gray.600',
            boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
          }}
        />

        {/* Font Size and Style Controls */}
        <HStack spacing={1}>
          <NumberInput
            label="Size"
            value={current.fontSize}
            onChange={updateProperty('fontSize')}
            min={4}
            max={200}
            inputWidth="50px"
          />
          
          <ToggleButton
            isActive={current.fontWeight === 'bold'}
            onClick={() => handleFontWeightChange(current.fontWeight === 'bold' ? 'normal' : 'bold')}
            icon={<Bold size={12} />}
            aria-label="Bold"
            size="sm"
          />
          
          <ToggleButton
            isActive={current.fontStyle === 'italic'}
            onClick={() => handleFontStyleChange(current.fontStyle === 'italic' ? 'normal' : 'italic')}
            icon={<Italic size={12} />}
            aria-label="Italic"
            size="sm"
          />
        </HStack>
      </VStack>
    </Panel>
  );
}
