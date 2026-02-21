import React, { useCallback } from 'react';
import { VStack, Text, HStack } from '@chakra-ui/react';
import { PanelColorPicker } from '../../ui/PanelColorPicker';
import { Shuffle } from 'lucide-react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import type { ParticleFieldPluginSlice, ParticleShape, ParticleDistribution } from './slice';
import type { PathData } from '../../types';
import { generateParticleField } from './particleGenerator';

const shapeOptions = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'star', label: 'Star' },
  { value: 'cross', label: 'Cross' },
  { value: 'line', label: 'Line' },
];

const distributionOptions = [
  { value: 'random', label: 'Random' },
  { value: 'poisson', label: 'Poisson Disk' },
  { value: 'grid-jitter', label: 'Grid + Jitter' },
];

const selectParticleData = (state: CanvasStore) => {
  const st = (state as unknown as ParticleFieldPluginSlice).particleField;
  return {
    shape: st?.shape ?? 'circle',
    distribution: st?.distribution ?? 'random',
    count: st?.count ?? 80,
    minSize: st?.minSize ?? 1.5,
    maxSize: st?.maxSize ?? 4,
    randomRotation: st?.randomRotation ?? true,
    useElementColor: st?.useElementColor ?? false,
    particleColor: st?.particleColor ?? '#000000',
    particleOpacity: st?.particleOpacity ?? 0.9,
    filled: st?.filled ?? true,
    strokeWidth: st?.strokeWidth ?? 0.5,
    selectedCount: state.selectedIds.length,
  };
};

export const ParticleFieldPanel: React.FC = () => {
  const {
    shape,
    distribution,
    count,
    minSize,
    maxSize,
    randomRotation,
    useElementColor,
    particleColor,
    particleOpacity,
    filled,
    strokeWidth,
    selectedCount,
  } = useShallowCanvasSelector(selectParticleData);

  const updateState = useCanvasStore(
    (state) => (state as unknown as ParticleFieldPluginSlice).updateParticleFieldState
  );

  const handleRandomize = useCallback(() => {
    updateState?.({ seed: Math.floor(Math.random() * 999999) });
  }, [updateState]);

  const handleApply = useCallback(() => {
    const store = useCanvasStore.getState() as CanvasStore;
    const particleState = (store as unknown as ParticleFieldPluginSlice).particleField;
    if (!particleState) return;

    for (const id of store.selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (!element || element.type !== 'path') continue;

      const sourceData = element.data as PathData;
      const particleSubPaths = generateParticleField(sourceData, particleState);

      if (particleSubPaths.length === 0) continue;

      const color = particleState.useElementColor
        ? (sourceData.fillColor !== 'none' ? sourceData.fillColor : sourceData.strokeColor) ?? '#000000'
        : particleState.particleColor;

      store.addElement({
        type: 'path' as const,
        data: {
          subPaths: particleSubPaths,
          fillColor: particleState.filled ? color : 'none',
          fillOpacity: particleState.particleOpacity,
          strokeColor: particleState.filled ? 'none' : color,
          strokeWidth: particleState.strokeWidth,
          strokeOpacity: particleState.particleOpacity,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fillRule: 'nonzero' as const,
          strokeDasharray: 'none',
        },
      });
    }
  }, []);

  return (
    <Panel title="Particle Field" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select a closed path to fill with particles.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={shape}
              onChange={(val) => updateState?.({ shape: val as ParticleShape })}
              options={shapeOptions}
              size="sm"
            />

            <CustomSelect
              value={distribution}
              onChange={(val) => updateState?.({ distribution: val as ParticleDistribution })}
              options={distributionOptions}
              size="sm"
            />

            <SliderControl
              label="Count"
              value={count}
              min={5}
              max={500}
              step={5}
              onChange={(val) => updateState?.({ count: val })}
            />

            <SliderControl
              label="Min size"
              value={minSize}
              min={0.5}
              max={20}
              step={0.5}
              onChange={(val) => updateState?.({ minSize: val })}
            />

            <SliderControl
              label="Max size"
              value={maxSize}
              min={1}
              max={30}
              step={0.5}
              onChange={(val) => updateState?.({ maxSize: val })}
            />

            <SliderControl
              label="Opacity"
              value={particleOpacity}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(val) => updateState?.({ particleOpacity: val })}
            />

            <PanelToggle
              isChecked={filled}
              onChange={() => updateState?.({ filled: !filled })}
            >
              Filled particles
            </PanelToggle>

            {!filled && (
              <SliderControl
                label="Stroke"
                value={strokeWidth}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(val) => updateState?.({ strokeWidth: val })}
              />
            )}

            <PanelToggle
              isChecked={randomRotation}
              onChange={() => updateState?.({ randomRotation: !randomRotation })}
            >
              Random rotation
            </PanelToggle>

            <PanelToggle
              isChecked={useElementColor}
              onChange={() => updateState?.({ useElementColor: !useElementColor })}
            >
              Use element color
            </PanelToggle>

            {!useElementColor && (
              <PanelColorPicker
                value={particleColor}
                onChange={(hex) => updateState?.({ particleColor: hex })}
              />
            )}

            <HStack gap={1} mt={1}>
              <PanelStyledButton onClick={handleApply} flex={1}>
                Generate Particles
              </PanelStyledButton>
              <PanelActionButton
                icon={Shuffle}
                label="Randomize seed"
                onClick={handleRandomize}
              />
            </HStack>
          </>
        )}
      </VStack>
    </Panel>
  );
};
