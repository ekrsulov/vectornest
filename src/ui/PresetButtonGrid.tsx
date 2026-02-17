import React from 'react';
import { Wrap, WrapItem, Flex, useColorModeValue } from '@chakra-ui/react';
import { PanelStyledButton } from './PanelStyledButton';
import { LibrarySectionHeader } from './LibrarySectionHeader';

interface PresetItem {
  id: string;
  label: string;
}

interface PresetButtonGridProps {
  /** Section title */
  title?: string;
  /** List of preset items */
  presets: PresetItem[];
  /** Callback when a preset is clicked */
  onSelect: (id: string) => void;
  /** Optional "Add All" action */
  onAddAll?: () => void;
  /** Show "Add All" button in header */
  showAddAll?: boolean;
  /** Custom button size */
  buttonSize?: 'xs' | 'sm';
}

/**
 * Compact grid of preset buttons for library panels.
 * Optimized for 233px max-width with wrapping.
 * 
 * Usage:
 * <PresetButtonGrid
 *   title="Presets"
 *   presets={[{ id: 'circle', label: 'Circle' }, { id: 'heart', label: 'Heart' }]}
 *   onSelect={(id) => addPreset(id)}
 *   onAddAll={handleAddAll}
 * />
 */
export const PresetButtonGrid: React.FC<PresetButtonGridProps> = ({
  title = 'Presets',
  presets,
  onSelect,
  onAddAll,
  showAddAll = true,
  buttonSize = 'xs',
}) => {
  return (
    <Flex direction="column" gap={1}>
      <LibrarySectionHeader
        title={title}
        action={
          showAddAll && onAddAll ? (
            <PanelStyledButton size="xs" onClick={onAddAll}>
              Add All
            </PanelStyledButton>
          ) : undefined
        }
      />
      <Wrap spacing={1}>
        {presets.map((preset) => (
          <WrapItem key={preset.id}>
            <PanelStyledButton
              size={buttonSize}
              onClick={() => onSelect(preset.id)}
            >
              {preset.label}
            </PanelStyledButton>
          </WrapItem>
        ))}
      </Wrap>
    </Flex>
  );
};

interface ActionButtonGroupProps {
  /** Action buttons to display */
  children: React.ReactNode;
  /** Stack direction */
  direction?: 'row' | 'column';
}

/**
 * Compact group for action buttons (Apply, Clear, etc).
 * Uses consistent spacing and layout for narrow panels.
 */
export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  children,
  direction = 'column',
}) => {
  return (
    <Flex
      direction={direction}
      gap={1}
      align={direction === 'row' ? 'center' : 'stretch'}
      flexWrap={direction === 'row' ? 'wrap' : 'nowrap'}
    >
      {children}
    </Flex>
  );
};

interface StatusMessageProps {
  /** Message text */
  children: React.ReactNode;
  /** Message type for styling */
  type?: 'info' | 'warning' | 'error';
}

/**
 * Compact status/hint message for action sections.
 */
export const StatusMessage: React.FC<StatusMessageProps> = ({
  children,
  type = 'info',
}) => {
  const colors = {
    info: useColorModeValue('gray.500', 'gray.400'),
    warning: useColorModeValue('orange.500', 'orange.400'),
    error: useColorModeValue('red.500', 'red.400'),
  };

  return (
    <Flex
      fontSize="10px"
      color={colors[type]}
      lineHeight="1.3"
      py={0.5}
    >
      {children}
    </Flex>
  );
};
