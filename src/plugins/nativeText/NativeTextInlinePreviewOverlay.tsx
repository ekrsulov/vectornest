import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { InlineTextEditSlice } from './inlineEditSlice';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { computeAdjustedBounds } from '../../utils/overlayHelpers';
import {
  deriveElementSelectionColors,
  deriveSelectionFeedbackPalette,
} from '../../utils/canvasColorUtils';
import type { NativeTextElement } from './types';

export const NativeTextInlinePreviewOverlay: React.FC = React.memo(function NativeTextInlinePreviewOverlay() {
  const editingElementId = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).inlineTextEdit?.editingElementId ?? null
  );
  const previewBounds = useCanvasStore(
    (state) => (state as unknown as InlineTextEditSlice).inlineTextEdit?.previewBounds ?? null
  );
  const elements = useCanvasStore((state) => state.elements);
  const viewport = useCanvasStore((state) => state.viewport);

  const element = useMemo(() => {
    if (!editingElementId) return null;
    const candidate = elements.find((entry) => entry.id === editingElementId);
    return candidate?.type === 'nativeText' ? candidate as NativeTextElement : null;
  }, [editingElementId, elements]);

  const fallbackBounds = useMemo(() => {
    if (!element) return null;
    const elementMap = new Map(elements.map((entry) => [entry.id, entry]));
    return elementContributionRegistry.getBounds(element, {
      viewport,
      elementMap,
    });
  }, [element, elements, viewport]);

  const bounds = previewBounds ?? fallbackBounds;
  if (!element || !bounds) {
    return null;
  }

  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom);
  const { selectionColor } = deriveElementSelectionColors(element);
  const glowPalette = deriveSelectionFeedbackPalette(selectionColor);
  const baseStrokeWidth = 1 / viewport.zoom;
  const glowStrokeWidthOuter = 10 / viewport.zoom;
  const glowStrokeWidthInner = 5 / viewport.zoom;

  return (
    <g pointerEvents="none">
      <rect
        x={adjustedBounds.minX}
        y={adjustedBounds.minY}
        width={adjustedBounds.maxX - adjustedBounds.minX}
        height={adjustedBounds.maxY - adjustedBounds.minY}
        fill="none"
        stroke={glowPalette.tertiary}
        strokeWidth={glowStrokeWidthOuter}
        strokeOpacity={0.16}
      />
      <rect
        x={adjustedBounds.minX}
        y={adjustedBounds.minY}
        width={adjustedBounds.maxX - adjustedBounds.minX}
        height={adjustedBounds.maxY - adjustedBounds.minY}
        fill="none"
        stroke={glowPalette.secondary}
        strokeWidth={glowStrokeWidthInner}
        strokeOpacity={0.28}
      />
      <rect
        x={adjustedBounds.minX}
        y={adjustedBounds.minY}
        width={adjustedBounds.maxX - adjustedBounds.minX}
        height={adjustedBounds.maxY - adjustedBounds.minY}
        fill="none"
        stroke={selectionColor}
        strokeWidth={baseStrokeWidth}
      />
    </g>
  );
});

NativeTextInlinePreviewOverlay.displayName = 'NativeTextInlinePreviewOverlay';
