import React, { useCallback, useMemo } from 'react';
import { VStack, Text, HStack } from '@chakra-ui/react';
import { Shuffle } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { CustomSelect } from '../../ui/CustomSelect';
import type { ScatterAlongPathPluginSlice, ScatterMode, ScatterAlign } from './slice';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData, PathElement } from '../../types';
import { generateScatterCopies } from './scatterUtils';

const modeOptions = [
  { value: 'even', label: 'Even Spacing' },
  { value: 'random', label: 'Random' },
];

const alignOptions = [
  { value: 'tangent', label: 'Follow Path' },
  { value: 'fixed', label: 'Fixed Angle' },
  { value: 'none', label: 'No Rotation' },
];

const selectScatterData = (state: CanvasStore) => {
  const st = (state as unknown as ScatterAlongPathPluginSlice).scatterAlongPath;
  return {
    copies: st?.copies ?? 10,
    mode: st?.mode ?? 'even',
    scale: st?.scale ?? 1.0,
    scaleVariation: st?.scaleVariation ?? 0,
    align: st?.align ?? 'tangent',
    rotationOffset: st?.rotationOffset ?? 0,
    rotationVariation: st?.rotationVariation ?? 0,
    perpendicularOffset: st?.perpendicularOffset ?? 0,
    seed: st?.seed ?? 42,
    selectedCount: state.selectedIds.length,
  };
};

/**
 * ScatterAlongPath panel — scatter copies of one element along another path.
 * Requires exactly 2 path elements selected: first = source element, second = guide path.
 */
export const ScatterAlongPathPanel: React.FC = () => {
  const {
    copies,
    mode,
    scale,
    scaleVariation,
    align,
    rotationOffset,
    rotationVariation,
    perpendicularOffset,
    selectedCount,
  } = useShallowCanvasSelector(selectScatterData);

  const updateScatterAlongPathState = useCanvasStore(
    (state) => (state as unknown as ScatterAlongPathPluginSlice).updateScatterAlongPathState
  );

  const exactlyTwo = selectedCount === 2;

  const selectedElements = useMemo(() => {
    if (!exactlyTwo) return null;
    const store = useCanvasStore.getState();
    const ids = store.selectedIds;
    const els = ids.map((id) => store.elements.find((el) => el.id === id)).filter(Boolean);
    if (els.length !== 2) return null;
    if (els[0]!.type !== 'path' || els[1]!.type !== 'path') return null;
    return els as PathElement[];
  }, [exactlyTwo]);

  const handleRandomize = useCallback(() => {
    updateScatterAlongPathState?.({ seed: Math.floor(Math.random() * 999999) });
  }, [updateScatterAlongPathState]);

  const handleApply = useCallback(() => {
    if (!selectedElements) return;

    const store = useCanvasStore.getState();
    const scatterState = (store as unknown as ScatterAlongPathPluginSlice).scatterAlongPath;
    if (!scatterState) return;

    const [sourceEl, guideEl] = selectedElements;
    const sourceData = sourceEl.data as PathData;
    const guideData = guideEl.data as PathData;

    const scattered = generateScatterCopies(sourceData, guideData, scatterState);

    // Add each scattered copy as a new path element
    for (const copy of scattered) {
      store.addElement({
        type: 'path' as const,
        data: {
          ...sourceData,
          subPaths: copy.subPaths,
        },
      });
    }
  }, [selectedElements]);

  return (
    <Panel title="Scatter Along Path" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {!exactlyTwo ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select exactly 2 paths: first is the source shape, second is the guide path.
          </Text>
        ) : selectedElements === null ? (
          <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.400' }}>
            Both selected elements must be path elements.
          </Text>
        ) : (
          <>
            <SliderControl
              label="Copies:"
              value={copies}
              min={1}
              max={100}
              step={1}
              onChange={(val) => updateScatterAlongPathState?.({ copies: val })}
            />

            <CustomSelect
              value={mode}
              onChange={(val) => updateScatterAlongPathState?.({ mode: val as ScatterMode })}
              options={modeOptions}
              size="sm"
            />

            <CustomSelect
              value={align}
              onChange={(val) => updateScatterAlongPathState?.({ align: val as ScatterAlign })}
              options={alignOptions}
              size="sm"
            />

            <SliderControl
              label="Scale:"
              value={scale}
              min={0.1}
              max={3.0}
              step={0.05}
              onChange={(val) => updateScatterAlongPathState?.({ scale: val })}
            />

            <SliderControl
              label="Scale var.:"
              value={scaleVariation}
              min={0}
              max={100}
              step={1}
              onChange={(val) => updateScatterAlongPathState?.({ scaleVariation: val })}
            />

            <SliderControl
              label="Rotation:"
              value={rotationOffset}
              min={-180}
              max={180}
              step={1}
              onChange={(val) => updateScatterAlongPathState?.({ rotationOffset: val })}
            />

            <SliderControl
              label="Rot. var.:"
              value={rotationVariation}
              min={0}
              max={180}
              step={1}
              onChange={(val) => updateScatterAlongPathState?.({ rotationVariation: val })}
            />

            <SliderControl
              label="Offset:"
              value={perpendicularOffset}
              min={-50}
              max={50}
              step={0.5}
              onChange={(val) => updateScatterAlongPathState?.({ perpendicularOffset: val })}
            />

            <HStack gap={1}>
              <PanelStyledButton onClick={handleApply} flex={1}>
                Scatter ({copies} copies)
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
