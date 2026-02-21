import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { PanelColorPicker } from '../../ui/PanelColorPicker';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import type { StickerEffectPluginSlice, StickerStyle } from './slice';
import type { CanvasStore } from '../../store/canvasStore';
import { buildStickerFilterSvg } from './filterBuilder';
import { generateShortId } from '../../utils/idGenerator';

const styleOptions = [
  { value: 'outline', label: 'Sticker Outline' },
  { value: 'shadow', label: 'Drop Shadow' },
  { value: 'neon', label: 'Neon Glow' },
  { value: 'emboss', label: 'Emboss' },
];

const selectStickerData = (state: CanvasStore) => {
  const st = (state as unknown as StickerEffectPluginSlice).stickerEffect;
  return {
    style: st?.style ?? 'outline',
    outlineWidth: st?.outlineWidth ?? 3,
    outlineColor: st?.outlineColor ?? '#ffffff',
    shadowOffsetX: st?.shadowOffsetX ?? 3,
    shadowOffsetY: st?.shadowOffsetY ?? 3,
    shadowBlur: st?.shadowBlur ?? 4,
    shadowColor: st?.shadowColor ?? '#00000080',
    neonIntensity: st?.neonIntensity ?? 3,
    neonColor: st?.neonColor ?? '#00ffff',
    selectedCount: state.selectedIds.length,
  };
};

/**
 * Sticker Effect panel — apply decorative effects (outline, shadow, neon, emboss)
 */
export const StickerEffectPanel: React.FC = () => {
  const {
    style,
    outlineWidth,
    outlineColor,
    shadowOffsetX,
    shadowOffsetY,
    shadowBlur,
    shadowColor,
    neonIntensity,
    neonColor,
    selectedCount,
  } = useShallowCanvasSelector(selectStickerData);

  const updateStickerEffectState = useCanvasStore(
    (state) => (state as unknown as StickerEffectPluginSlice).updateStickerEffectState
  );

  const handleApply = () => {
    const store = useCanvasStore.getState() as CanvasStore;
    const stickerState = (store as unknown as StickerEffectPluginSlice).stickerEffect;
    if (!stickerState) return;

    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const filterId = generateShortId('sticker');
    const filterSvg = buildStickerFilterSvg(filterId, stickerState);

    // Register via the filter plugin if available
    const filterStore = store as Record<string, unknown>;
    if (typeof filterStore.upsertFilter === 'function') {
      (filterStore.upsertFilter as (def: { id: string; type: string; value: number; svg: string }) => void)({
        id: filterId,
        type: 'custom',
        value: 50,
        svg: filterSvg,
      });
    }

    // Apply filter to all selected elements
    for (const id of selectedIds) {
      const element = store.elements.find((el) => el.id === id);
      if (element) {
        const data = element.data as Record<string, unknown>;
        store.updateElement(id, { data: { ...data, filterId } });
      }
    }
  };

  return (
    <Panel title="Sticker Effect" isCollapsible defaultOpen={false}>
      <VStack gap={1} align="stretch">
        {selectedCount === 0 ? (
          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
            Select elements to apply sticker effect.
          </Text>
        ) : (
          <>
            <CustomSelect
              value={style}
              onChange={(val) => updateStickerEffectState?.({ style: val as StickerStyle })}
              options={styleOptions}
              size="sm"
            />

            {/* Outline controls */}
            {style === 'outline' && (
              <>
                <SliderControl
                  label="Width"
                  value={outlineWidth}
                  min={1}
                  max={20}
                  step={0.5}
                  onChange={(val) => updateStickerEffectState?.({ outlineWidth: val })}
                />
                <PanelColorPicker
                  value={outlineColor}
                  onChange={(hex) => updateStickerEffectState?.({ outlineColor: hex })}
                />
              </>
            )}

            {/* Shadow controls */}
            {style === 'shadow' && (
              <>
                <SliderControl
                  label="Offset X"
                  value={shadowOffsetX}
                  min={-20}
                  max={20}
                  step={1}
                  onChange={(val) => updateStickerEffectState?.({ shadowOffsetX: val })}
                />
                <SliderControl
                  label="Offset Y"
                  value={shadowOffsetY}
                  min={-20}
                  max={20}
                  step={1}
                  onChange={(val) => updateStickerEffectState?.({ shadowOffsetY: val })}
                />
                <SliderControl
                  label="Blur"
                  value={shadowBlur}
                  min={0}
                  max={20}
                  step={0.5}
                  onChange={(val) => updateStickerEffectState?.({ shadowBlur: val })}
                />
                <PanelColorPicker
                  value={shadowColor}
                  onChange={(hex) => updateStickerEffectState?.({ shadowColor: hex })}
                />
              </>
            )}

            {/* Neon controls */}
            {style === 'neon' && (
              <>
                <SliderControl
                  label="Intensity"
                  value={neonIntensity}
                  min={1}
                  max={15}
                  step={0.5}
                  onChange={(val) => updateStickerEffectState?.({ neonIntensity: val })}
                />
                <PanelColorPicker
                  value={neonColor}
                  onChange={(hex) => updateStickerEffectState?.({ neonColor: hex })}
                />
              </>
            )}

            {/* Emboss controls */}
            {style === 'emboss' && (
              <SliderControl
                label="Depth"
                value={outlineWidth}
                min={0.5}
                max={10}
                step={0.5}
                onChange={(val) => updateStickerEffectState?.({ outlineWidth: val })}
              />
            )}

            <PanelStyledButton onClick={handleApply} w="full" mt={1}>
              Apply {styleOptions.find((o) => o.value === style)?.label ?? 'Effect'}
            </PanelStyledButton>
          </>
        )}
      </VStack>
    </Panel>
  );
};
