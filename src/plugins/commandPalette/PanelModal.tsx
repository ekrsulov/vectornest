/**
 * PanelModal - Renders a plugin panel inside a draggable floating dialog.
 * Used by the command palette to open Gen/Audit/Prefs/Lib panels without sidebar navigation.
 * 
 * - No separate title header: the panel's own <Panel> header is the title
 * - Panel always expanded via CSS override on Collapse
 * - Draggable via title bar drag
 * - Close button in top-right corner
 */

import React, { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { Box, Spinner, Portal } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { useColorModeValue } from '@chakra-ui/react';
import { NO_FOCUS_STYLES_DEEP } from '../../hooks/useThemeColors';

interface PanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  PanelComponent: React.ComponentType;
  /** When true (prefs panels), shows the Panel's own header (with switch) and hides the chevron */
  isPrefsPanel?: boolean;
  /** When true, the panel manages its own collapse state — do not force Collapses open */
  preserveCollapses?: boolean;
}

/** CSS overrides for Gen/Audit/Lib panels: hide the Panel header, force content visible */
const PANEL_OVERRIDES = {
  // Force Collapse to always be visible (panels default to collapsed)
  '& .chakra-collapse': {
    display: 'block !important',
    height: 'auto !important',
    opacity: '1 !important',
    overflow: 'visible !important',
  },
  // Hide the Panel's own header (title is shown in the drag bar instead)
  '& [data-panel-header]': {
    display: 'none !important',
  },
  // Remove top margin added for sidebar spacing
  '& > div:first-of-type': {
    mt: '0 !important',
  },
};

/**
 * CSS overrides for panels that manage their own collapse state (e.g. EditorPanel).
 * Only removes outer margin — inner Collapse components are left untouched.
 */
const SELF_MANAGED_PANEL_OVERRIDES = {
  '& > div:first-of-type': {
    mt: '0 !important',
  },
};

/**
 * CSS overrides for Prefs panels: show the Panel header (it has the enable switch),
 * force content always visible, and hide the chevron toggle (redundant when forced open).
 */
const PREFS_PANEL_OVERRIDES = {
  // Force Collapse to always be visible
  '& .chakra-collapse': {
    display: 'block !important',
    height: 'auto !important',
    opacity: '1 !important',
    overflow: 'visible !important',
  },
  // Hide the collapse chevron button (content is always shown)
  '& [data-panel-collapse-toggle]': {
    display: 'none !important',
  },
  // Remove top margin added for sidebar spacing
  '& > div:first-of-type': {
    mt: '0 !important',
  },
};

export const PanelModal: React.FC<PanelModalProps> = ({
  isOpen,
  onClose,
  title,
  PanelComponent,
  isPrefsPanel = false,
  preserveCollapses = false,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [centered, setCentered] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center on first render
  useEffect(() => {
    if (isOpen && !centered) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPosition({ x: Math.round(w / 2 - 180), y: Math.round(h * 0.12) });
      setCentered(true);
    }
    if (!isOpen) {
      setCentered(false);
    }
  }, [isOpen, centered]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag from the header area (data-drag-handle)
      const target = e.target as HTMLElement;
      if (!target.closest('[data-drag-handle]')) return;
      // Don't drag if clicking buttons inside the header
      if (target.closest('button')) return;

      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      {/* Backdrop */}
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.300"
        zIndex={1400}
        onClick={onClose}
      />

      {/* Draggable floating panel */}
      <Box
        ref={dragRef}
        position="fixed"
        left={`${position.x}px`}
        top={`${position.y}px`}
        w={{ base: '92vw', md: '360px' }}
        maxH="80vh"
        bg={bgColor}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        boxShadow="dark-lg"
        zIndex={1401}
        overflow="hidden"
        display="flex"
        flexDirection="column"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        sx={{
          ...NO_FOCUS_STYLES_DEEP,
          touchAction: 'none',
        }}
      >
        {/* Drag handle bar + close button */}
        <Box
          data-drag-handle
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={3}
          py={1.5}
          cursor="grab"
          _active={{ cursor: 'grabbing' }}
          borderBottom="1px solid"
          borderColor={borderColor}
          flexShrink={0}
          userSelect="none"
        >
          {/* Title + drag indicator */}
          <Box display="flex" alignItems="center" gap={2} opacity={0.7}>
            <Box display="flex" gap="3px" opacity={0.5}>
              <Box w="4px" h="4px" borderRadius="full" bg="currentColor" />
              <Box w="4px" h="4px" borderRadius="full" bg="currentColor" />
              <Box w="4px" h="4px" borderRadius="full" bg="currentColor" />
            </Box>
            <Box fontSize="xs" fontWeight="semibold" isTruncated maxW="260px">
              {title}
            </Box>
          </Box>

          {/* Close button */}
          <Box
            as="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClose();
            }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="22px"
            h="22px"
            borderRadius="md"
            cursor="pointer"
            opacity={0.5}
            _hover={{ opacity: 1, bg: 'whiteAlpha.200' }}
            transition="all 0.15s"
            aria-label={`Close ${title}`}
          >
            <X size={14} />
          </Box>
        </Box>

        {/* Panel content — scrollable, with CSS overrides to force expansion */}
        <Box
          overflowY="auto"
          maxH="calc(80vh - 36px)"
          px={1}
          pb={2}
          sx={preserveCollapses ? SELF_MANAGED_PANEL_OVERRIDES : isPrefsPanel ? PREFS_PANEL_OVERRIDES : PANEL_OVERRIDES}
        >
          <Suspense
            fallback={
              <Box display="flex" justifyContent="center" py={8}>
                <Spinner size="sm" />
              </Box>
            }
          >
            <PanelComponent />
          </Suspense>
        </Box>
      </Box>
    </Portal>
  );
};
