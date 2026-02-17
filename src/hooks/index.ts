// Centralized hooks exports
// This makes imports cleaner: import { useLocalStorage, useThemeColors } from '../hooks';

// UI/UX hooks
export { useColorModeSync } from './useColorModeSync';
export { useIOSSupport } from './useIOSSupport';
export { useResponsive } from './useResponsive';

// Layout hooks
export { useSidebarLayout } from './useSidebarLayout';
export { useToolbarPositionStyles } from './useToolbarPositionStyles';
export { useRenderCount } from './useRenderCount';
export { useSidebarFooterHeight } from './useSidebarFooterHeight';

// Unified theme colors - PRIMARY COLOR HOOK
// All color needs should use this hook. Individual color hooks are deprecated.
export { useThemeColors, NO_FOCUS_STYLES, NO_FOCUS_STYLES_DEEP } from './useThemeColors';

// State/Storage hooks
export { useLocalStorage } from './useLocalStorage';
export { useTemporalState } from './useTemporalState';

// Tool/Plugin hooks
export { useEnabledPlugins } from './useEnabledPlugins';
export { usePluginPanels } from './usePluginPanels';
export { useSelectionContext } from './useSelectionContext';

// Action hooks (for floating context menu)
export { useAlignmentActions } from './useAlignmentActions';
export { useClipboardActions } from './useClipboardActions';
export { useGroupActions } from './useGroupActions';
export { useFloatingContextMenuActions } from './useFloatingContextMenuActions';

// Canvas/Element hooks  
export { useArrangeHandlers } from './useArrangeHandlers';

export { useFrozenElementsDuringDrag } from './useFrozenElementsDuringDrag';
export { useSelectionBounds } from './useSelectionBounds';
export { useSvgImport } from './useSvgImport';

// Panel hooks
export { usePanelToggleHandlers } from './usePanelToggleHandlers';

// Utility hooks

export { useEventCallback } from './useEventCallback';
