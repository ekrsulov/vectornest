import {
  canvasRendererRegistry,
} from './CanvasRendererRegistry';
import { PathElementRenderer } from './PathElementRenderer';
import { GroupElementRenderer } from './GroupElementRenderer';

canvasRendererRegistry.registerRenderer('path', PathElementRenderer);
canvasRendererRegistry.registerRenderer('group', GroupElementRenderer);

export { canvasRendererRegistry };
export type {
  CanvasElementRenderer,
  CanvasRenderContext,
} from './CanvasRendererRegistry';
