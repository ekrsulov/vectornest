import React, { useMemo } from 'react';
import { Badge } from '@chakra-ui/react';
import type { SvgStructureContributionProps } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import type { GroupEditorSlice } from '../../store/slices/features/groupEditorSlice';

export const GroupEditorStructureContribution: React.FC<SvgStructureContributionProps<CanvasStore>> = ({ node }) => {
  const enterGroupEditor = useCanvasStore((state) => (state as CanvasStore & GroupEditorSlice).enterGroupEditor);
  const exitGroupEditor = useCanvasStore((state) => (state as CanvasStore & GroupEditorSlice).exitGroupEditor);
  const groupEditor = useCanvasStore((state) => (state as CanvasStore & GroupEditorSlice).groupEditor);

  const elementId = useMemo(
    () => node.elementId ?? node.dataElementId ?? node.idAttribute ?? null,
    [node.elementId, node.dataElementId, node.idAttribute]
  );
  if (!elementId) return null;

  const isActive = groupEditor?.activeGroupId === elementId;

  return (
    <PanelStyledButton size="xs" onClick={() => (isActive ? exitGroupEditor?.() : enterGroupEditor?.(elementId))}>
      {isActive ? 'Exit Group' : 'Enter Group'}
    </PanelStyledButton>
  );
};

export const GroupEditorStructureBadges: React.FC<SvgStructureContributionProps<CanvasStore>> = ({ node }) => {
  const groupEditor = useCanvasStore((state) => (state as CanvasStore & GroupEditorSlice).groupEditor);
  const elementId = useMemo(
    () => node.elementId ?? node.dataElementId ?? node.idAttribute ?? null,
    [node.elementId, node.dataElementId, node.idAttribute]
  );

  if (!elementId) return null;
  const isActive = groupEditor?.activeGroupId === elementId;
  if (!isActive) return null;

  return <Badge colorScheme="blue" fontSize="9px">active</Badge>;
};

// Buttons are now handled in the main contribution component
export const GroupEditorStructureButtons: React.FC<SvgStructureContributionProps<CanvasStore>> = () => null;
