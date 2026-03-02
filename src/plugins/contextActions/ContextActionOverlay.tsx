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
import { Box, HStack, VStack, Text, Portal, useColorModeValue } from '@chakra-ui/react';
import { useContextActions, type QuickAction, type ActionGroup } from './useContextActions';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSidebarLayout } from '../../hooks/useSidebarLayout';
import { useToolbarPositionStyles } from '../../hooks/useToolbarPositionStyles';
import { NO_FOCUS_STYLES_DEEP } from '../../hooks/useThemeColors';
import type { CanvasOverlayProps } from '../../types/ui-contributions';
import { useCanvasStore } from '../../store/canvasStore';
import ConditionalTooltip from '../../ui/ConditionalTooltip';

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
/** Time for click lock to avoid accidental double actions */
const ACTION_LOCK_MS = 2000;
/** Visual feedback duration for successful click */
const ACTION_FEEDBACK_MS = 260;
/** Delay before closing dropdown to let feedback flash be visible */
const MENU_ACTION_CLOSE_DELAY_MS = 120;

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

/**
 * Returns short visual feedback + a temporary click lock.
 * Useful to avoid accidental double execution for one-shot actions.
 */
const useActionClickGuard = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setIsLocked(true);
    setIsFeedbackActive(true);

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setIsFeedbackActive(false);
      feedbackTimeoutRef.current = null;
    }, ACTION_FEEDBACK_MS);

    lockTimeoutRef.current = setTimeout(() => {
      setIsLocked(false);
      lockTimeoutRef.current = null;
    }, ACTION_LOCK_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return { isLocked, isFeedbackActive, trigger };
};

/** Single quick action button */
const QuickActionButton: React.FC<{
  action: QuickAction;
  isMobile: boolean;
}> = React.memo(({ action, isMobile }) => {
  const { toolbar } = useThemeColors();
  const isDanger = action.variant === 'danger';
  const defaultColor = isDanger ? 'red.400' : toolbar.color;
  const buttonSize = isMobile ? '26px' : '30px';
  const contrastBg = useColorModeValue('black', 'white');
  const contrastIconColor = useColorModeValue('white', 'black');
  const { isLocked, isFeedbackActive, trigger } = useActionClickGuard();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isLocked) return;
      trigger();
      action.onClick();
    },
    [action, isLocked, trigger]
  );

  const button = (
    <Box
      as="button"
      onClick={handleClick}
      disabled={isLocked}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={buttonSize}
      h={buttonSize}
      borderRadius="full"
      cursor={isLocked ? 'not-allowed' : 'pointer'}
      color={isFeedbackActive ? contrastIconColor : defaultColor}
      bg={isFeedbackActive ? contrastBg : 'transparent'}
      _hover={isLocked ? { bg: isFeedbackActive ? contrastBg : 'transparent' } : { bg: contrastBg, color: contrastIconColor }}
      _active={isLocked ? { bg: isFeedbackActive ? contrastBg : 'transparent' } : { bg: contrastBg, color: contrastIconColor }}
      transition="background-color 0.15s, color 0.15s, transform 0.2s ease, opacity 0.2s ease"
      transform={isFeedbackActive ? 'scale(0.9)' : 'scale(1)'}
      opacity={isLocked ? 0.68 : 1}
      flexShrink={0}
      aria-label={action.label}
      aria-disabled={isLocked}
    >
      <action.icon size={isMobile ? 13 : 16} />
    </Box>
  );

  if (isMobile) return button;

  return (
    <ConditionalTooltip label={action.label} placement="top" fontSize="xs" openDelay={300}>
      {button}
    </ConditionalTooltip>
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
  const iconBubbleSize = isMobile ? '26px' : '30px';
  const buttonWidth = iconBubbleSize;
  const indicatorWidth = isMobile ? '15px' : '19px';
  const indicatorHeight = isMobile ? '5px' : '6px';
  const indicatorBottom = isMobile ? '2px' : '2px';
  const contrastBg = useColorModeValue('black', 'white');
  const contrastIconColor = useColorModeValue('white', 'black');
  const indicatorColor = useColorModeValue('#4A5568', '#CBD5E0');
  const indicatorActiveColor = contrastIconColor;
  const childKeys = useMemo(() => buildStableKeys(group.children), [group.children]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childLockTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const childFeedbackTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [lockedChildIds, setLockedChildIds] = useState<Set<string>>(() => new Set());
  const [feedbackChildIds, setFeedbackChildIds] = useState<Set<string>>(() => new Set());

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

  const triggerChildClickGuard = useCallback((childId: string) => {
    const existingLockTimeout = childLockTimeoutsRef.current.get(childId);
    if (existingLockTimeout) {
      clearTimeout(existingLockTimeout);
    }
    const existingFeedbackTimeout = childFeedbackTimeoutsRef.current.get(childId);
    if (existingFeedbackTimeout) {
      clearTimeout(existingFeedbackTimeout);
    }

    setLockedChildIds((prev) => {
      const next = new Set(prev);
      next.add(childId);
      return next;
    });
    setFeedbackChildIds((prev) => {
      const next = new Set(prev);
      next.add(childId);
      return next;
    });

    const feedbackTimeout = setTimeout(() => {
      setFeedbackChildIds((prev) => {
        const next = new Set(prev);
        next.delete(childId);
        return next;
      });
      childFeedbackTimeoutsRef.current.delete(childId);
    }, ACTION_FEEDBACK_MS);
    childFeedbackTimeoutsRef.current.set(childId, feedbackTimeout);

    const lockTimeout = setTimeout(() => {
      setLockedChildIds((prev) => {
        const next = new Set(prev);
        next.delete(childId);
        return next;
      });
      childLockTimeoutsRef.current.delete(childId);
    }, ACTION_LOCK_MS);
    childLockTimeoutsRef.current.set(childId, lockTimeout);
  }, []);

  useEffect(() => {
    const childLockTimeouts = childLockTimeoutsRef.current;
    const childFeedbackTimeouts = childFeedbackTimeoutsRef.current;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (menuCloseTimeoutRef.current) {
        clearTimeout(menuCloseTimeoutRef.current);
      }
      childLockTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      childFeedbackTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      childLockTimeouts.clear();
      childFeedbackTimeouts.clear();
    };
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
      role="group"
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={buttonWidth}
      h={iconBubbleSize}
      px={0}
      borderRadius="full"
      cursor="pointer"
      color={toolbar.color}
      bg="transparent"
      transition="color 0.15s"
      flexShrink={0}
      overflow="visible"
      aria-label={group.label}
      aria-expanded={isOpen}
    >
      <Box
        data-role="group-icon-bubble"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={iconBubbleSize}
        h={iconBubbleSize}
        borderRadius="full"
        bg={isOpen ? contrastBg : 'transparent'}
        color={isOpen ? contrastIconColor : toolbar.color}
        _groupHover={{ bg: contrastBg, color: contrastIconColor }}
        _groupActive={{ bg: contrastBg, color: contrastIconColor }}
        transition="background-color 0.15s, color 0.15s"
      >
        <group.icon size={isMobile ? 13 : 16} />
      </Box>
      <Box
        as="svg"
        position="absolute"
        left="50%"
        bottom={indicatorBottom}
        transform="translateX(-50%)"
        width={indicatorWidth}
        height={indicatorHeight}
        viewBox="0 0 20 6"
        preserveAspectRatio="none"
        pointerEvents="none"
        opacity={isOpen ? 0.98 : 0.78}
        transition="opacity 0.15s ease"
      >
        <polyline
          points={isOpen ? '1,1 10,5 19,1' : '1,3 19,3'}
          fill="none"
          stroke={isOpen ? indicatorActiveColor : indicatorColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        button
      ) : (
        <ConditionalTooltip
          label={group.label}
          placement="top"
          fontSize="xs"
          openDelay={300}
          isDisabled={isOpen}
        >
          {button}
        </ConditionalTooltip>
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
            {group.children.map((child, index) => {
              const isLocked = lockedChildIds.has(child.id);
              const isFeedbackActive = feedbackChildIds.has(child.id);
              const childDefaultColor = child.variant === 'danger' ? theme.menu.dangerColor : theme.menu.iconColor;
              const childHoverBg = child.variant === 'danger' ? theme.menu.dangerHoverBg : theme.menu.hoverBg;

              return (
                <Box
                  key={childKeys[index]}
                  as="button"
                  disabled={isLocked}
                  aria-disabled={isLocked}
                  w="full"
                  px={3}
                  py={1.5}
                  display="flex"
                  alignItems="center"
                  gap={2}
                  borderRadius="md"
                  cursor={isLocked ? 'not-allowed' : 'pointer'}
                  color={childDefaultColor}
                  bg={isFeedbackActive ? childHoverBg : 'transparent'}
                  _hover={isLocked ? { bg: isFeedbackActive ? childHoverBg : 'transparent' } : { bg: childHoverBg }}
                  _active={isLocked ? { bg: isFeedbackActive ? childHoverBg : 'transparent' } : { bg: childHoverBg }}
                  transform={isFeedbackActive ? 'scale(0.98)' : 'scale(1)'}
                  opacity={isLocked ? 0.68 : 1}
                  transition="background 0.1s, transform 0.18s ease, opacity 0.18s ease"
                  fontSize="14px"
                  fontWeight="medium"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (isLocked) return;
                    triggerChildClickGuard(child.id);
                    child.onClick();
                    if (menuCloseTimeoutRef.current) {
                      clearTimeout(menuCloseTimeoutRef.current);
                    }
                    menuCloseTimeoutRef.current = setTimeout(() => {
                      setIsOpen(false);
                      menuCloseTimeoutRef.current = null;
                    }, MENU_ACTION_CLOSE_DELAY_MS);
                  }}
                >
                  <Box flexShrink={0} display="flex" alignItems="center">
                    <child.icon size={14} />
                  </Box>
                  <Text fontSize="14px" fontWeight="medium" isTruncated flex={1} textAlign="left">
                    {child.label}
                  </Text>
                </Box>
              );
            })}
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
      boxShadow="none"
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
