import React from 'react';
import type { CanvasDecorator, CanvasDecoratorContext } from '../../../types/interaction';
import { Rulers } from '../Rulers';
import { RULER_SIZE } from '../constants';
import { useCanvasStore } from '../../../store/canvasStore';

/**
 * Component wrapper for the Rulers to properly use hooks
 */
const RulersDecoratorComponent: React.FC<{ context: CanvasDecoratorContext }> = ({ context }) => {
  const guidelines = useCanvasStore((state) => state.guidelines);
  
  // Don't render if not visible
  if (!guidelines?.enabled || !guidelines?.manualGuidesEnabled) {
    return null;
  }

  return (
    <Rulers
      width={context.canvasSize.width}
      height={context.canvasSize.height}
      viewport={context.viewport}
    />
  );
};

/**
 * Canvas decorator that renders rulers around the canvas.
 * This is registered by the guidelines plugin to display rulers
 * when guidelines and manual guides are enabled.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function createRulersDecorator(): CanvasDecorator {
  return {
    id: 'guidelines-rulers',
    placement: 'before-canvas',
    isVisible: (store) => {
      const guidelines = store.guidelines as { enabled?: boolean; manualGuidesEnabled?: boolean } | undefined;
      return guidelines?.enabled && guidelines?.manualGuidesEnabled || false;
    },
    getOffset: () => ({
      top: RULER_SIZE,
      left: RULER_SIZE,
      width: RULER_SIZE,
      height: RULER_SIZE,
    }),
    render: (context: CanvasDecoratorContext) => {
      return <RulersDecoratorComponent context={context} />;
    },
  };
}
