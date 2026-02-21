import React from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import type { MeasurePluginSlice } from './slice';
import { formatDistance, formatAngle } from '../../utils/measurementUtils';

interface MeasureInfoPanelProps {
  hideTitle?: boolean;
}


export const MeasureInfoPanel: React.FC<MeasureInfoPanelProps> = ({ hideTitle = false }) => {
  const measure = useCanvasStore((state) => (state as unknown as MeasurePluginSlice).measure);
  const precision = useCanvasStore((state) => state.settings.keyboardMovementPrecision);

  const { measurement, units } = measure || {};
  const { distance, deltaX, deltaY, angle, isActive } = measurement || {};
  const startPoint = measurement?.startPoint;
  const endPoint = measurement?.endPoint;

  if (!isActive && !(startPoint && endPoint)) {
    return (
      <Panel title="Measure" hideHeader={hideTitle}>
        <VStack spacing={1} align="stretch">
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.500' }} textAlign="left">
            Click and drag to measure
          </Text>
        </VStack>
      </Panel>
    );
  }

  return (
    <Panel title="Measure" hideHeader={hideTitle}>
      <VStack spacing={0} align="stretch">

        {/* Info about coordinates */}
        {startPoint && endPoint && (
          <>
            <HStack justify="space-between">
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
                From:
              </Text>
              <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                ({formatDistance(startPoint.x, units || 'px', precision)}, {formatDistance(startPoint.y, units || 'px', precision)})
              </Text>
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
                To:
              </Text>
              <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                ({formatDistance(endPoint.x, units || 'px', precision)}, {formatDistance(endPoint.y, units || 'px', precision)})
              </Text>
            </HStack>
          </>
        )}

        {/* Distance */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Distance:
          </Text>
          <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(distance || 0, units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta X */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔX:
          </Text>
          <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaX || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta Y */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔY:
          </Text>
          <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaY || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Angle */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Angle:
          </Text>
          <Text fontSize="xs" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatAngle(angle || 0, precision)}
          </Text>
        </HStack>

      </VStack>
    </Panel>
  );
};
