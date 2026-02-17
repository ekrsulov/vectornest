import React from 'react';
import {
  VStack,
  FormControl,
  HStack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { LinejoinSelector } from '../../ui/LinejoinSelector';

/**
 * Offset Path Panel
 * 
 * Allows users to create offset paths (expansion or contraction)
 * with configurable distance and join types
 */
const OffsetPathPanelComponent: React.FC = () => {
  // Subscribe to state
  const offsetDistance = useCanvasStore(state => {
    const s = state as typeof state & { offsetDistance?: number };
    return s.offsetDistance ?? 5;
  });
  const offsetJoinType = useCanvasStore(state => {
    const s = state as typeof state & { offsetJoinType?: 'round' | 'miter' | 'bevel' };
    return s.offsetJoinType ?? 'round';
  });
  const offsetMiterLimit = useCanvasStore(state => {
    const s = state as typeof state & { offsetMiterLimit?: number };
    return s.offsetMiterLimit ?? 4;
  });
  const isApplyingOffset = useCanvasStore(state => {
    const s = state as typeof state & { isApplyingOffset?: boolean };
    return s.isApplyingOffset ?? false;
  });
  
  // Force re-render when selection changes
  useCanvasStore(state => state.selectedIds);
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  
  // Get actions
  const state = useCanvasStore.getState() as typeof useCanvasStore extends { getState: () => infer S } ? S : never;
  const stateWithActions = state as typeof state & {
    canApplyOffset?: () => boolean;
    applyOffsetPath?: () => void;
    setOffsetDistance?: (distance: number) => void;
    setOffsetJoinType?: (joinType: 'round' | 'miter' | 'bevel') => void;
    setOffsetMiterLimit?: (limit: number) => void;
  };
  const {
    canApplyOffset,
    applyOffsetPath,
    setOffsetDistance,
    setOffsetJoinType,
    setOffsetMiterLimit,
  } = stateWithActions;

  const canApply = canApplyOffset?.() ?? false;

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyOffsetPath?.();
  };



  // Using SliderControl for Miter Limit change handler inline, no extra function needed

  if (!canApply) return null;

  return (
    <Panel
      title="Offset Path"
      isCollapsible
      defaultOpen={false}
      headerActions={
        <HStack spacing={1}>
          <PanelStyledButton onClick={handleApply} isDisabled={!canApply || isApplyingOffset} isLoading={isApplyingOffset} size="xs">Apply</PanelStyledButton>
        </HStack>
      }
    >
        <VStack align="stretch" spacing={1} mt={1}>
            <FormControl pr={0.5}>
              <SliderControl
                inline
                label="Distance"
                value={offsetDistance}
                min={-100}
                max={100}
                step={1}
                onChange={(value) => setOffsetDistance?.(value)}
                labelWidth="72px"
                valueWidth="56px"
              />
            </FormControl>

            <FormControl>
              <HStack justify="flex-start" minH="24px" spacing={1} width="100%">
                <Text fontSize="12px" minW="72px" h="24px" display="flex" alignItems="center" title="Corner Join" color={labelColor}>
                  Corner Join
                </Text>
                <LinejoinSelector value={offsetJoinType} onChange={(v) => setOffsetJoinType?.(v)} title="Corner Join" />
              </HStack>
            </FormControl>

            {offsetJoinType === 'miter' && (
              <FormControl>
                <SliderControl
                  inline
                  label="Miter Limit"
                  value={offsetMiterLimit}
                  min={1}
                  max={10}
                  step={0.5}
                  onChange={(value) => setOffsetMiterLimit?.(value)}
                  labelWidth="72px"
                  valueWidth="56px"
                />
              </FormControl>
            )}
          </VStack>
      </Panel>
    );
  };

export const OffsetPathPanel = React.memo(OffsetPathPanelComponent);
