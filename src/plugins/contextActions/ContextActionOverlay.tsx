/**
 * ContextActionOverlay - Floating quick action bar positioned near the selection bounding box.
 * Shows ALL relevant actions for the current selection:
 * - Direct actions as icon buttons
 * - Groups as icon buttons that open a dropdown popover with submenu items
 *
 * Desktop: Appears above the selection bounding box
 * Mobile: Appears as a compact bar above the bottom toolbar
 */

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Box, HStack, Tooltip, VStack, Text, Portal } from '@chakra-ui/react';
import { ChevronDown } from 'lucide-react';
import { useContextActions, type QuickAction, type ActionGroup } from './useContextActions';
import { useResponsive, useThemeColors, useSidebarLayout, useToolbarPositionStyles } from '../../hooks';
import { NO_FOCUS_STYLES_DEEP } from '../../hooks/useThemeColors';
import type { CanvasOverlayProps } from '../../types/ui-contributions';
import { useCanvasStore } from '../../store/canvasStore';

/** Minimum distance from viewport edges */
const EDGE_PADDING = 8;

/**
 * Item slot width (px) used to compute 8-item peek width on mobile.
 * Buttons are 26px; add 2px spacing between each slot.
 */
const MOBILE_ITEM_SLOT = 28;
/** Partial peek of the 9th element so the user knows there's more */
const MOBILE_PEEK = 14;
/** Max visible width on mobile: 8 full slots + 1 peek */
const MOBILE_MAX_W = `${MOBILE_ITEM_SLOT * 8 + MOBILE_PEEK}px`;

/**
 * Build stable keys per item occurrence so duplicate ids don't collide in React lists.
 */
const buildStableKeys = <T extends { id: string }>(items: T[]): string[] => {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const count = counts.get(item.id) ?? 0;
    counts.set(item.id, count + 1);
    return count === 0 ? item.id : `${item.id}__${count}`;
  });
};

/** Single quick action button */
const QuickActionButton: React.FC<{
  action: QuickAction;
  isMobile: boolean;
}> = React.memo(({ action, isMobile }) => {
  const { toolbar } = useThemeColors();
  const isDanger = action.variant === 'danger';

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      action.onClick();
    },
    [action]
  );

  const button = (
    <Box
      as="button"
      onClick={handleClick}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={isMobile ? '26px' : '30px'}
      h={isMobile ? '26px' : '30px'}
      borderRadius="md"
      cursor="pointer"
      color={isDanger ? 'red.400' : toolbar.color}
      bg="transparent"
      _hover={{ bg: 'whiteAlpha.200' }}
      _active={{ bg: 'whiteAlpha.300' }}
      transition="all 0.15s"
      flexShrink={0}
      aria-label={action.label}
    >
      <action.icon size={isMobile ? 13 : 16} />
    </Box>
  );

  if (isMobile) return button;

  return (
    <Tooltip label={action.label} placement="top" fontSize="xs" hasArrow openDelay={300}>
      {button}
    </Tooltip>
  );
});
QuickActionButton.displayName = 'QuickActionButton';

/** Thin separator between action sections */
const ActionSeparator: React.FC = () => {
  const { toolbar } = useThemeColors();
  return (
    <Box
      w="1px"
      h="20px"
      bg={toolbar.borderColor}
      opacity={0.4}
      flexShrink={0}
      mx={0.5}
    />
  );
};

/** Group button that opens a dropdown with submenu items */
const GroupActionButton: React.FC<{
  group: ActionGroup;
  isMobile: boolean;
}> = React.memo(({ group, isMobile }) => {
  const theme = useThemeColors();
  const { toolbar } = theme;
  const [isOpen, setIsOpen] = useState(false);
  const childKeys = useMemo(() => buildStableKeys(group.children), [group.children]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsOpen((prev) => !prev);
    },
    []
  );

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  }, []);

  // Compute dropdown position based on container — opens downward
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  const button = (
    <Box
      ref={containerRef}
      as="button"
      onClick={handleToggle}
      onMouseEnter={isMobile ? undefined : handleMouseEnter}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap="1px"
      h={isMobile ? '26px' : '30px'}
      px={1}
      borderRadius="md"
      cursor="pointer"
      color={isOpen ? 'blue.300' : toolbar.color}
      bg={isOpen ? 'whiteAlpha.200' : 'transparent'}
      _hover={{ bg: 'whiteAlpha.200' }}
      _active={{ bg: 'whiteAlpha.300' }}
      transition="all 0.15s"
      flexShrink={0}
      aria-label={group.label}
      aria-expanded={isOpen}
    >
      <group.icon size={isMobile ? 13 : 16} />
      <ChevronDown size={10} style={{ opacity: 0.6 }} />
    </Box>
  );

  return (
    <>
      {isMobile ? (
        button
      ) : (
        <Tooltip
          label={group.label}
          placement="top"
          fontSize="xs"
          hasArrow
          openDelay={300}
          isDisabled={isOpen}
        >
          {button}
        </Tooltip>
      )}

      {isOpen && (
        <Portal>
          <VStack
            ref={dropdownRef}
            position="fixed"
            top={`${dropdownPos.top}px`}
            left={`${dropdownPos.left}px`}
            transform="translateX(-50%)"
            bg={theme.menu.bg}
            borderRadius="lg"
            border="1px solid"
            borderColor={theme.menu.borderColor}
            boxShadow="lg"
            py={1}
            px={1}
            spacing={0}
            zIndex={1000}
            pointerEvents="auto"
            maxH="260px"
            overflowY="auto"
            minW="160px"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
            sx={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              backdropFilter: 'blur(10px)',
              ...NO_FOCUS_STYLES_DEEP,
            }}
          >
            {/* Group header */}
            <Text
              fontSize="2xs"
              fontWeight="semibold"
              color={theme.menu.iconColor}
              opacity={0.5}
              textTransform="uppercase"
              letterSpacing="wide"
              px={2}
              pt={1}
              pb={1}
            >
              {group.label}
            </Text>
            {group.children.map((child, index) => (
              <Box
                key={childKeys[index]}
                as="button"
                w="full"
                px={3}
                py={1.5}
                display="flex"
                alignItems="center"
                gap={2}
                borderRadius="md"
                cursor="pointer"
                color={child.variant === 'danger' ? theme.menu.dangerColor : theme.menu.iconColor}
                bg="transparent"
                _hover={{ bg: child.variant === 'danger' ? theme.menu.dangerHoverBg : theme.menu.hoverBg }}
                _active={{ bg: 'transparent' }}
                transition="background 0.1s"
                fontSize="14px"
                fontWeight="medium"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  child.onClick();
                  setIsOpen(false);
                }}
              >
                <Box flexShrink={0} display="flex" alignItems="center">
                  <child.icon size={14} />
                </Box>
                <Text fontSize="14px" fontWeight="medium" isTruncated flex={1} textAlign="left">
                  {child.label}
                </Text>
              </Box>
            ))}
          </VStack>
        </Portal>
      )}
    </>
  );
});
GroupActionButton.displayName = 'GroupActionButton';

/**
 * Desktop overlay: fixed at top center of screen.
 */
const DesktopContextBar: React.FC<{
  directActions: QuickAction[];
  groups: ActionGroup[];
}> = React.memo(({ directActions, groups }) => {
  const { toolbar } = useThemeColors();
  const { effectiveSidebarWidth, effectiveLeftSidebarWidth } = useSidebarLayout();
  const directActionKeys = useMemo(() => buildStableKeys(directActions), [directActions]);
  const groupKeys = useMemo(() => buildStableKeys(groups), [groups]);
  const { left, right, transform } = useToolbarPositionStyles({
    leftOffset: effectiveLeftSidebarWidth,
    rightOffset: effectiveSidebarWidth,
  });

  const totalActions = directActions.length + groups.length;
  if (totalActions === 0) return null;

  return (
    <HStack
      position="fixed"
      top={`${EDGE_PADDING}px`}
      left={left}
      right={right}
      transform={transform}
      marginLeft="auto"
      marginRight="auto"
      width="fit-content"
      bg={toolbar.bg}
      borderRadius="full"
      border="none"
      boxShadow="none"
      px={1}
      py={0.5}
      spacing={0}
      overflow="hidden"
      zIndex={900}
      pointerEvents="auto"
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        transition: 'opacity 0.15s ease',
        ...NO_FOCUS_STYLES_DEEP,
      }}
    >
      {/* Direct actions */}
      {directActions.map((action, index) => (
        <QuickActionButton key={directActionKeys[index]} action={action} isMobile={false} />
      ))}

      {/* Separator between direct actions and groups */}
      {directActions.length > 0 && groups.length > 0 && <ActionSeparator />}

      {/* Group actions with dropdowns */}
      {groups.map((group, index) => (
        <GroupActionButton key={groupKeys[index]} group={group} isMobile={false} />
      ))}
    </HStack>
  );
});
DesktopContextBar.displayName = 'DesktopContextBar';

/**
 * Mobile overlay: compact bar above the bottom toolbar.
 */
const MobileContextBar: React.FC<{
  directActions: QuickAction[];
  groups: ActionGroup[];
}> = React.memo(({ directActions, groups }) => {
  const { toolbar } = useThemeColors();
  const directActionKeys = useMemo(() => buildStableKeys(directActions), [directActions]);
  const groupKeys = useMemo(() => buildStableKeys(groups), [groups]);

  const totalActions = directActions.length + groups.length;
  if (totalActions === 0) return null;

  return (
    <HStack
      position="fixed"
      top={`${EDGE_PADDING}px`}
      left="50%"
      transform="translateX(-50%)"
      bg={toolbar.bg}
      borderRadius="full"
      borderWidth={toolbar.borderWidth}
      borderColor={toolbar.borderColor}
      boxShadow={toolbar.shadow}
      px={1}
      py={0.5}
      spacing={0}
      zIndex={899}
      pointerEvents="auto"
      maxW={MOBILE_MAX_W}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        ...NO_FOCUS_STYLES_DEEP,
      }}
    >
      {directActions.map((action, index) => (
        <QuickActionButton key={directActionKeys[index]} action={action} isMobile={true} />
      ))}
      {directActions.length > 0 && groups.length > 0 && <ActionSeparator />}
      {groups.map((group, index) => (
        <GroupActionButton key={groupKeys[index]} group={group} isMobile={true} />
      ))}
    </HStack>
  );
});
MobileContextBar.displayName = 'MobileContextBar';

/**
 * Main Context Action Overlay component.
 * Receives viewport props from the CanvasOverlays system.
 */
export const ContextActionOverlay: React.FC<CanvasOverlayProps> = React.memo(
  ({ viewport: _viewport }) => {
    const isWithoutDistractionMode = useCanvasStore((state) => Boolean(state.settings.withoutDistractionMode));
    const { directActions, groups } = useContextActions();
    const { isMobile } = useResponsive();

    if (isWithoutDistractionMode) {
      return null;
    }

    const totalActions = directActions.length + groups.length;
    if (totalActions === 0) return null;

    if (isMobile) {
      return <MobileContextBar directActions={directActions} groups={groups} />;
    }

    return <DesktopContextBar directActions={directActions} groups={groups} />;
  }
);
ContextActionOverlay.displayName = 'ContextActionOverlay';
