import React, { useMemo } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { generateGuides, arcToSvgPath } from './guidesUtils';
import type { CompositionGuidesPluginSlice } from './slice';

type GuidesStore = CanvasStore & CompositionGuidesPluginSlice;

export const CompositionGuidesOverlay: React.FC = () => {
  const { enabled, activeGuides, opacity, color, canvasWidth, canvasHeight, zoom } =
    useCanvasStore(
      useShallow((s) => {
        const st = s as GuidesStore;
        return {
          enabled: st.compositionGuides?.enabled ?? false,
          activeGuides: st.compositionGuides?.activeGuides ?? [],
          opacity: st.compositionGuides?.opacity ?? 0.5,
          color: st.compositionGuides?.color ?? '#805AD5',
          canvasWidth: st.compositionGuides?.canvasWidth ?? 500,
          canvasHeight: st.compositionGuides?.canvasHeight ?? 500,
          zoom: s.viewport.zoom,
        };
      })
    );

  const guideData = useMemo(() => {
    if (!enabled || activeGuides.length === 0) return null;
    return generateGuides(activeGuides, canvasWidth, canvasHeight);
  }, [enabled, activeGuides, canvasWidth, canvasHeight]);

  if (!enabled || !guideData) return null;

  const invZoom = 1 / zoom;

  return (
    <g className="composition-guides-overlay" opacity={opacity}>
      {guideData.lines.map((line, i) => (
        <line
          key={`line-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={color}
          strokeWidth={1 * invZoom}
          strokeDasharray={`${4 * invZoom} ${4 * invZoom}`}
          pointerEvents="none"
        />
      ))}

      {guideData.arcs.map((arc, i) => (
        <path
          key={`arc-${i}`}
          d={arcToSvgPath(arc)}
          fill="none"
          stroke={color}
          strokeWidth={1.5 * invZoom}
          pointerEvents="none"
        />
      ))}
    </g>
  );
};
