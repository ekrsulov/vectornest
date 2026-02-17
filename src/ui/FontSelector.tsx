import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { isTTFFont } from '../utils/ttfFontUtils';

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  fonts: string[];
  disabled?: boolean;
  loading?: boolean;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  fonts,
  disabled = false,
  loading = false
}) => {
  const ITEM_HEIGHT = 28; // px, fixed to ensure exactly 3 visible rows

  const selectedIndex = useMemo(
    () => Math.max(0, fonts.findIndex((f) => f === value)),
    [fonts, value]
  );
  const [highlightIndex, setHighlightIndex] = useState<number>(selectedIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightIndex(selectedIndex);
  }, [selectedIndex]);

  // Ensure selected item stays in view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(fonts.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlightIndex(fonts.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const font = fonts[highlightIndex];
      if (font) onChange(font);
    }
  };

  if (loading) {
    return (
      <Box
        flex={1}
        p="4px 8px"
        border="1px solid"
        borderColor="gray.300"
        borderRadius="md"
        fontSize="xs"
        bg="gray.50"
        color="gray.600"
        _dark={{ bg: 'gray.900', borderColor: 'whiteAlpha.300', color: 'gray.300' }}
      >
        Loading fonts...
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      role="listbox"
      aria-activedescendant={`font-opt-${highlightIndex}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      width="100%"
      border="1px solid"
      borderColor="gray.300"
      borderRadius="md"
      fontSize="sm"
      bg="white"
      color="inherit"
      _dark={{ bg: 'gray.800', borderColor: 'whiteAlpha.300' }}
      overflowY="auto"
      maxH={`${ITEM_HEIGHT * 3}px`}
      height={`${ITEM_HEIGHT * 3}px`}
      cursor={disabled ? 'not-allowed' : 'default'}
      opacity={disabled ? 0.6 : 1}
    >
      {fonts.map((font, idx) => {
        const isSelected = font === value;
        const isHighlighted = idx === highlightIndex;
        return (
          <Box
            id={`font-opt-${idx}`}
            key={font}
            ref={isHighlighted ? selectedRef : undefined}
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => setHighlightIndex(idx)}
            onClick={() => !disabled && onChange(font)}
            display="flex"
            alignItems="center"
            height={`${ITEM_HEIGHT}px`
            }
            px={2}
            // Separator between items
            borderBottom={idx < fonts.length - 1 ? '1px solid' : 'none'}
            borderColor="gray.200"
            // Visual states
            bg={isHighlighted ? (isSelected ? 'gray.300' : 'gray.100') : (isSelected ? 'gray.200' : 'transparent')}
            _dark={{
              borderColor: 'whiteAlpha.200',
              ...(isHighlighted
                ? { bg: isSelected ? 'gray.600' : 'gray.700' }
                : { bg: isSelected ? 'gray.700' : 'transparent' }
              ),
            }}
            fontFamily={font}
            title={font}
            pointerEvents={disabled ? 'none' : 'auto'}
          >
            {isTTFFont(font) ? `${font} (TTF)` : font}
          </Box>
        );
      })}
    </Box>
  );
};