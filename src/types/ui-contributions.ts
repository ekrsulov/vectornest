/**
 * Unified UI Contribution Types for the Plugin System
 *
 * This module provides a standardized type hierarchy for all UI contributions
 * that plugins can make to the VectorNest application.
 *
 * @module ui-contributions
 */

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { Point, AppSettings } from './index';
import type { Bounds } from '../utils/boundsUtils';

// ===== PLACEMENT TYPES =====

/**
 * Standardized placement locations for UI contributions.
 * Each placement type corresponds to a specific area in the application.
 */
export type UIPlacement =
  | 'sidebar-panel'      // Panels in the left/right sidebar
  | 'canvas-layer'       // SVG layers rendered inside the canvas
  | 'canvas-overlay'     // React components overlaid on canvas (outside SVG)
  | 'toolbar-button'     // Buttons in the sidebar toolbar
  | 'provider'           // React context providers
  | 'global-overlay'     // Global overlays (modals, toasts, etc.)
  | 'expandable-panel'   // Bottom expandable panels
  | 'context-menu';      // Context menu contributions

/**
 * Canvas layer placement within the SVG structure.
 */
export type CanvasLayerPlacement = 'background' | 'midground' | 'foreground';

// ===== PLUGIN-COMPAT TYPES (CANONICAL SOURCE) =====

/**
 * Legacy/compat shape used by plugin registration for SVG canvas layers.
 * `plugin-ui.ts` re-exports this type to preserve existing plugin APIs.
 */
export interface PluginCanvasLayerContribution<TContext = Record<string, unknown>> {
  id: string;
  placement?: CanvasLayerPlacement;
  render: (context: TContext) => ReactNode;
}

/**
 * Legacy/compat shape used by plugin registration for React overlays on top of canvas.
 * `plugin-ui.ts` re-exports this type to preserve existing plugin APIs.
 */
export interface PluginCanvasOverlayContribution {
  id: string;
  component: ComponentType<{
    viewport: { zoom: number; panX: number; panY: number };
    canvasSize: { width: number; height: number };
  }>;
  condition?: (ctx: CanvasConditionContext) => boolean;
}

/**
 * Legacy/compat shape used by plugin registration for provider wrappers.
 * `plugin-ui.ts` re-exports this type to preserve existing plugin APIs.
 */
export interface PluginProviderContribution {
  id: string;
  component: ComponentType<ProviderProps>;
  condition?: (ctx: { activePlugin: string | null }) => boolean;
}

// ===== CONDITION CONTEXTS =====

/**
 * Context provided to condition functions for determining UI visibility.
 * This is the unified context for all UI contribution conditions.
 */
export interface UIConditionContext {
  // Plugin state
  activePlugin: string | null;

  // Viewport state
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };

  // Canvas state
  canvasSize: {
    width: number;
    height: number;
  };

  // Selection state
  selectedIds: string[];
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedCommands: Array<{ elementId: string; subpathIndex: number; commandIndex: number }>;

  // Panel modes
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  showLibraryPanel: boolean;
  isInSpecialPanelMode: boolean;

  // Capabilities
  canPerformOpticalAlignment: boolean;
  llmAssistantConfigured?: boolean;
  hasPathWithMultipleSubpaths: boolean;

  // Counts (for quick checks)
  selectedElementsCount: number;
  selectedSubpathsCount: number;
  selectedCommandsCount: number;
  selectedPathsCount: number;
  totalElementsCount: number;

  // Group editing
  activeGroupId?: string | null;
  selectedGroupsCount?: number;
}

/**
 * Simplified condition context for canvas-only contributions.
 */
export interface CanvasConditionContext {
  viewport: UIConditionContext['viewport'];
  canvasSize: UIConditionContext['canvasSize'];
  activePlugin: string | null;
}

// Re-export PanelConditionContext from the canonical location to avoid divergent copies.
import type { PanelConditionContext } from './panel';
export type { PanelConditionContext } from './panel';

// ===== BASE CONTRIBUTION =====

/**
 * Base interface for all UI contributions.
 * All specific contribution types extend from this.
 */
export interface BaseUIContribution<TProps = unknown> {
  /** Unique identifier for this contribution */
  id: string;

  /** Where this contribution should be rendered */
  placement: UIPlacement;

  /** The React component to render */
  component: ComponentType<TProps> | LazyExoticComponent<ComponentType<TProps>>;

  /** Optional rendering order (lower numbers render first) */
  order?: number;

  /** Optional condition for when this contribution should be visible */
  condition?: (ctx: UIConditionContext) => boolean;
}

// ===== SPECIFIC CONTRIBUTION TYPES =====

/**
 * Props passed to sidebar panel components.
 */
export interface SidebarPanelProps {
  activePlugin?: string | null;
  panelKey?: string;
}

/**
 * Sidebar panel contribution (left/right sidebar).
 */
export interface SidebarPanelContribution extends Omit<BaseUIContribution<SidebarPanelProps>, 'placement' | 'condition'> {
  placement: 'sidebar-panel';

  /** Unique key for the panel (used for routing/identification) */
  key: string;

  /** Condition using panel-specific context */
  condition: (ctx: PanelConditionContext) => boolean;

  /** Optional props transformer */
  getProps?: (allProps: SidebarPanelProps) => SidebarPanelProps;

  /** Plugin ID that contributed this panel (set automatically) */
  pluginId?: string;
}

/**
 * Props passed to canvas layer components.
 */
export interface CanvasLayerProps {
  // Viewport info
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };

  // Selection state
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;

  // Drag state
  dragPosition: Point | null;
  isDragging: boolean;

  // Helpers
  getElementBounds: (element: unknown) => Bounds | null;
  setDragStart: (point: Point | null) => void;

  // Settings
  settings?: AppSettings;

  // Allow extension
  [key: string]: unknown;
}

/**
 * Canvas layer contribution (rendered inside SVG).
 * Named UnifiedCanvasLayerContribution to avoid collision with CanvasLayerContribution in plugin-ui.ts.
 */
export interface UnifiedCanvasLayerContribution extends Omit<BaseUIContribution<CanvasLayerProps>, 'placement' | 'component'> {
  placement: 'canvas-layer';

  /** Where in the SVG layer stack to render */
  layerPlacement?: CanvasLayerPlacement;

  /** Render function instead of component (for SVG elements) */
  render: (context: CanvasLayerProps) => ReactNode;
}

/**
 * Props passed to canvas overlay components.
 */
export interface CanvasOverlayProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

/**
 * Canvas overlay contribution (rendered outside SVG, over canvas).
 */
export interface CanvasOverlayContribution extends Omit<BaseUIContribution<CanvasOverlayProps>, 'placement' | 'condition'> {
  placement: 'canvas-overlay';

  /** Condition using canvas-specific context */
  condition?: (ctx: CanvasConditionContext) => boolean;
}

/**
 * Toolbar button contribution (sidebar toolbar).
 */
export interface ToolbarButtonContribution extends Omit<BaseUIContribution<never>, 'placement' | 'component'> {
  placement: 'toolbar-button';

  /** Icon component for the button */
  icon: ComponentType<{ size?: number }>;

  /** Accessible label for the button */
  label?: string;

  /** Click handler */
  onClick?: () => void;

  /** Whether the button is disabled */
  isDisabled?: boolean;
}

/**
 * Props passed to provider components.
 */
export interface ProviderProps {
  children: ReactNode;
}

/**
 * React provider contribution (wraps app or sections).
 */
export interface ProviderContribution extends Omit<BaseUIContribution<ProviderProps>, 'placement' | 'condition'> {
  placement: 'provider';

  /** Condition for when to render the provider */
  condition?: (ctx: { activePlugin: string | null }) => boolean;
}

/**
 * Expandable panel contribution (bottom panel).
 */
export interface ExpandablePanelContribution extends Omit<BaseUIContribution<unknown>, 'placement'> {
  placement: 'expandable-panel';

  /** Initial expanded state */
  defaultExpanded?: boolean;

  /** Minimum height when collapsed */
  collapsedHeight?: number;

  /** Maximum height when expanded */
  expandedHeight?: number;
}

// ===== UNION TYPES =====

/**
 * Union of all contribution types for type discrimination.
 */
export type UIContribution =
  | SidebarPanelContribution
  | UnifiedCanvasLayerContribution
  | CanvasOverlayContribution
  | ToolbarButtonContribution
  | ProviderContribution
  | ExpandablePanelContribution;

// ===== TYPE GUARDS =====

/**
 * Type guard for sidebar panel contributions.
 */
export function isSidebarPanelContribution(
  contribution: UIContribution
): contribution is SidebarPanelContribution {
  return contribution.placement === 'sidebar-panel';
}

/**
 * Type guard for canvas layer contributions.
 */
export function isCanvasLayerContribution(
  contribution: UIContribution
): contribution is UnifiedCanvasLayerContribution {
  return contribution.placement === 'canvas-layer';
}

/**
 * Type guard for canvas overlay contributions.
 */
export function isCanvasOverlayContribution(
  contribution: UIContribution
): contribution is CanvasOverlayContribution {
  return contribution.placement === 'canvas-overlay';
}

/**
 * Type guard for toolbar button contributions.
 */
export function isToolbarButtonContribution(
  contribution: UIContribution
): contribution is ToolbarButtonContribution {
  return contribution.placement === 'toolbar-button';
}

/**
 * Type guard for provider contributions.
 */
export function isProviderContribution(
  contribution: UIContribution
): contribution is ProviderContribution {
  return contribution.placement === 'provider';
}

// ===== HELPER FUNCTIONS =====

/**
 * Creates a condition that checks if the active plugin matches.
 */
export function whenActivePlugin(pluginId: string): (ctx: UIConditionContext) => boolean {
  return (ctx) => ctx.activePlugin === pluginId;
}

/**
 * Creates a condition that checks if NOT in special panel mode.
 */
export function whenNotInSpecialPanelMode(): (ctx: PanelConditionContext) => boolean {
  return (ctx) => !ctx.isInSpecialPanelMode;
}

/**
 * Creates a condition that combines multiple conditions with AND.
 */
export function allConditions<T>(
  ...conditions: Array<(ctx: T) => boolean>
): (ctx: T) => boolean {
  return (ctx) => conditions.every((condition) => condition(ctx));
}

/**
 * Creates a condition that combines multiple conditions with OR.
 */
export function anyCondition<T>(
  ...conditions: Array<(ctx: T) => boolean>
): (ctx: T) => boolean {
  return (ctx) => conditions.some((condition) => condition(ctx));
}

/**
 * Creates a condition that inverts another condition.
 */
export function notCondition<T>(condition: (ctx: T) => boolean): (ctx: T) => boolean {
  return (ctx) => !condition(ctx);
}
