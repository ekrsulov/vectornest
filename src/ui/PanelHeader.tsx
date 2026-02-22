/**
 * PanelHeader component with Chakra UI
 * Replaces PanelHeader from PanelComponents.tsx
 */

import React from 'react'
import { Flex, Heading, Box, Spacer, IconButton } from '@chakra-ui/react'
import { ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { useThemeColors } from '../hooks'

export interface PanelHeaderProps {
  /** Icon to display */
  icon?: React.ReactNode
  /** Header title */
  title?: string
  /** Optional actions (badges, buttons) */
  actions?: React.ReactNode
  /** Whether panel is collapsible */
  isCollapsible?: boolean
  /** Current open state */
  isOpen?: boolean
  /** Toggle handler */
  onToggle?: () => void
  /** Whether the panel can be maximized */
  isMaximizable?: boolean
  /** Whether the panel is currently maximized */
  isMaximized?: boolean
  /** Handler when requesting maximize */
  onMaximize?: () => void
  /** Handler when requesting minimize */
  onMinimize?: () => void
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon,
  title,
  actions,
  isCollapsible = false,
  isOpen = true,
  onToggle,
  isMaximizable = false,
  isMaximized = false,
  onMaximize,
  onMinimize,
}) => {
  const { panelHeader: { iconColor, titleColor } } = useThemeColors()
  const canToggleCollapse = isCollapsible && !isMaximized

  return (
    <Flex
      data-panel-header
      align="center"
      bg="transparent"
      px={0}
      py={0}
      borderRadius="md"
      mb={0}
      minH="24px"
      cursor={canToggleCollapse ? 'pointer' : 'default'}
      onClick={canToggleCollapse ? onToggle : undefined}
      role={canToggleCollapse ? 'button' : undefined}
      aria-expanded={canToggleCollapse ? isOpen : undefined}
      tabIndex={canToggleCollapse ? 0 : undefined}
      onKeyDown={canToggleCollapse ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle?.()
        }
      } : undefined}
      transition="background 0.2s ease"
    >
      {/* Icon */}
      {icon && (
        <Box
          as="span"
          mr={1.5}
          color={iconColor}
          display="flex"
          alignItems="center"
        >
          {icon}
        </Box>
      )}

      {/* Title */}
      {title && (
        <Heading
          as="h3"
          size="xs"
          fontWeight="extrabold"
          color={titleColor}
          fontSize="sm"
        >
          {title}
        </Heading>
      )}

      {/* Spacer pushes actions to the right */}
      <Spacer />

      {/* Header Actions */}
      {actions && (
        <Box mr={isCollapsible ? 1 : 0}>
          {actions}
        </Box>
      )}

      {/* Maximize button (shown before chevron) */}
      {isMaximizable && isOpen && !isMaximized && (
        <IconButton
          aria-label="Maximize panel"
          icon={<Maximize2 size={14} />}
          size="xs"
          variant="ghost"
          borderRadius="full"
          minW="22px"
          h="20px"
          w="22px"
          p={0}
          ml={1}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onMaximize?.()
          }}
        />
      )}

      {/* Collapse Toggle Icon */}
      {isMaximized ? (
        <IconButton
          aria-label="Minimize panel"
          icon={<Minimize2 size={14} />}
          size="xs"
          variant="ghost"
          borderRadius="full"
          minW="22px"
          h="20px"
          w="22px"
          p={0}
          ml={1.5}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onMinimize?.()
          }}
        />
      ) : (
        isCollapsible && (
          <IconButton
            aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
            icon={isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            size="xs"
            variant="ghost"
            borderRadius="full"
            minW="22px"
            h="20px"
            w="22px"
            p={0}
            ml={1.5}
            data-panel-collapse-toggle
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onToggle?.()
            }}
          />
        )
      )}
    </Flex>
  )
}
