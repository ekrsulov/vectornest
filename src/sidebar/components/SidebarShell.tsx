import React from 'react';
import { Box } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';

interface SidebarShellProps {
  side: 'left' | 'right';
  width: number;
  isPinned: boolean;
  isOpen: boolean;
  sidebarBg: string;
  overlayBg: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const SidebarShell: React.FC<SidebarShellProps> = ({
  side,
  width,
  isPinned,
  isOpen,
  sidebarBg,
  overlayBg,
  onClose,
  children,
}) => {
  const positionStyles: BoxProps =
    side === 'left'
      ? {
        left: 0,
        borderRightWidth: isPinned ? '1px' : 0,
      }
      : {
        right: 0,
        borderLeftWidth: isPinned ? '1px' : 0,
      };

  const sidebarFrameStyles: BoxProps = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: `${width}px`,
    maxW: '100vw',
    h: '100dvh',
    maxH: '100dvh',
    bg: sidebarBg,
    borderColor: isPinned ? 'border.sidebar' : 'transparent',
    borderStyle: 'solid',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    sx: {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      WebkitTouchCallout: 'none',
    },
    ...positionStyles,
  };

  return (
    <>
      {isPinned && <Box data-sidebar-shell="true" {...sidebarFrameStyles}>{children}</Box>}

      {!isPinned && isOpen && (
        <>
          <Box
            position="fixed"
            inset={0}
            bg={overlayBg}
            zIndex={999}
            onClick={onClose}
            sx={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          />
          <Box data-sidebar-shell="true" {...sidebarFrameStyles}>{children}</Box>
        </>
      )}
    </>
  );
};
