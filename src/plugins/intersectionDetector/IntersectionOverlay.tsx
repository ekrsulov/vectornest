import React from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { IntersectionDetectorPluginSlice } from './slice';

type IStore = CanvasStore & IntersectionDetectorPluginSlice;

export const IntersectionOverlay: React.FC = () => {
  const { state, zoom } = useCanvasStore(
    useShallow((s) => {
      const st = s as IStore;
      return {
        state: st.intersectionDetector,
        zoom: s.viewport.zoom,
      };
    })
  );

  if (!state?.showOverlay || state.intersections.length === 0) return null;

  const r = 4 / zoom;
  const sw = 1.5 / zoom;

  return (
    <g className="intersection-overlay">
      {state.intersections.map((pt, i) => (
        <g key={i}>
          <circle
            cx={pt.x}
            cy={pt.y}
            r={r}
            fill="red"
            fillOpacity={0.8}
            stroke="white"
            strokeWidth={sw}
          />
          <line
            x1={pt.x - r}
            y1={pt.y - r}
            x2={pt.x + r}
            y2={pt.y + r}
            stroke="red"
            strokeWidth={sw}
            opacity={0.6}
          />
          <line
            x1={pt.x + r}
            y1={pt.y - r}
            x2={pt.x - r}
            y2={pt.y + r}
            stroke="red"
            strokeWidth={sw}
            opacity={0.6}
          />
        </g>
      ))}
    </g>
  );
};
