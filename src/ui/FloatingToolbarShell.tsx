import React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';
import { useThemeColors, useToolbarPositionStyles } from '../hooks';
import { zIndices } from '../theme/spacing';

/** Position configuration for each toolbar type */
const TOOLBAR_POSITION_CONFIG = {
  top: {
    withRulers: { base: 6, md: 10 },
    default: { base: 2, md: 6 },
    zIndex: zIndices.floatingToolbarTop,
  },
  bottom: {
    default: { base: 2, md: 5 },
    zIndex: zIndices.floatingToolbarBottom,
  },
} as const;

export interface FloatingToolbarShellProps extends Omit<BoxProps, 'position'> {
  /**
   * Position of the toolbar: 'top' or 'bottom'
   */
  toolbarPosition?: 'top' | 'bottom';
  /**
   * Right sidebar width for positioning calculations
   */
  sidebarWidth?: number;
  /**
   * Left sidebar width for positioning calculations
   */
  leftSidebarWidth?: number;
  /**
   * Whether to show grid rulers (affects top toolbar positioning)
   */
  showGridRulers?: boolean;
  /**
   * Children components to render inside the toolbar
   */
  children: React.ReactNode;
}

/**
 * Shared shell for floating toolbars (Top & Bottom action bars)
 * Provides consistent positioning, shadows, backdrop blur, and responsiveness
 */
export const FloatingToolbarShell: React.FC<FloatingToolbarShellProps> = ({
  toolbarPosition = 'top',
  sidebarWidth = 0,
  leftSidebarWidth = 0,
  showGridRulers = false,
  children,
  ...boxProps
}) => {
  const { left, right, transform, hasPinnedOffset } = useToolbarPositionStyles({
    leftOffset: leftSidebarWidth,
    rightOffset: sidebarWidth,
  });
  const { toolbar: { bg, color, borderColor, borderWidth, shadow } } = useThemeColors();

  // Get position config based on toolbar type
  const config = TOOLBAR_POSITION_CONFIG[toolbarPosition];
  const positionProps = toolbarPosition === 'top'
    ? { top: showGridRulers ? (config as typeof TOOLBAR_POSITION_CONFIG['top']).withRulers : config.default }
    : { bottom: config.default };

  return (
    <Box
      position="fixed"
      {...positionProps}
      left={left}
      right={right}
      transform={transform}
      marginLeft={hasPinnedOffset ? 'auto' : 0}
      marginRight={hasPinnedOffset ? 'auto' : 0}
      width="fit-content"
      bg={bg}
      color={color}
      borderRadius="full"
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={shadow}
      px={1}
      py={1}
      zIndex={config.zIndex}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        ...boxProps.sx,
      }}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
