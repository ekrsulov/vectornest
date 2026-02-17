import type { ComponentType, PointerEvent, MouseEvent } from 'react';
import type { Point } from '.';
import type { ElementContribution } from '../utils/elementContributionRegistry';
import type { CanvasElementRenderer } from '../canvas/renderers';
import type {
  CanvasShortcutMap,
  ColorModeChangeContext,
  PluginApiFactory,
  PluginContextFull,
  PluginHookContribution,
  PluginSliceFactory,
} from './plugin-context';
import type {
  CanvasLayerContribution,
  CanvasOverlayContribution,
  PluginActionContribution,
  PluginBehaviorFlags,
  PluginContextMenuActionContribution,
  PluginIdentityMetadata,
  PluginPanelContribution,
  PluginProviderContribution,
  PluginRenderBehaviorContext,
  PluginUIContribution,
  RendererOverrides,
  SidebarToolbarButtonContribution,
  SvgDefsEditor,
  SvgStructureContribution,
} from './plugin-ui';
import type { PanelConfig } from './panel';

export interface PluginIdentity {
  id: string;
  metadata: PluginIdentityMetadata;
  supportsMobile?: boolean;
  dependencies?: string[];
  optionalDependencies?: string[];
}

export interface PluginImportExport {
  importers?: Array<(element: Element, transform: { a: number; b: number; c: number; d: number; e: number; f: number }) => unknown | null>;
  importDefs?: (doc: Document) => Record<string, unknown[]> | null;
  styleAttributeExtractor?: (element: Element) => Record<string, unknown>;
}

export type BehaviorFlagsOrFactory<TStore extends object> =
  | PluginBehaviorFlags
  | ((store: TStore) => PluginBehaviorFlags);

export interface PluginMode<TStore extends object> {
  modeConfig?: {
    description: string;
    entry?: string[];
    exit?: string[];
    toggleTo?: string;
  };
  behaviorFlags?: BehaviorFlagsOrFactory<TStore>;
}

export interface PluginEvents<TStore extends object> {
  subscribedEvents?: ('pointerdown' | 'pointermove' | 'pointerup')[];
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginContextFull<TStore>
  ) => void;
  onElementDoubleClick?: (
    elementId: string,
    event: MouseEvent<Element>,
    context: PluginContextFull<TStore>
  ) => void;
  onSubpathDoubleClick?: (
    elementId: string,
    subpathIndex: number,
    event: MouseEvent<Element>,
    context: PluginContextFull<TStore>
  ) => void;
  onCanvasDoubleClick?: (
    event: MouseEvent<Element>,
    context: PluginContextFull<TStore>
  ) => void;
}

export interface PluginShortcuts {
  keyboardShortcutScope?: 'activePlugin' | 'global';
  keyboardShortcuts?: CanvasShortcutMap;
}

export interface PluginUIContributions {
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  canvasOverlays?: CanvasOverlayContribution[];
  panels?: PluginUIContribution[];
  sidebarPanels?: PanelConfig[];
  providers?: PluginProviderContribution[];
  sidebarToolbarButtons?: SidebarToolbarButtonContribution[];
  expandablePanel?: ComponentType;
  relatedPluginPanels?: PluginPanelContribution[];
}

export interface PluginTool<TStore extends object> {
  toolDefinition?: {
    order: number;
    visibility?: 'always-shown' | 'dynamic';
    isDisabled?: (store: TStore) => boolean;
    isVisible?: (store: TStore) => boolean;
    toolGroup?: 'basic' | 'creation' | 'advanced' | 'zoom' | string;
  };
}

export interface PluginActions {
  actions?: PluginActionContribution[];
  contextMenuActions?: PluginContextMenuActionContribution[];
  arrangeConfig?: {
    suffix: string;
    includeOrder: boolean;
    orderSuffix?: string;
  };
}

export interface PluginSvgIntegration<TStore extends object> {
  svgStructureContributions?: Array<SvgStructureContribution<TStore>>;
  svgDefsEditors?: Array<SvgDefsEditor<TStore>>;
}

export interface PluginState<TStore extends object> {
  slices?: PluginSliceFactory<TStore>[];
  createApi?: PluginApiFactory<TStore>;
}

export interface PluginLifecycle<TStore extends object> {
  init?: (context: PluginContextFull<TStore>) => (() => void) | void;
  registerHelpers?: (context: PluginContextFull<TStore>) => Record<string, unknown>;
  hooks?: PluginHookContribution[];
  disablesGlobalUndoRedo?: (store: TStore) => boolean;
}

export interface PluginRendering<TStore extends object> {
  renderBehavior?: (store: TStore, context: PluginRenderBehaviorContext) => RendererOverrides | null;
  onColorModeChange?: (context: ColorModeChangeContext<TStore>) => void;
  elementContributions?: Array<ElementContribution | {
    type: ElementContribution['type'];
    canvasRenderer: CanvasElementRenderer;
  }>;
}

export interface PluginDefinition<TStore extends object = object>
  extends
    PluginIdentity,
    PluginImportExport,
    PluginMode<TStore>,
    PluginEvents<TStore>,
    PluginShortcuts,
    PluginUIContributions,
    PluginTool<TStore>,
    PluginActions,
    PluginSvgIntegration<TStore>,
    PluginState<TStore>,
    PluginLifecycle<TStore>,
    PluginRendering<TStore> {}
