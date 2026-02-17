import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import type { GridType, GridPluginSlice } from './slice';
import { CustomSelect } from '../../ui/CustomSelect';

const GRID_TYPE_OPTIONS: Array<{ value: GridType; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'isometric', label: 'Isometric' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'polar', label: 'Polar' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'parametric', label: 'Parametric Lattice' },
];

/**
 * Returns default parametric warp configuration
 * Centralizes default values to avoid duplication across handlers
 */
const getParametricWarpDefaults = (grid?: GridPluginSlice['grid']) => ({
  kind: 'sine2d' as const,
  ampX: 18,
  ampY: 18,
  freqX: 3,
  freqY: 2,
  phaseX: 0,
  phaseY: 1.047,
  seed: 0,
  ...(grid?.parametricWarp ?? {}),
});

/**
 * Helper to update parametric warp with defaults
 * Reduces boilerplate by merging defaults and provided partial update
 */
const createParametricWarpUpdater = (
  grid: GridPluginSlice['grid'] | undefined,
  updateGridState?: (update: Partial<GridPluginSlice['grid']>) => void
) => {
  return (partial: Partial<ReturnType<typeof getParametricWarpDefaults>>) => {
    updateGridState?.({
      parametricWarp: {
        ...getParametricWarpDefaults(grid),
        ...partial,
      },
    });
  };
};

const GridPanelComponent: React.FC = () => {
  // Only subscribe to grid state
  const grid = useCanvasStore(state => state.grid);
  const updateGridState = useCanvasStore(state => state.updateGridState);

  // Create parametric warp updater helper
  const updateParametricWarp = createParametricWarpUpdater(grid, updateGridState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateGridState);
  const handleToggleGrid = createToggleHandler('enabled');
  const handleToggleSnap = createToggleHandler('snapEnabled');
  const handleToggleRulers = createToggleHandler('showRulers');

  const handleSpacingChange = (value: number) => {
    updateGridState?.({ spacing: value });
  };

  const handlePolarDivisionsChange = (value: number) => {
    updateGridState?.({ polarDivisions: value });
  };

  const handleOpacityChange = (value: number) => {
    updateGridState?.({ opacity: value });
  };

  const handleEmphasizeChange = (value: number) => {
    updateGridState?.({ emphasizeEvery: value });
  };

  // Parametric warp handlers - using the helper to reduce duplication
  const handleWarpKindChange = (value: string) => {
    const kind = value as 'sine2d' | 'perlin2d' | 'radial';
    updateParametricWarp({ kind });
  };

  const handleAmpXChange = (value: number) => {
    updateParametricWarp({ ampX: value });
  };

  const handleAmpYChange = (value: number) => {
    updateParametricWarp({ ampY: value });
  };

  const handleFreqXChange = (value: number) => {
    updateParametricWarp({ freqX: value });
  };

  const handleFreqYChange = (value: number) => {
    updateParametricWarp({ freqY: value });
  };

  const handleParametricStepYChange = (value: number) => {
    updateGridState?.({ parametricStepY: value });
  };

  const gridType = grid?.type ?? 'square';
  const showPolarSettings = gridType === 'polar';
  const showEmphasize = gridType === 'square' || gridType === 'isometric' || gridType === 'triangular';
  const showParametricSettings = gridType === 'parametric';

  return (
    <Panel
      title="Grid"
      isCollapsible={grid?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch isChecked={grid?.enabled ?? false} onChange={handleToggleGrid} title="Show Grid" aria-label="Show Grid" />
      }
    >
      {/* Hide all internal controls when grid is disabled */}
      {grid?.enabled ? (
      <VStack spacing={0.5} align="stretch" pb={0.5}>
        {/* Grid Type Selector */}
        <VStack spacing={1} align="stretch">
          <CustomSelect
            value={gridType}
            onChange={(value) => updateGridState?.({ type: value as GridType })}
            options={GRID_TYPE_OPTIONS}
            size="sm"
            isDisabled={!(grid?.enabled ?? false)}
          />
        </VStack>

        {/* Grid toggles (Show moved to header) */}
        <PanelToggleGroup
          toggles={[
            {
              label: 'Snap',
              isChecked: grid?.snapEnabled ?? false,
              onChange: handleToggleSnap,
              isDisabled: !(grid?.enabled ?? false),
            },
            {
              label: 'Rulers',
              isChecked: grid?.showRulers ?? false,
              onChange: handleToggleRulers,
              isDisabled: !(grid?.enabled ?? false),
            },
          ]}
        />

        {/* Grid Spacing Slider */}
        <Box pr={0.5}>
          <SliderControl
            label="Spacing"
            value={grid?.spacing ?? 20}
            min={5}
            max={100}
            step={5}
            onChange={handleSpacingChange}
            formatter={(value) => `${value}px`}
            title="Grid spacing in pixels"
            valueWidth="55px"
            marginBottom='0'
          />
        </Box>

        {/* Polar-specific settings */}
        {showPolarSettings && (
          <SliderControl
            label="Divisions"
            value={grid?.polarDivisions ?? 12}
            min={4}
            max={36}
            step={1}
            onChange={handlePolarDivisionsChange}
            formatter={(value) => value.toString()}
            title="Number of radial divisions"
            valueWidth="55px"
            marginBottom='0'
          />
        )}

        {/* Opacity Slider */}
        <Box pr={0.5}>
          <PercentSliderControl
            label="Opacity"
            value={grid?.opacity ?? 0.3}
            onChange={handleOpacityChange}
            title="Grid opacity"
            valueWidth="55px"
            marginBottom='0'
          />
        </Box>

        {/* Emphasize Every N Lines */}
        {showEmphasize && (
          <Box pr={0.5}>
            <SliderControl
              label="Emphasize"
              value={grid?.emphasizeEvery ?? 0}
              min={0}
              max={10}
              step={1}
              onChange={handleEmphasizeChange}
              formatter={(value) => value === 0 ? 'Off' : `Every ${value}`}
              title="Emphasize every Nth line (0 = disabled)"
              valueWidth="55px"
              marginBottom='0'
            />
          </Box>
        )}

        {/* Parametric-specific settings */}
        {showParametricSettings && (
          <>
            <VStack spacing={1} align="stretch">
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="500">
                Warp Type
              </Text>
              <CustomSelect
                value={grid?.parametricWarp?.kind ?? 'sine2d'}
                onChange={handleWarpKindChange}
                options={[
                  { value: 'sine2d', label: 'Sine Wave 2D' },
                  { value: 'radial', label: 'Radial / Swirl' },
                  { value: 'perlin2d', label: 'Perlin Noise' },
                ]}
                size="sm"
              />
            </VStack>

            <SliderControl
              label="Step Y"
              value={grid?.parametricStepY ?? 20}
              min={5}
              max={100}
              step={5}
              onChange={handleParametricStepYChange}
              formatter={(value) => `${value}px`}
              title="Vertical grid spacing"
              valueWidth="55px"
              marginBottom='0'

            />

            <SliderControl
              label="Amplitude X"
              value={grid?.parametricWarp?.ampX ?? 18}
              min={0}
              max={50}
              step={1}
              onChange={handleAmpXChange}
              formatter={(value) => `${value}px`}
              title="Horizontal warp amplitude"
              valueWidth="55px"
              marginBottom='0'
            />

            <SliderControl
              label="Amplitude Y"
              value={grid?.parametricWarp?.ampY ?? 18}
              min={0}
              max={50}
              step={1}
              onChange={handleAmpYChange}
              formatter={(value) => `${value}px`}
              title="Vertical warp amplitude"
              valueWidth="55px"
              marginBottom='0'
            />

            <SliderControl
              label="Frequency X"
              value={grid?.parametricWarp?.freqX ?? 3}
              min={1}
              max={10}
              step={0.5}
              onChange={handleFreqXChange}
              formatter={(value) => value.toString()}
              title="Horizontal warp frequency"
              valueWidth="55px"
              marginBottom='0'
            />

            <SliderControl
              label="Frequency Y"
              value={grid?.parametricWarp?.freqY ?? 2}
              min={1}
              max={10}
              step={0.5}
              onChange={handleFreqYChange}
              formatter={(value) => value.toString()}
              title="Vertical warp frequency"
              valueWidth="55px"
              marginBottom='0'
            />
          </>
        )}
      </VStack>
      ) : null}
    </Panel>
  );
};

export default GridPanelComponent;
