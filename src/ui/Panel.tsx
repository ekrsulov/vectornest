/**
 * Panel component with Chakra UI
 * Replaces PanelWithHeader from PanelComponents.tsx
 */

import React from 'react'
import { Box, Collapse, useDisclosure, type BoxProps } from '@chakra-ui/react'
import { PanelHeader } from './PanelHeader'
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper'
import { useSidebarPanelState } from '../contexts/sidebarPanelState'
import { panelSpacing } from '../theme/spacing'

export interface PanelProps extends BoxProps {
  /** Icon to display in header */
  icon?: React.ReactNode
  /** Panel title */
  title?: string
  /** Hide header (title & icon) entirely */
  hideHeader?: boolean
  /** Panel content */
  children: React.ReactNode
  /** Optional actions in header (e.g., badges, buttons) */
  headerActions?: React.ReactNode
  /** Whether panel should be open by default */
  defaultOpen?: boolean
  /** Whether panel can be collapsed */
  isCollapsible?: boolean
  /** Whether panel supports maximize/minimize */
  isMaximizable?: boolean
  /** Optional stable key for the panel - when provided, only one panel with a key can be open at a time */
  panelKey?: string
  /** Show render count badge (debug only) */
  showRenderCount?: boolean
}

export const Panel: React.FC<PanelProps> = ({
  icon,
  title,
  hideHeader = false,
  children,
  headerActions,
  defaultOpen = true,
  isCollapsible = true,
  isMaximizable = false,
  panelKey,
  showRenderCount = import.meta.env.DEV,
  ...boxProps
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: defaultOpen })
  const { openPanelKey, setOpenPanelKey, maximizedPanelKey, setMaximizedPanelKey } = useSidebarPanelState();

  // Only use global collapse state when panelKey is explicitly provided
  // This allows panels to opt-in to the "only one panel open at a time" behavior
  const usesGlobalCollapseState = panelKey !== undefined;

  const isCurrentlyMaximized = panelKey ? maximizedPanelKey === panelKey : false;

  // When using global collapse state, compute isOpen from store
  const computedIsOpen = usesGlobalCollapseState && openPanelKey != null
    ? openPanelKey === panelKey
    : isOpen;

  const effectiveIsOpen = computedIsOpen;

  // When using global collapse state, toggle changes which panel is open
  const computedOnToggle = usesGlobalCollapseState && setOpenPanelKey
    ? () => {
        if (openPanelKey === panelKey) {
          setOpenPanelKey(null); // Close current panel
        } else {
          setOpenPanelKey(panelKey); // Open this panel, close others
        }
      }
    : onToggle;

  const handleMaximize = () => {
    if (!panelKey) return;
    setMaximizedPanelKey(panelKey);
  };

  const handleMinimize = () => {
    setMaximizedPanelKey(null);
  };

  const containerFlexProps: BoxProps = isCurrentlyMaximized
    ? { display: 'flex', flexDirection: 'column', flex: 1, minH: 0 }
    : {};

  const maximizedContentProps: BoxProps = isCurrentlyMaximized
    ? { flex: 1, display: 'flex', flexDirection: 'column', minH: 0, overflowY: 'auto' }
    : {};

  return (
    <Box
      position="relative"
      mt={panelSpacing.betweenPanels}
      {...containerFlexProps}
      {...boxProps}
    >
      {showRenderCount && (
        <RenderCountBadgeWrapper componentName={`Panel: ${title || 'Untitled'}`} position="top-left" />
      )}
      
      {!hideHeader && (icon || title) && (
        <PanelHeader
          icon={icon}
          title={title}
          actions={headerActions}
          isCollapsible={isCollapsible}
          isOpen={effectiveIsOpen}
          onToggle={computedOnToggle}
          isMaximizable={isMaximizable}
          isMaximized={isCurrentlyMaximized}
          onMaximize={handleMaximize}
          onMinimize={handleMinimize}
        />
      )}
      
      {isCollapsible ? (
        <Collapse
          in={effectiveIsOpen}
          animateOpacity
          style={isCurrentlyMaximized ? { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}
        >
          <Box {...maximizedContentProps}>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box {...maximizedContentProps}>
          {children}
        </Box>
      )}
    </Box>
  )
}
