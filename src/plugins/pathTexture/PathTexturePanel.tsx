import React, { useCallback } from 'react';
import { VStack, Text, Box, Input } from '@chakra-ui/react';
import { Shuffle } from 'lucide-react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import type { PathTexturePluginSlice, TexturePattern, HatchAngle } from './slice';
import type { PathData } from '../../types';
import { generateTextureSubPaths } from './textureGenerator';

const patternOptions = [
  { value: 'hatching', label: 'Hatching' },
  { value: 'crosshatch', label: 'Crosshatch' },
  { value: 'stipple', label: 'Stipple' },
  { value: 'dots-grid', label: 'Dots Grid' },
  { value: 'scribble', label: 'Scribble' },
];

const angleOptions = [
  { value: '0', label: '0° (Horizontal)' },
  { value: '45', label: '45° (Diagonal)' },
  { value: '90', label: '90° (Vertical)' },
  { value: '135', label: '135° (Diagonal)' },
];

const selectTextureData = (state: CanvasStore) => {
  const st = (state as unknown as PathTexturePluginSlice).pathTexture;
  return {
    pattern: st?.pattern ?? 'hatching',
    density: st?.density ?? 50,
    lineWidth: st?.lineWidth ?? 0.8,
    angle: st?.angle ?? 45,
    spacing: st?.spacing ?? 6,
    useElementColor: st?.useElementColor ?? true,
    textureColor: st?.textureColor ?? '#000000',
    textureOpacity: st?.textureOpacity ?? 0.8,
    seed: st?.seed ?? 42,
    selectedCount: state.selectedIds.length,
  };
};

export const PathTexturePanel: React.FC = () => {
  const {
    pattern,
    density,
    lineWidth,
    angle,
    spacing,
    useElementColor,
    textureColor,
    textureOpacity,
    selectedCount,
  } = useShallowCanvasSelector(selectTextureData);

  const updateState = useCanvasStore(
    (state) => (state as unknown as PathTexturePluginSlice).updatePathTextureState
  );

  const handleRandomize = useCallback(() => {
    updateState?.({ seed: Math.floor(Math.random() * 999999) });
  }, [updateState]);

  const handleApply = useCallback(() => {
    const store = useCanvasStore.getState() as CanvasStore;
    const textureState = (store as unknown as PathTexturePluginSlice).pathTexture;
    if (!textureState) return;

    for (const id of store.selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (!element || element.type !== 'path') continue;

      const sourceData = element.data as PathData;
      const textureSubPaths = generateTextureSubPaths(sourceData, textureState);

      if (textureSubPaths.length === 0) continue;

      const strokeColor = textureState.useElementColor
        ? (sourceData.strokeColor ?? '#000000')
        : textureState.textureColor;

      store.addElement({
        type: 'path' as const,
        data: {
          subPaths: textureSubPaths,
          strokeColor,
          strokeWidth: textureState.lineWidth,
          strokeOpacity: textureState.textureOpacity,
          fillColor: 'none',
          fillOpacity: 0,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fillRule: 'nonzero' as const,
          strokeDasharray: 'none',
        },
      });
    }
  }, []);

  return (
    <Panel title="Path Texture" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select a path to apply a texture fill.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={pattern}
              onChange={(val) => updateState?.({ pattern: val as TexturePattern })}
              options={patternOptions}
              size="sm"
            />

            <CustomSelect
              value={String(angle)}
              onChange={(val) => updateState?.({ angle: Number(val) as HatchAngle })}
              options={angleOptions}
              size="sm"
            />

            <SliderControl
              label="Density:"
              value={density}
              min={5}
              max={100}
              step={5}
              onChange={(val) => updateState?.({ density: val })}
            />

            <SliderControl
              label="Spacing:"
              value={spacing}
              min={2}
              max={30}
              step={0.5}
              onChange={(val) => updateState?.({ spacing: val })}
            />

            <SliderControl
              label="Line width:"
              value={lineWidth}
              min={0.2}
              max={5}
              step={0.1}
              onChange={(val) => updateState?.({ lineWidth: val })}
            />

            <SliderControl
              label="Opacity:"
              value={textureOpacity}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(val) => updateState?.({ textureOpacity: val })}
            />

            <PanelToggle
              isChecked={useElementColor}
              onChange={() => updateState?.({ useElementColor: !useElementColor })}
            >
              Use element color
            </PanelToggle>

            {!useElementColor && (
              <Box display="flex" alignItems="center" gap={1}>
                <Text fontSize="11px" minW="50px" color="gray.600" _dark={{ color: 'gray.400' }}>
                  Color:
                </Text>
                <Input
                  type="color"
                  value={textureColor}
                  onChange={(e) => updateState?.({ textureColor: e.target.value })}
                  size="xs"
                  w="32px"
                  h="20px"
                  p={0}
                  border="none"
                  cursor="pointer"
                />
                <Text fontSize="10px" fontFamily="mono" color="gray.500">{textureColor}</Text>
              </Box>
            )}

            <PanelStyledButton onClick={handleApply} w="full" mt={1}>
              Apply {patternOptions.find((o) => o.value === pattern)?.label ?? 'Texture'}
            </PanelStyledButton>

            {(pattern === 'stipple' || pattern === 'scribble') && (
              <PanelActionButton
                icon={Shuffle}
                label="Randomize seed"
                onClick={handleRandomize}
              />
            )}
          </>
        )}
      </VStack>
    </Panel>
  );
};
