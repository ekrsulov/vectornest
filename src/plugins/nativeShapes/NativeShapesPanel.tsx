import React, { useMemo, useCallback } from 'react';
import { VStack, HStack, Box } from '@chakra-ui/react';
import { RectangleHorizontal, Square, Circle, Egg, Minus, Triangle, Star } from 'lucide-react';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { Panel } from '../../ui/Panel';
import { useCanvasStore } from '../../store/canvasStore';
import type { NativeShapesPluginSlice } from './slice';
import type { NativeShapeElement } from './types';
import { NumberInput } from '../../ui/NumberInput';
import { convertNativeShapeKind } from './index';
import { SliderControl } from '../../ui/SliderControl';
import { ToggleButton } from '../../ui/ToggleButton';
import { duplicateElements } from '../../utils/duplicationUtils';

interface NativeShapesPanelProps {
  hideTitle?: boolean;
}

export const NativeShapesPanel: React.FC<NativeShapesPanelProps> = ({ hideTitle = false }) => {
  const nativeShape = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShape);
  const setNativeShapeSettings = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).setNativeShapeSettings);
  const setActivePlugin = useCanvasStore((state) => state.setActivePlugin);
  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const updateElement = useCanvasStore((state) => state.updateElement);

  const selectedShape = useMemo(() => {
    const first = elements.find((el) => selectedIds.includes(el.id) && el.type === 'nativeShape');
    return first ?? null;
  }, [elements, selectedIds]);

  const handleDuplicate = useCallback(() => {
    if (selectedShape) {
      const elementMap = new Map(elements.map(el => [el.id, el]));
      const addElement = useCanvasStore.getState().addElement;
      const updateElement = useCanvasStore.getState().updateElement;
      duplicateElements([selectedShape.id], elementMap, addElement, updateElement);
    }
  }, [selectedShape, elements]);

  // When switching to an existing selected polyline/polygon, ensure pointsCount is in range
  // (this keeps UI consistent if a polyline with fewer points was imported)
  React.useEffect(() => {
    if (selectedShape && selectedShape.type === 'nativeShape') {
      const elData = selectedShape.data as NativeShapeElement['data'];
      if (elData.kind === 'polyline') {
        const current = elData.pointsCount ?? 5;
        if (current < 5) {
          updateElement?.(selectedShape.id, { data: { ...selectedShape.data, pointsCount: 5 } });
        }
      } else if (elData.kind === 'polygon') {
        const current = elData.pointsCount ?? 3;
        if (current < 3) {
          updateElement?.(selectedShape.id, { data: { ...selectedShape.data, pointsCount: 3 } });
        }
      }
    }
  }, [selectedShape, updateElement]);

  if (!nativeShape || !setNativeShapeSettings) return null;

  const current = selectedShape ? (selectedShape.data as NativeShapesPluginSlice['nativeShape']) : nativeShape;

  const applyChange = (field: keyof NativeShapesPluginSlice['nativeShape'], value: unknown) => {
    if (selectedShape && selectedShape.type === 'nativeShape') {
      // If changing kind on an existing element, handle special conversion
      const elData = selectedShape.data as NativeShapeElement['data'];
      if (field === 'kind') {
        const newKind = value as NativeShapeElement['data']['kind'];
        const converted = convertNativeShapeKind(elData, newKind);
        updateElement?.(selectedShape.id, { data: { ...selectedShape.data, ...converted } });
        return;
      }

      // If changing pointsCount on an existing polygon/polyline, regenerate points accordingly
      if (field === 'pointsCount' && (elData.kind === 'polygon' || elData.kind === 'polyline')) {
        const cnt = Number(value) || (elData.kind === 'polyline' ? 5 : 3);
        const converted = convertNativeShapeKind(elData, elData.kind, cnt);
        updateElement?.(selectedShape.id, { data: { ...selectedShape.data, ...converted } });
        return;
      }

      updateElement?.(selectedShape.id, { data: { ...selectedShape.data, [field]: value } });
    } else {
      setNativeShapeSettings({ [field]: value } as Partial<NativeShapesPluginSlice['nativeShape']>);
    }
  };

  return (
    <Panel title="Native Shapes" hideHeader={hideTitle}>
      <VStack spacing={2} align="stretch">
        <HStack spacing={1} justify="space-between">
          {[
            { kind: 'rect', icon: RectangleHorizontal, label: 'Rect' },
            { kind: 'square', icon: Square, label: 'Square' },
            { kind: 'circle', icon: Circle, label: 'Circle' },
            { kind: 'ellipse', icon: Egg, label: 'Ellipse' },
            { kind: 'line', icon: Minus, label: 'Line' },
            { kind: 'polygon', icon: Triangle, label: 'Polygon' },
            { kind: 'polyline', icon: Star, label: 'Polyline' },
          ].map(({ kind, icon: Icon, label }) => (
            <ToggleButton
              key={kind}
              isActive={current.kind === kind}
              onClick={() => {
                  applyChange('kind', kind);
                setActivePlugin?.('nativeShapes');
                }}
              icon={<Icon size={14} />}
              aria-label={label}
              title={label}
              size="lg"
            />
          ))}
        </HStack>
        {(current.kind === 'circle' || current.kind === 'square') ? (
          <HStack spacing={2}>
            <NumberInput
              label={current.kind === 'circle' ? 'R' : 'S'}
              value={current.kind === 'circle' ? Math.min(current.width, current.height) / 2 : Math.min(current.width, current.height)}
              onChange={(v: number) => {
                const size = current.kind === 'circle' ? v * 2 : v;
                applyChange('width', size);
                applyChange('height', size);
              }}
              min={1}
              step={1}
              labelWidth="24px"
              inputWidth="70px"
            />
          </HStack>
        ) : (
          <HStack spacing={2}>
            <NumberInput
              label="W"
              value={current.width}
              onChange={(v: number) => applyChange('width', v)}
              min={1}
              step={1}
              labelWidth="24px"
              inputWidth="70px"
            />
            <NumberInput
              label="H"
              value={current.height}
              onChange={(v: number) => applyChange('height', v)}
              min={1}
              step={1}
              labelWidth="24px"
              inputWidth="70px"
            />
          </HStack>
        )}
        {(current.kind === 'rect' || current.kind === 'square') && (
          <Box pr={0.5}>
            <SliderControl
              key={selectedShape?.id ?? 'default'}
              label="Corner Radius"
              value={current.rx ?? current.ry ?? 0}
              onChange={(v: number) => {
                const roundedValue = Math.round(v * 10) / 10; // Round to 1 decimal place
                if (selectedShape && selectedShape.type === 'nativeShape') {
                  updateElement?.(selectedShape.id, { data: { ...selectedShape.data, rx: roundedValue, ry: roundedValue } });
                } else {
                  setNativeShapeSettings({ rx: roundedValue, ry: roundedValue });
                }
              }}
              min={0}
              max={Math.max(0, Math.min(current.width || 0, current.height || 0) / 2)}
              step={0.1}
            />
          </Box>
        )}
        {(current.kind === 'polygon' || current.kind === 'polyline') && (
          <SliderControl
            label="Points"
            value={current.pointsCount ?? (current.kind === 'polyline' ? 5 : 3)}
            min={current.kind === 'polyline' ? 5 : 3}
            max={8}
            step={1}
            onChange={(v: number) => {
              const cnt = Math.round(v);
              const clamped = current.kind === 'polyline' ? Math.max(5, Math.min(8, cnt)) : Math.max(3, Math.min(8, cnt));
              applyChange('pointsCount', clamped);
            }}
            formatter={(v) => `${v}`}
            minWidth="120px"
            labelWidth="48px"
            valueWidth="36px"
          />
        )}
        {selectedShape && (
          <PanelStyledButton
            onClick={handleDuplicate}
            w="full"
          >
            Duplicate
          </PanelStyledButton>
        )}
      </VStack>
    </Panel>
  );
};
