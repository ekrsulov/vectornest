import { ToggleButton } from './ToggleButton';
import { Box } from '@chakra-ui/react';

interface JoinedButtonGroupProps<T> {
  options: Array<{ value: T; label: string; description?: string }>;
  value: T;
  onChange: (value: T) => void;
  title?: string;
  size?: 'sm' | 'md';
  flex?: string | number;
  fullWidth?: boolean;
  disableTooltips?: boolean;
}

export const JoinedButtonGroup = <T extends string>({
  options,
  value,
  onChange,
  title: _title = "",
  size = 'md',
  flex,
  fullWidth = false,
  disableTooltips = false,
}: JoinedButtonGroupProps<T>) => {
  const buttonPadding = size === 'sm' ? '4px 8px' : undefined;
  const fontSize = size === 'sm' ? '11px' : undefined;

  return (
    <Box display="flex" width={flex ? 'auto' : (fullWidth ? '100%' : (size === 'sm' ? 'auto' : '100%'))} flex={flex}>
      {options.map((option, index) => {
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const sx = {
          flex: fullWidth ? '1' : (size === 'sm' ? 'none' : '1'),
          borderRadius: 0,
          borderLeftWidth: isFirst ? '1px' : 0,
          borderRightWidth: '1px',
          ...(isFirst && { borderTopLeftRadius: 'full', borderBottomLeftRadius: 'full' }),
          ...(isLast && { borderTopRightRadius: 'full', borderBottomRightRadius: 'full' }),
          ...(buttonPadding && { px: 2, py: 1 }),
          ...(fontSize && { fontSize }),
        };
        return (
          <ToggleButton
            key={String(option.value)}
            size={size}
            isActive={value === option.value}
            onClick={() => onChange(option.value)}
            aria-label={option.description || option.label}
            title={option.description || option.label}
            variant="text"
            showTooltip={!disableTooltips}
            sx={sx}
          >
            {option.label}
          </ToggleButton>
        );
      })}
    </Box>
  );
};
