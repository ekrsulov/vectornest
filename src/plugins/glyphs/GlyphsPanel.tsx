import React, { useCallback, useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { NumberInput } from '../../ui/NumberInput';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { GlyphsPluginSlice, GlyphInfo } from './slice';
import type { NativeTextElement } from '../nativeText/types';
import type { PathElement } from '../../types';
import { updateGlyphInSpans } from './glyphUtils';

type GlyphsStore = CanvasStore & GlyphsPluginSlice;
type GlyphTarget =
  | { kind: 'nativeText'; element: NativeTextElement }
  | { kind: 'textPath'; element: PathElement };

export const GlyphsPanel: React.FC = () => {
  const {
    selectedIds, elements,
    glyphsState, updateGlyphsState,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as GlyphsStore;
      return {
        selectedIds: s.selectedIds,
        elements: s.elements,
        glyphsState: st.glyphs,
        updateGlyphsState: st.updateGlyphsState,
      };
    })
  );

  const target = useMemo<GlyphTarget | null>(() => {
    if (selectedIds.length !== 1) return null;
    const el = elements.find((e) => e.id === selectedIds[0]);
    if (!el) return null;
    if (el.type === 'nativeText') {
      return { kind: 'nativeText', element: el as NativeTextElement };
    }
    if (el.type === 'path' && (el as PathElement).data.textPath?.text) {
      return { kind: 'textPath', element: el as PathElement };
    }
    return null;
  }, [selectedIds, elements]);

  const glyphs = glyphsState?.glyphs ?? [];
  const selectedGlyphIndex = glyphsState?.selectedGlyphIndex ?? null;
  const showLabels = glyphsState?.showLabels ?? true;
  const selectedGlyph: GlyphInfo | null = selectedGlyphIndex !== null ? glyphs[selectedGlyphIndex] ?? null : null;

  const applyUpdate = useCallback((updates: { dx?: number; dy?: number; rotate?: number }) => {
    if (!target || selectedGlyphIndex === null) return;
    const state = useCanvasStore.getState();
    const targetData = target.kind === 'nativeText'
      ? target.element.data
      : target.element.data.textPath;
    if (!targetData) return;
    const newSpans = updateGlyphInSpans(targetData, selectedGlyphIndex, updates);
    if (!newSpans) return;
    if (target.kind === 'nativeText') {
      state.updateElement(target.element.id, {
        data: { ...target.element.data, spans: newSpans },
      });
      return;
    }

    state.updateElement(target.element.id, {
      data: {
        ...target.element.data,
        textPath: {
          ...target.element.data.textPath,
          spans: newSpans,
        },
      },
    });
  }, [target, selectedGlyphIndex]);

  const handleSelectGlyph = useCallback((idx: number) => {
    updateGlyphsState?.({ selectedGlyphIndex: idx });
  }, [updateGlyphsState]);

  if (!target) {
    return (
      <Panel title="Glyphs" isCollapsible defaultOpen>
        <Text fontSize="xs" color="gray.500" px={2} py={3}>
          Select a text or text path element to edit individual glyphs.
        </Text>
      </Panel>
    );
  }

  return (
    <Panel title="Glyphs" isCollapsible defaultOpen>
      <VStack gap={2} align="stretch" px={1}>
        <PanelToggle
          isChecked={showLabels}
          onChange={(e) => updateGlyphsState?.({ showLabels: e.target.checked })}
        >
          Show labels
        </PanelToggle>

        {/* Glyph list */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
            Characters ({glyphs.length})
          </Text>
          <HStack flexWrap="wrap" gap={0.5}>
            {glyphs.map((g, idx) => {
              if (g.char.trim().length === 0) return null;
              const isSelected = idx === selectedGlyphIndex;
              return (
                <Box
                  key={idx}
                  as="button"
                  px={1.5}
                  py={0.5}
                  fontSize="xs"
                  fontFamily="mono"
                  borderRadius="sm"
                  border="1px solid"
                  borderColor={isSelected ? 'blue.400' : 'gray.300'}
                  bg={isSelected ? 'blue.50' : 'transparent'}
                  color={isSelected ? 'blue.600' : 'inherit'}
                  _dark={{
                    borderColor: isSelected ? 'blue.400' : 'gray.600',
                    bg: isSelected ? 'blue.900' : 'transparent',
                    color: isSelected ? 'blue.200' : 'inherit',
                  }}
                  cursor="pointer"
                  onClick={() => handleSelectGlyph(idx)}
                  title={`Glyph ${idx}: "${g.char}"`}
                  minW="24px"
                  textAlign="center"
                  _hover={{ borderColor: 'blue.300' }}
                >
                  {g.char}
                </Box>
              );
            })}
          </HStack>
        </Box>

        {/* Selected glyph controls */}
        {selectedGlyph && (
          <VStack gap={2} align="stretch" pt={1} borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
            <Text fontSize="xs" fontWeight="medium" color="gray.500">
              Glyph {selectedGlyphIndex}: &quot;{selectedGlyph.char}&quot;
            </Text>

            <NumberInput
              label="dx"
              value={selectedGlyph.dx}
              onChange={(val) => applyUpdate({ dx: val })}
              step={1}
              suffix="px"
            />

            <NumberInput
              label="dy"
              value={selectedGlyph.dy}
              onChange={(val) => applyUpdate({ dy: val })}
              step={1}
              suffix="px"
            />

            <NumberInput
              label="rotate"
              value={selectedGlyph.rotate}
              onChange={(val) => applyUpdate({ rotate: val })}
              step={1}
              min={-360}
              max={360}
              suffix="°"
            />
          </VStack>
        )}
      </VStack>
    </Panel>
  );
};
