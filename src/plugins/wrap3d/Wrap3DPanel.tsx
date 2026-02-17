import React, { useEffect } from 'react';
import {
  VStack,
  FormControl,
  HStack,
  Button,
  Text,
  Divider,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { RotateCcw } from 'lucide-react';

import type { Wrap3DSlice } from './slice';
import type { ShapeType } from './wrap3dUtils';

const SHAPE_OPTIONS: { value: ShapeType; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'torus', label: 'Torus' },
  { value: 'cone', label: 'Cone' },
  { value: 'ellipsoid', label: 'Ellipsoid' },
  { value: 'wave', label: 'Wave Surface' },
];

/**
 * Wrap 3D Panel
 * 
 * Allows users to transform paths onto various 3D surfaces
 * with interactive rotation controls and shape-specific parameters.
 */
const Wrap3DPanelComponent: React.FC = () => {
  // Subscribe to state
  const isActive = useCanvasStore(state => (state as unknown as Wrap3DSlice).isActive ?? false);
  const selectedShape = useCanvasStore(state => (state as unknown as Wrap3DSlice).selectedShape ?? 'sphere');
  const rotationX = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationX ?? 0);
  const rotationY = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationY ?? 0);
  const rotationZ = useCanvasStore(state => (state as unknown as Wrap3DSlice).rotationZ ?? 0);
  const shapeParams = useCanvasStore(state => (state as unknown as Wrap3DSlice).shapeParams);
  const isLivePreview = useCanvasStore(state => (state as unknown as Wrap3DSlice).isLivePreview ?? false);
  
  // Get actions
  const setSelectedShape = useCanvasStore(state => (state as unknown as Wrap3DSlice).setSelectedShape);
  const setRotationX = useCanvasStore(state => (state as unknown as Wrap3DSlice).setRotationX);
  const setRotationY = useCanvasStore(state => (state as unknown as Wrap3DSlice).setRotationY);
  const setRotationZ = useCanvasStore(state => (state as unknown as Wrap3DSlice).setRotationZ);
  const resetRotation = useCanvasStore(state => (state as unknown as Wrap3DSlice).resetRotation);
  const activateWrap3DTool = useCanvasStore(state => (state as unknown as Wrap3DSlice).activateWrap3DTool);
  const deactivateWrap3DTool = useCanvasStore(state => (state as unknown as Wrap3DSlice).deactivateWrap3DTool);
  const applyWrap3D = useCanvasStore(state => (state as unknown as Wrap3DSlice).applyWrap3D);
  const canApplyWrap3D = useCanvasStore(state => (state as unknown as Wrap3DSlice).canApplyWrap3D);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);

  // Shape-specific parameter setters
  const setRadiusMultiplier = useCanvasStore(state => (state as unknown as Wrap3DSlice).setRadiusMultiplier);
  const setCylinderHeight = useCanvasStore(state => (state as unknown as Wrap3DSlice).setCylinderHeight);
  const setTorusMajorRadius = useCanvasStore(state => (state as unknown as Wrap3DSlice).setTorusMajorRadius);
  const setTorusMinorRadius = useCanvasStore(state => (state as unknown as Wrap3DSlice).setTorusMinorRadius);
  const setConeBaseRadius = useCanvasStore(state => (state as unknown as Wrap3DSlice).setConeBaseRadius);
  const setConeHeight = useCanvasStore(state => (state as unknown as Wrap3DSlice).setConeHeight);
  const setEllipsoidRadiusX = useCanvasStore(state => (state as unknown as Wrap3DSlice).setEllipsoidRadiusX);
  const setEllipsoidRadiusY = useCanvasStore(state => (state as unknown as Wrap3DSlice).setEllipsoidRadiusY);
  const setEllipsoidRadiusZ = useCanvasStore(state => (state as unknown as Wrap3DSlice).setEllipsoidRadiusZ);
  const setWaveAmplitudeX = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWaveAmplitudeX);
  const setWaveAmplitudeY = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWaveAmplitudeY);
  const setWaveFrequencyX = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWaveFrequencyX);
  const setWaveFrequencyY = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWaveFrequencyY);
  const setWavePhaseX = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWavePhaseX);
  const setWavePhaseY = useCanvasStore(state => (state as unknown as Wrap3DSlice).setWavePhaseY);

  // Force re-render when selection changes
  const selectedIds = useCanvasStore(state => state.selectedIds);
  
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');

  const canApply = canApplyWrap3D?.() ?? false;
  
  // Get number of paths being transformed
  const originalPaths = useCanvasStore(state => (state as unknown as Wrap3DSlice).originalPaths ?? []);
  const pathCount = originalPaths.length;

  // Activate tool when panel mounts
  useEffect(() => {
    if (!isActive && activateWrap3DTool) {
      activateWrap3DTool();
    }
  }, [isActive, activateWrap3DTool, selectedIds]);

  const handleApply = () => {
    applyWrap3D?.();
    setActivePlugin?.('select');
  };

  const handleCancel = () => {
    deactivateWrap3DTool?.();
    setActivePlugin?.('select');
  };

  const handleReset = () => {
    resetRotation?.();
  };

  const handleShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedShape?.(e.target.value as ShapeType);
  };

  if (!canApply && !isActive) {
    return (
      <Panel title="Wrap 3D">
        <VStack align="stretch" spacing={2}>
          <Text fontSize="12px" color={labelColor} textAlign="center">
            Select paths, groups, or a mix to use Wrap 3D
          </Text>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setActivePlugin?.('select')}
          >
            Exit Mode
          </Button>
        </VStack>
      </Panel>
    );
  }

  // Render shape-specific parameters
  const renderShapeParams = () => {
    if (!shapeParams) return null;

    switch (selectedShape) {
      case 'sphere':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Sphere Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Radius"
                value={shapeParams.radiusMultiplier}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setRadiusMultiplier?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      case 'cylinder':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Cylinder Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Radius"
                value={shapeParams.radiusMultiplier}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setRadiusMultiplier?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Height"
                value={shapeParams.cylinderHeight}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setCylinderHeight?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      case 'torus':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Torus Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Major R"
                value={shapeParams.torusMajorRadius}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setTorusMajorRadius?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Minor R"
                value={shapeParams.torusMinorRadius}
                min={0.1}
                max={1.5}
                step={0.1}
                onChange={(value) => setTorusMinorRadius?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      case 'cone':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Cone Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Base R"
                value={shapeParams.coneBaseRadius}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setConeBaseRadius?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Height"
                value={shapeParams.coneHeight}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(value) => setConeHeight?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      case 'ellipsoid':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Ellipsoid Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Radius X"
                value={shapeParams.ellipsoidRadiusX}
                min={0.3}
                max={3.0}
                step={0.1}
                onChange={(value) => setEllipsoidRadiusX?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Radius Y"
                value={shapeParams.ellipsoidRadiusY}
                min={0.3}
                max={3.0}
                step={0.1}
                onChange={(value) => setEllipsoidRadiusY?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Radius Z"
                value={shapeParams.ellipsoidRadiusZ}
                min={0.3}
                max={3.0}
                step={0.1}
                onChange={(value) => setEllipsoidRadiusZ?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      case 'wave':
        return (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
              Wave Settings
            </Text>
            <FormControl>
              <SliderControl
                inline
                label="Amp X"
                value={shapeParams.waveAmplitudeX}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(value) => setWaveAmplitudeX?.(value)}
                formatter={(v) => v.toFixed(2)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Amp Y"
                value={shapeParams.waveAmplitudeY}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(value) => setWaveAmplitudeY?.(value)}
                formatter={(v) => v.toFixed(2)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Freq X"
                value={shapeParams.waveFrequencyX}
                min={0.5}
                max={5.0}
                step={0.5}
                onChange={(value) => setWaveFrequencyX?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Freq Y"
                value={shapeParams.waveFrequencyY}
                min={0.5}
                max={5.0}
                step={0.5}
                onChange={(value) => setWaveFrequencyY?.(value)}
                formatter={(v) => v.toFixed(1)}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Phase X"
                value={shapeParams.wavePhaseX}
                min={0}
                max={Math.PI * 2}
                step={0.1}
                onChange={(value) => setWavePhaseX?.(value)}
                formatter={(v) => `${(v / Math.PI * 180).toFixed(0)}°`}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
            <FormControl>
              <SliderControl
                inline
                label="Phase Y"
                value={shapeParams.wavePhaseY}
                min={0}
                max={Math.PI * 2}
                step={0.1}
                onChange={(value) => setWavePhaseY?.(value)}
                formatter={(v) => `${(v / Math.PI * 180).toFixed(0)}°`}
                labelWidth="52px"
                valueWidth="48px"
              />
            </FormControl>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Panel
      title="Wrap 3D"
      headerActions={
        <HStack spacing={1}>
          <PanelStyledButton
            onClick={handleReset}
            size="xs"
            variant="ghost"
            title="Reset"
          >
            <RotateCcw size={14} />
          </PanelStyledButton>
          <PanelStyledButton
            onClick={handleApply}
            isDisabled={!isLivePreview}
            size="xs"
          >
            Apply
          </PanelStyledButton>
        </HStack>
      }
    >
      <VStack align="stretch" spacing={2}>
        {/* Shape Selection */}
        <FormControl>
          <Select
            size="xs"
            value={selectedShape}
            onChange={handleShapeChange}
          >
            {SHAPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormControl>

        <Divider />

        {/* Rotation Controls */}
        <VStack 
          align="stretch" 
          spacing={1} 
          p={2} 
          bg={sectionBg} 
          borderRadius="md"
        >
          <Text fontSize="11px" fontWeight="medium" color={labelColor} mb={1}>
            3D Rotation
          </Text>
          
          <FormControl>
            <SliderControl
              inline
              label="X Axis"
              value={rotationX}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => setRotationX?.(value)}
              formatter={(v) => `${Math.round(v)}°`}
              labelWidth="52px"
              valueWidth="48px"
            />
          </FormControl>

          <FormControl>
            <SliderControl
              inline
              label="Y Axis"
              value={rotationY}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => setRotationY?.(value)}
              formatter={(v) => `${Math.round(v)}°`}
              labelWidth="52px"
              valueWidth="48px"
            />
          </FormControl>

          <FormControl>
            <SliderControl
              inline
              label="Z Axis"
              value={rotationZ}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => setRotationZ?.(value)}
              formatter={(v) => `${Math.round(v)}°`}
              labelWidth="52px"
              valueWidth="48px"
            />
          </FormControl>
        </VStack>

        <Divider />

        {/* Shape-specific Settings */}
        {renderShapeParams()}

        <Divider />

        {/* Action Buttons */}
        <HStack spacing={2} justify="flex-end">
          <Button
            size="xs"
            variant="ghost"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </HStack>

        {/* Preview Status */}
        <Text fontSize="10px" color={isLivePreview ? "green.500" : "orange.500"} textAlign="center">
          {isLivePreview 
            ? `✓ Transforming ${pathCount} path${pathCount !== 1 ? 's' : ''} - adjust sliders to preview` 
            : "⚠ Select paths to start"}
        </Text>
      </VStack>
    </Panel>
  );
};

export const Wrap3DPanel = React.memo(Wrap3DPanelComponent);

// Export for backward compatibility
export const SphereWrapPanel = Wrap3DPanel;
