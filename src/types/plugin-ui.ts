import type { ComponentType } from 'react';
import type { Point, CanvasElement, ElementType, AppSettings } from '.';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import type { Bounds } from '../utils/boundsUtils';
import type { SnapPoint as LegacySnapPoint } from '../utils/snapPointUtils';
import type { DragContext } from './extensionPoints';

import type {
  PluginCanvasLayerContribution,
  PluginCanvasOverlayContribution,
  PluginProviderContribution as CanonicalPluginProviderContribution,
} from './ui-contributions';
import type { SelectionContextInfo } from './selection';
import type { PluginStoreApi } from './plugin-context';
import type { FillPropertiesOptional, StrokePropertiesOptional } from './style';

export interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement?: 'tool' | 'global';
}

export interface SvgStructureAttributeSnapshot {
  name: string;
  value: string;
}

export interface SvgStructureNodeSnapshot {
  tagName: string;
  idAttribute?: string | null;
  dataElementId?: string | null;
  displayId: string;
  elementId?: string | null;
  isDefs: boolean;
  defsOwnerId?: string | null;
  childIndex?: number;
  attributes: SvgStructureAttributeSnapshot[];
}

export interface SvgStructureContributionProps<TStore extends object = object> {
  node: SvgStructureNodeSnapshot;
  store: PluginStoreApi<TStore>;
}

export interface SvgStructureContribution<TStore extends object = object> {
  id: string;
  order?: number;
  appliesTo?: (node: SvgStructureNodeSnapshot) => boolean;
  component: ComponentType<SvgStructureContributionProps<TStore>>;
  badgesComponent?: ComponentType<SvgStructureContributionProps<TStore>>;
  buttonsComponent?: ComponentType<SvgStructureContributionProps<TStore>>;
}

export interface SvgDefsEditorUpdateContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
  attrName: string;
  rawValue: string;
}

export interface SvgDefsChildUpdateContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
  attrName: string;
  rawValue: string;
}

export interface SvgDefsChildAddContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
  position?: number;
}

export interface SvgDefsChildRemoveContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
}

export interface SvgDefsAttributeRemoveContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
  attrName: string;
}

export interface SvgDefsAttributeAddContext<TStore extends object = object> {
  store: TStore;
  node: SvgStructureNodeSnapshot;
  attrName: string;
  rawValue: string;
}

export interface SvgDefsEditor<TStore extends object = object> {
  id: string;
  appliesTo: (node: SvgStructureNodeSnapshot) => boolean;
  mapAttributeNameToDataKey?: (attrName: string, current: Record<string, unknown>) => string;
  update: (ctx: SvgDefsEditorUpdateContext<TStore>) => boolean;
  updateChild?: (ctx: SvgDefsChildUpdateContext<TStore>) => boolean;
  addChild?: (ctx: SvgDefsChildAddContext<TStore>) => boolean;
  removeChild?: (ctx: SvgDefsChildRemoveContext<TStore>) => boolean;
  addAttribute?: (ctx: SvgDefsAttributeAddContext<TStore>) => boolean;
  removeAttribute?: (ctx: SvgDefsAttributeRemoveContext<TStore>) => boolean;
  revisionSelector?: (state: TStore) => unknown;
}

export interface PluginPanelContribution<TProps = Record<string, unknown>> {
  id: string;
  targetPlugin: string;
  component: ComponentType<TProps>;
  order?: number;
}

export type { CanvasLayerPlacement } from './ui-contributions';

export interface CanvasLayerContext extends CanvasControllerValue {
  canvasSize: { width: number; height: number };
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;
  dragPosition: Point | null;
  isDragging: boolean;
  getElementBounds: (element: CanvasElement) => Bounds | null;
  setDragStart: (point: Point | null) => void;
  handleSubpathDoubleClick?: (elementId: string, subpathIndex: number, e: React.MouseEvent<SVGElement>) => void;
  handleSubpathTouchEnd?: (elementId: string, subpathIndex: number, e: React.TouchEvent<SVGElement>) => void;
  settings?: AppSettings;
  [key: string]: unknown;
}

export type CanvasLayerContribution = PluginCanvasLayerContribution<CanvasLayerContext>;

export interface PluginActionContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement: 'top' | 'bottom' | 'settings-panel';
}

export type PluginSelectionMode = 'elements' | 'subpaths' | 'commands' | 'none';

export interface SnapOverlayConfig {
  showStaticPoints: boolean;
  cachedSnapPoints: LegacySnapPoint[];
  availableSnapPoints?: LegacySnapPoint[];
  snapPointsOpacity: number;
  currentSnapInfo: LegacySnapPoint | null;
  isInteracting: boolean;
  mode: 'objectSnap' | 'measureSnap' | 'arrowSnap';
  dragContext?: DragContext | null;
  handlesFeedbackInternally?: boolean;
  isPointEditMode?: boolean;
  usesDirectDragging?: boolean;
}

export interface PathRendererOverrides
  extends
    StrokePropertiesOptional,
    FillPropertiesOptional
{
  scaleStrokeWithZoom?: boolean;
  disableFilter?: boolean;
}

export interface RendererOverrides {
  path?: PathRendererOverrides;
  element?: Partial<Record<ElementType, unknown>>;
}

export interface PluginRenderBehaviorContext {
  colorMode: 'light' | 'dark';
}

export interface PluginBehaviorFlags {
  preventsSelection?: boolean;
  preventsSubpathInteraction?: boolean;
  selectionMode?: PluginSelectionMode;
  skipSubpathMeasurements?: boolean;
  showPointFeedback?: boolean;
  isPanMode?: boolean;
  isSidebarPanelMode?: boolean;
  hideSelectionOverlay?: boolean;
  hideIndividualSelectionOverlays?: boolean;
  hideSelectionBbox?: boolean;
  usesObjectSnap?: boolean;
  notifyOnSelectionChange?: boolean;
  clearsSubpathsOnElementSelect?: boolean;
  usesMeasureSnap?: boolean;
  getSnapOverlayConfig?: () => SnapOverlayConfig | null;
}

export interface SidebarToolbarButtonContribution {
  id: string;
  icon: ComponentType<{ size?: number }>;
  label?: string;
  order?: number;
}

export type PluginProviderContribution = CanonicalPluginProviderContribution;

export type CanvasOverlayContribution = PluginCanvasOverlayContribution;

export interface FloatingContextMenuAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  isDisabled?: boolean;
  variant?: 'default' | 'danger';
  submenu?: FloatingContextMenuAction[];
}

export interface PluginContextMenuActionContribution {
  id: string;
  action: (context: SelectionContextInfo) => FloatingContextMenuAction | null;
}

export interface PluginIdentityMetadata {
  label: string;
  icon?: ComponentType<{ size?: number }>;
  cursor?: string;
  disablePathInteraction?: boolean;
  pathCursorMode?: 'select' | 'default' | 'pointer';
  mobileFixed?: boolean;
}

