import {
  CanvasRendererRegistry,
  canvasRendererRegistry,
} from './CanvasRendererRegistry';
import { PathElementRenderer } from './PathElementRenderer';
import { GroupElementRenderer } from './GroupElementRenderer';

canvasRendererRegistry.registerRenderer('path', PathElementRenderer);
canvasRendererRegistry.registerRenderer('group', GroupElementRenderer);

export { CanvasRendererRegistry, canvasRendererRegistry };
export type {
  CanvasElementRenderer,
  CanvasElementEventHandlers,
  CanvasRenderContext,
} from './CanvasRendererRegistry';
export { PathElementRenderer } from './PathElementRenderer';
