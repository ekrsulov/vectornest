import React from 'react';
import type { CanvasLayerContext } from '../../types/plugins';
import { pluginManager } from '../../utils/pluginManager';
import type { CanvasLayerPlacement } from '../../types/ui-contributions';

interface CanvasLayersProps {
  context: CanvasLayerContext;
  placements?: CanvasLayerPlacement[];
}

export const CanvasLayers: React.FC<CanvasLayersProps> = ({ context, placements }) => {
  const layers = pluginManager.getCanvasLayers();
  const filteredLayers = placements?.length
    ? layers.filter((layer) => placements.includes(layer.placement ?? 'midground'))
    : layers;

  return (
    <>
      {filteredLayers.map((layer) => {
        const content = layer.render(context);
        if (!content) {
          return null;
        }

        return (
          <React.Fragment key={`${layer.pluginId}:${layer.id}`}>
            {content}
          </React.Fragment>
        );
      })}
    </>
  );
};
CanvasLayers.displayName = 'CanvasLayers';
