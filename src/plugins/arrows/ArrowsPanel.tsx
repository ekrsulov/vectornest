import React from 'react';
import {
  VStack,
  Text,
  Flex,
  Select,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { ArrowsPluginSlice, ArrowsPluginActions, ArrowHeadStyle } from './slice';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { arrowHeadOptions, arrowPresets } from './arrowUtils';

/**
 * Arrow head preview SVG
 */
const ArrowHeadPreview: React.FC<{ style: ArrowHeadStyle; direction: 'start' | 'end' }> = ({ style, direction }) => {
  const strokeColor = useColorModeValue('#374151', '#d1d5db');
  const fillColor = useColorModeValue('#374151', '#d1d5db');

  const renderHead = () => {
    switch (style) {
      case 'none':
        return <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />;
      case 'triangle':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <polygon
              points={direction === 'end' ? '24,16 16,12 16,20' : '8,16 16,12 16,20'}
              fill={fillColor}
            />
          </>
        );
      case 'triangleOpen':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <polygon
              points={direction === 'end' ? '24,16 16,12 16,20' : '8,16 16,12 16,20'}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
            />
          </>
        );
      case 'diamond':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <polygon
              points={direction === 'end' ? '24,16 20,12 16,16 20,20' : '8,16 12,12 16,16 12,20'}
              fill={fillColor}
            />
          </>
        );
      case 'diamondOpen':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <polygon
              points={direction === 'end' ? '24,16 20,12 16,16 20,20' : '8,16 12,12 16,16 12,20'}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
            />
          </>
        );
      case 'circle':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <circle
              cx={direction === 'end' ? 21 : 11}
              cy={16}
              r={4}
              fill={fillColor}
            />
          </>
        );
      case 'circleOpen':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <circle
              cx={direction === 'end' ? 21 : 11}
              cy={16}
              r={4}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
            />
          </>
        );
      case 'bar':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <line
              x1={direction === 'end' ? 24 : 8}
              y1={10}
              x2={direction === 'end' ? 24 : 8}
              y2={22}
              stroke={strokeColor}
              strokeWidth={2}
            />
          </>
        );
      case 'chevron':
        return (
          <>
            <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />
            <polyline
              points={direction === 'end' ? '17,11 24,16 17,21' : '15,11 8,16 15,21'}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      default:
        return <line x1={8} y1={16} x2={24} y2={16} stroke={strokeColor} strokeWidth={2} />;
    }
  };

  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      {renderHead()}
    </svg>
  );
};

// Line style options for JoinedButtonGroup
const lineStyleOptions: Array<{ value: 'straight' | 'curved'; label: string; description: string }> = [
  { value: 'straight', label: 'Straight', description: 'Straight line' },
  { value: 'curved', label: 'Curved', description: 'Curved line' },
];

// Routing mode options for JoinedButtonGroup
const routingModeOptions: Array<{ value: 'simple' | 'pathfinding'; label: string; description: string }> = [
  { value: 'simple', label: 'Simple', description: 'Single curve around obstacles' },
  { value: 'pathfinding', label: 'Smart', description: 'A* pathfinding through corridors' },
];

export const ArrowsPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
  const arrows = useCanvasStore((state) => (state as CanvasStore & ArrowsPluginSlice).arrows);
  const updateArrowConfig = useCanvasStore((state) => (state as CanvasStore & ArrowsPluginSlice & ArrowsPluginActions).updateArrowConfig);
  const labelColor = useColorModeValue('gray.600', 'gray.300');

  if (!arrows) return null;

  const { config } = arrows;

  const handlePresetClick = (preset: keyof typeof arrowPresets) => {
    updateArrowConfig(arrowPresets[preset]);
  };

  return (
    <Panel title={hideTitle ? undefined : 'Arrows'}>
      <VStack spacing={1} align="stretch">
        {/* Presets - compact row */}
        <HStack spacing={1} flexWrap="wrap">
          <PanelStyledButton onClick={() => handlePresetClick('simple')}>
            Simple
          </PanelStyledButton>
          <PanelStyledButton onClick={() => handlePresetClick('dimension')}>
            Dimension
          </PanelStyledButton>
          <PanelStyledButton onClick={() => handlePresetClick('connector')}>
            Connector
          </PanelStyledButton>
        </HStack>

        {/* Start Head */}
        <Flex align="center" gap={1}>
          <Text fontSize="12px" color={labelColor} minW="35px">Start</Text>
          <ArrowHeadPreview style={config.startHead} direction="start" />
          <Select
            size="xs"
            flex={1}
            value={config.startHead}
            onChange={(e) => updateArrowConfig({ startHead: e.target.value as ArrowHeadStyle })}
          >
            {arrowHeadOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Flex>

        {/* End Head */}
        <Flex align="center" gap={1}>
          <Text fontSize="12px" color={labelColor} minW="35px">End</Text>
          <ArrowHeadPreview style={config.endHead} direction="end" />
          <Select
            size="xs"
            flex={1}
            value={config.endHead}
            onChange={(e) => updateArrowConfig({ endHead: e.target.value as ArrowHeadStyle })}
          >
            {arrowHeadOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Flex>

        {/* Head Size slider */}
        <SliderControl
          label="Head Size"
          value={config.headSize}
          min={6}
          max={30}
          step={1}
          onChange={(val) => updateArrowConfig({ headSize: val })}
          labelWidth="60px"
          valueWidth="35px"
          marginBottom="0"
        />

        {/* Line Style - Label and JoinedButtonGroup in same row */}
        <HStack spacing={2} align="center">
          <Text fontSize="12px" color={labelColor} flexShrink={0}>Line Style</Text>
          <JoinedButtonGroup
            options={lineStyleOptions}
            value={config.lineStyle}
            onChange={(value) => updateArrowConfig({ lineStyle: value })}
            size="sm"
          />
        </HStack>

        {/* Curvature slider - only shown if curved */}
        {config.lineStyle === 'curved' && (
          <SliderControl
            label="Curvature"
            value={config.curvature}
            min={0}
            max={100}
            step={5}
            onChange={(val) => updateArrowConfig({ curvature: val })}
            formatter={(v) => `${v}%`}
            labelWidth="60px"
            valueWidth="40px"
            marginBottom="0"
          />
        )}

        {/* Avoid Obstacles toggle */}
        <PanelToggle
          isChecked={config.avoidObstacles}
          onChange={(e) => updateArrowConfig({ avoidObstacles: e.target.checked })}
        >
          Avoid Obstacles
        </PanelToggle>

        {/* Routing options - only shown if avoidObstacles is enabled */}
        {config.avoidObstacles && (
          <>
            {/* Routing Mode */}
            <HStack spacing={2} align="center">
              <Text fontSize="12px" color={labelColor} flexShrink={0}>Routing</Text>
              <JoinedButtonGroup
                options={routingModeOptions}
                value={config.routingMode}
                onChange={(value) => updateArrowConfig({ routingMode: value })}
                size="sm"
              />
            </HStack>

            {/* Routing Margin slider */}
            <SliderControl
              label="Margin"
              value={config.routingMargin}
              min={5}
              max={50}
              step={5}
              onChange={(val) => updateArrowConfig({ routingMargin: val })}
              formatter={(v) => `${v}px`}
              labelWidth="60px"
              valueWidth="40px"
              marginBottom="0"
            />
          </>
        )}

        {/* Show Label toggle */}
        <PanelToggle
          isChecked={config.showLabel}
          onChange={(e) => updateArrowConfig({ showLabel: e.target.checked })}
        >
          Show Label
        </PanelToggle>

        {/* Label Font Size - only shown if showLabel is true */}
        {config.showLabel && (
          <SliderControl
            label="Label Size"
            value={config.labelFontSize}
            min={8}
            max={24}
            step={1}
            onChange={(val) => updateArrowConfig({ labelFontSize: val })}
            formatter={(v) => `${v}px`}
            labelWidth="60px"
            valueWidth="40px"
            marginBottom="0"
          />
        )}
      </VStack>
    </Panel>
  );
};
