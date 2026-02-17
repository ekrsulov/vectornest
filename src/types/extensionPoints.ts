import type React from 'react';
import type { CanvasStore } from '../store/canvasStore';
import type { CanvasElement, Point } from '.';
import type { CanvasRenderContext } from '../canvas/renderers';
import type { SnapOverlayConfig } from './plugins';

export interface DragPointInfo {
  elementId: string;
  subpathIndex?: number;
  pointIndex?: number;
  commandIndex?: number;
  isDragging?: boolean;
}

export interface PersistenceContribution {
  pluginId: string;
  temporalPartialize?: (state: CanvasStore) => Record<string, unknown>;
  persistPartialize?: (state: CanvasStore) => Record<string, unknown>;
  migrate?: (state: unknown, version: number) => unknown;
}

export interface RendererExtension {
  pluginId: string;
  priority?: number;
  appliesTo?: (element: CanvasElement, context: CanvasRenderContext) => boolean;
  getElementAttributes?: (element: CanvasElement, context: CanvasRenderContext) => Record<string, unknown>;
  getElementChildren?: (element: CanvasElement, context: CanvasRenderContext) => React.ReactNode | React.ReactNode[];
}

export interface DragContext {
  pluginId: string;
  type: string;
  isDragging: boolean;
  elementIds: string[];
  startPosition?: Point | null;
  currentPosition?: Point | null;
  metadata?: Record<string, unknown>;
  excludeElementIds?: string[];
  excludeSnapIds?: string[];
  dragPointInfo?: DragPointInfo | null;
}

export interface DragHandler {
  pluginId: string;
  priority?: number;
  type?: string;
  canHandle: (state: CanvasStore) => boolean;
  getContext: (state: CanvasStore) => DragContext | null;
}

export interface SnapProvider {
  pluginId: string;
  priority?: number;
  isActive: (state: CanvasStore) => boolean;
  getOverlayConfig?: (state: CanvasStore) => SnapOverlayConfig | null;
}

export interface ShortcutInterceptor {
  pluginId: string;
  shortcuts: string[];
  priority?: number;
  shouldHandle: (state: CanvasStore, shortcut: string) => boolean;
  handle: (state: CanvasStore, shortcut: string, context: unknown) => boolean;
}
