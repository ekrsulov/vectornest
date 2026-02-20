import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { LayerDepthPluginSlice } from './slice';
import { analyzeLayerDepth } from './depthUtils';

type DepthStore = CanvasStore & LayerDepthPluginSlice;

export const LayerDepthOverlay: React.FC = () => {
  const {
    enabled, showZIndexLabels, highlightObscured,
    elements, zoom,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as DepthStore;
      return {
        enabled: st.layerDepth?.enabled ?? false,
        showZIndexLabels: st.layerDepth?.showZIndexLabels ?? true,
        highlightObscured: st.layerDepth?.highlightObscured ?? true,
        elements: s.elements,
        zoom: s.viewport.zoom,
      };
    })
  );

  const layers = useMemo(() => {
    if (!enabled) return [];
    return analyzeLayerDepth(elements);
  }, [enabled, elements]);

  // Build a map from element id to bounding box for label placement
  const elementBounds = useMemo(() => {
    if (!enabled) return new Map<string, { cx: number; cy: number; minX: number; minY: number; width: number; height: number }>();
    const map = new Map<string, { cx: number; cy: number; minX: number; minY: number; width: number; height: number }>();
    for (const el of elements) {
      if (el.type !== 'path') continue;
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      let has = false;
      for (const sp of el.data.subPaths) {
        for (const cmd of sp) {
          if (cmd.type === 'Z') continue;
          has = true;
          const p = cmd.position;
          if (p.x < mnX) mnX = p.x;
          if (p.y < mnY) mnY = p.y;
          if (p.x > mxX) mxX = p.x;
          if (p.y > mxY) mxY = p.y;
        }
      }
      if (has) {
        map.set(el.id, {
          cx: (mnX + mxX) / 2,
          cy: (mnY + mxY) / 2,
          minX: mnX,
          minY: mnY,
          width: mxX - mnX,
          height: mxY - mnY,
        });
      }
    }
    return map;
  }, [enabled, elements]);

  if (!enabled || layers.length === 0) return null;

  const invZoom = 1 / zoom;
  const fontSize = 11 * invZoom;
  const badgePad = 3 * invZoom;
  const badgeRadius = 10 * invZoom;

  return (
    <g className="layer-depth-overlay">
      {layers.map((layer) => {
        const bounds = elementBounds.get(layer.id);
        if (!bounds) return null;

        const isObscured = layer.isFullyObscured;
        const isPartial = layer.obscuredPercent > 0 && !isObscured;

        return (
          <g key={layer.id}>
            {/* Highlight obscured elements */}
            {highlightObscured && isObscured && (
              <rect
                x={bounds.minX}
                y={bounds.minY}
                width={bounds.width}
                height={bounds.height}
                fill="#E53E3E"
                fillOpacity={0.15}
                stroke="#E53E3E"
                strokeWidth={1.5 * invZoom}
                strokeOpacity={0.5}
                strokeDasharray={`${4 * invZoom} ${2 * invZoom}`}
              />
            )}

            {highlightObscured && isPartial && (
              <rect
                x={bounds.minX}
                y={bounds.minY}
                width={bounds.width}
                height={bounds.height}
                fill="#D69E2E"
                fillOpacity={0.08}
                stroke="#D69E2E"
                strokeWidth={1 * invZoom}
                strokeOpacity={0.4}
                strokeDasharray={`${3 * invZoom} ${3 * invZoom}`}
              />
            )}

            {/* Z-index badge */}
            {showZIndexLabels && (
              <>
                <circle
                  cx={bounds.minX}
                  cy={bounds.minY}
                  r={badgeRadius}
                  fill={isObscured ? '#E53E3E' : isPartial ? '#D69E2E' : '#3182CE'}
                  fillOpacity={0.85}
                />
                <text
                  x={bounds.minX}
                  y={bounds.minY + badgePad}
                  textAnchor="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {layer.zIndex}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};
