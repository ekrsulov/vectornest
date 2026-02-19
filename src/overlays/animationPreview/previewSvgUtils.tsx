import ReactDOMServer from 'react-dom/server';
import { canvasStoreApi, type CanvasStore } from '../../store/canvasStore';
import {
  canvasRendererRegistry,
  type CanvasRenderContext,
} from '../../canvas/renderers/CanvasRendererRegistry';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { createPlayingAnimationState } from '../../utils/animationStatePreparation';
import type { CanvasElement } from '../../types';
import type { SVGAnimation, AnimationState } from '../../types/animations';
import type React from 'react';

const TRANSPARENT_BG_STYLE: React.CSSProperties = { background: 'transparent' };

export const computeTotalDuration = (animation: SVGAnimation): number => {
  const durSec = parseFloat(String(animation.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = animation.repeatDur
    ? parseFloat(String(animation.repeatDur).replace('s', ''))
    : null;
  const repeat =
    animation.repeatCount === 'indefinite'
      ? 1
      : typeof animation.repeatCount === 'number'
        ? animation.repeatCount
        : 1;
  if (repeatDur && repeatDur > 0) {
    return repeatDur;
  }
  return durSec * repeat;
};

interface BuildPreviewSvgHtmlArgs {
  elements: CanvasElement[];
  animations: SVGAnimation[];
  elementMap: Map<string, CanvasElement>;
  viewBox: string;
  restartKey: number;
}

export const buildPreviewSvgHtml = ({
  elements,
  animations,
  elementMap,
  viewBox,
  restartKey,
}: BuildPreviewSvgHtmlArgs): string => {
  if (!elements.length) {
    return '';
  }

  // Force preview rendering to start all SMIL animations at begin="0s".
  const previewChainDelays = new Map<string, number>();
  const playingAnimationState: AnimationState = createPlayingAnimationState({
    restartKey,
    isWorkspaceOpen: false,
    isCanvasPreviewMode: true,
    chainDelays: previewChainDelays,
  });

  const renderContext: CanvasRenderContext = {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    activePlugin: 'select',
    scaleStrokeWithZoom: true,
    colorMode: 'light',
    rendererOverrides: undefined,
    isElementHidden: () => false,
    isElementLocked: () => false,
    isElementSelected: () => false,
    isSelecting: false,
    elementMap,
    animations,
    animationState: playingAnimationState,
    eventHandlers: {},
  };

  const defsContext = {
    ...canvasStoreApi.getState(),
    animations,
    animationState: playingAnimationState,
    calculateChainDelays: () => previewChainDelays,
  };
  const defsContent = defsContributionRegistry.renderDefs(
    defsContext as CanvasStore,
    elements
  );

  const elementsContent = elements
    .filter((element) => !element.parentId)
    .map((element) => canvasRendererRegistry.render(element, renderContext));

  const svgMarkup = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={TRANSPARENT_BG_STYLE}
    >
      <defs>{defsContent}</defs>
      {elementsContent}
    </svg>
  );

  return ReactDOMServer.renderToStaticMarkup(svgMarkup);
};

const namespacePreviewDefs = (
  svgElement: SVGSVGElement,
  restartKey: number
): void => {
  const idMap = new Map<string, string>();
  const timestamp = Date.now();

  const defTypes = [
    { selector: 'clipPath[id]', prefix: 'clip' },
    { selector: 'linearGradient[id], radialGradient[id]', prefix: 'grad' },
    { selector: 'pattern[id]', prefix: 'pat' },
    { selector: 'filter[id]', prefix: 'filt' },
    { selector: 'mask[id]', prefix: 'mask' },
    { selector: 'marker[id]', prefix: 'marker' },
  ];

  defTypes.forEach(({ selector, prefix }) => {
    const elements = svgElement.querySelectorAll<SVGElement>(selector);
    elements.forEach((element, index) => {
      const oldId = element.id;
      const uniqueId = `${oldId}-preview-${restartKey}-${timestamp}-${prefix}-${index}`;
      element.id = uniqueId;
      idMap.set(oldId, uniqueId);
    });
  });

  if (!idMap.size) {
    return;
  }

  const refAttrs = [
    'clip-path',
    'fill',
    'stroke',
    'filter',
    'mask',
    'marker-start',
    'marker-mid',
    'marker-end',
  ];

  refAttrs.forEach((attr) => {
    const selector = `[${attr}^="url(#"]`;
    const elementsWithRef = svgElement.querySelectorAll<SVGElement>(selector);
    elementsWithRef.forEach((element) => {
      const raw = element.getAttribute(attr);
      if (!raw) {
        return;
      }
      idMap.forEach((newId, oldId) => {
        if (!raw.includes(`#${oldId}`)) {
          return;
        }
        const updated = raw.replace(`#${oldId}`, `#${newId}`);
        element.setAttribute(attr, updated);
        if (attr === 'clip-path') {
          element.style.setProperty('clip-path', `url(#${newId})`);
          element.style.setProperty('-webkit-clip-path', `url(#${newId})`);
        }
      });
    });
  });
};

interface InsertPreviewSvgArgs {
  container: HTMLDivElement;
  svgHtml: string;
  restartKey: number;
  autoplay: boolean;
}

export const insertPreviewSvg = ({
  container,
  svgHtml,
  restartKey,
  autoplay,
}: InsertPreviewSvgArgs): SVGSVGElement | null => {
  container.innerHTML = svgHtml;

  const svgElement = container.querySelector('svg') as SVGSVGElement | null;
  if (!svgElement) {
    return null;
  }

  namespacePreviewDefs(svgElement, restartKey);

  // Trigger SMIL start explicitly for injected markup.
  const animateNodes = svgElement.querySelectorAll<SVGAnimationElement>(
    'animate, animateTransform, animateMotion, set'
  );
  animateNodes.forEach((node) => {
    try {
      node.beginElement?.();
    } catch {
      // ignore beginElement errors
    }
  });

  if (autoplay) {
    svgElement.setCurrentTime?.(0);
    svgElement.unpauseAnimations?.();
  }

  return svgElement;
};
