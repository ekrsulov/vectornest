import React from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import type { CanvasElement, ElementType, PresentationAttributes, Viewport } from '../../types';
import type { RendererOverrides } from '../../types/plugins';

export interface CanvasElementEventHandlers {
  onPointerDown?: (
    elementId: string,
    event: ReactPointerEvent<Element>
  ) => void;
  onPointerUp?: (elementId: string, event: ReactPointerEvent<Element>) => void;
  onDoubleClick?: (elementId: string, event: ReactMouseEvent<Element>) => void;
  onTouchEnd?: (elementId: string, event: React.TouchEvent<Element>) => void;
}

export interface CanvasRenderContext {
  viewport: Viewport;
  activePlugin: string | null;
  scaleStrokeWithZoom: boolean;
  colorMode: 'light' | 'dark';
  rendererOverrides?: RendererOverrides;
  isElementHidden?: (elementId: string) => boolean;
  isElementLocked?: (elementId: string) => boolean;
  isElementSelected?: (elementId: string) => boolean;
  isSelecting?: boolean;
  animations?: unknown[];
  animationState?: unknown;
  extensionsContext?: Record<string, unknown>;

  // Generic renderer control flags
  isPathInteractionDisabled?: boolean;
  pathCursorMode?: 'select' | 'default' | 'pointer';

  elementMap: Map<string, CanvasElement>;
  eventHandlers: CanvasElementEventHandlers;
}

export type CanvasElementRenderer<T extends CanvasElement = CanvasElement> = (
  element: T,
  context: CanvasRenderContext
) => ReactNode;

const DISPLAY_NONE_STYLE: React.CSSProperties = { display: 'none' };

export class CanvasRendererRegistry {
  private renderers = new Map<ElementType, CanvasElementRenderer>();

  registerRenderer<T extends CanvasElement>(
    type: T['type'],
    renderer: CanvasElementRenderer<T>
  ): void {
    this.renderers.set(type, renderer as CanvasElementRenderer);
  }

  unregisterRenderer(type: ElementType): void {
    this.renderers.delete(type);
  }

  getRenderer(type: ElementType): CanvasElementRenderer | undefined {
    return this.renderers.get(type);
  }

  render(element: CanvasElement, context: CanvasRenderContext): React.ReactNode {
    if (context.isElementHidden?.(element.id)) {
      return null;
    }

    const renderer = this.renderers.get(element.type);
    if (!renderer) {
      return null;
    }

    const node = renderer(element as never, context);
    const isDefinition = Boolean((element.data as PresentationAttributes | undefined)?.isDefinition);
    if (!node || !isDefinition) {
      return node;
    }

    return (
      <g
        key={`${element.id}-definition-wrapper`}
        style={DISPLAY_NONE_STYLE}
        aria-hidden="true"
        data-definition-element="true"
      >
        {node}
      </g>
    );
  }
}

export const canvasRendererRegistry = new CanvasRendererRegistry();
