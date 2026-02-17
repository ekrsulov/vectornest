import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { LassoOverlay } from './LassoOverlay';

export const LassoOverlayWrapper: React.FC = () => {
  const selectionPath = useCanvasStore(s => s.selectionPath);
  const lassoClosed = useCanvasStore(s => (s as unknown as { lassoClosed?: boolean }).lassoClosed ?? true);
  const viewport = useCanvasStore(s => s.viewport);
  const activeStrategy = useCanvasStore(s => (s as unknown as { activeSelectionStrategy?: string }).activeSelectionStrategy);
  
  // Only show lasso overlay when lasso strategy is active
  if (activeStrategy !== 'lasso') {
    return null;
  }
  
  return <LassoOverlay lassoPath={selectionPath} lassoClosed={lassoClosed} viewport={viewport} />;
};
