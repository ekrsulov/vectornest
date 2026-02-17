import type { RefObject } from 'react';
import { ZOOM_SERVICE_ID } from '../listeners/ZoomListener';
import { useCanvasServiceActivation } from './useCanvasServiceActivation';

export const useCanvasZoom = (svgRef: RefObject<SVGSVGElement | null>): void => {
  useCanvasServiceActivation({
    serviceId: ZOOM_SERVICE_ID,
    svgRef,
  });
};
