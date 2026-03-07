import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { useResponsive } from '../hooks/useResponsive';
import { useThemeColors } from '../hooks/useThemeColors';
import { SidebarUtilityButton } from './SidebarUtilityButton';

export interface SidebarTabStripItem {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

interface SidebarTabStripProps {
  items: SidebarTabStripItem[];
  scrollable?: boolean;
  tabWidth?: string;
  fontSize?: string;
  flat?: boolean;
}

export const SidebarTabStrip: React.FC<SidebarTabStripProps> = ({
  items,
  scrollable = false,
  tabWidth,
  fontSize = 'sm',
  flat = false,
}) => {
  const railBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');
  const railBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
  const {
    toggle: {
      inactive: { color: separatorColor },
    },
  } = useThemeColors();
  const { isMobile } = useResponsive();

  if (items.length === 0) {
    return null;
  }

  const rail = (
    <HStack
      spacing={0}
      align="stretch"
      w={scrollable ? 'max-content' : 'full'}
      minW={scrollable ? 'full' : undefined}
      borderRadius={flat || isMobile ? 0 : '12px'}
      border="1px solid"
      borderLeftWidth={flat || isMobile ? 0 : '1px'}
      borderTopWidth={flat || isMobile ? 0 : '1px'}
      borderBottomWidth="0"
      borderColor={railBorderColor}
      bg={railBg}
      p="0"
      boxShadow={flat || isMobile ? 'none' : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'}
    >
      {items.map((item, index) => {
        const previousItem = items[index - 1];
        const showSeparator = index > 0 && !item.isActive && !previousItem?.isActive;
        const hasFixedScrollableWidth = scrollable && Boolean(tabWidth);
        const tabShape = flat || isMobile
          ? 'none'
          : items.length === 1
            ? 'full'
            : index === 0
              ? 'left'
              : index === items.length - 1
                ? 'right'
                : 'none';

        return (
          <Box
            key={item.key}
            flex={scrollable ? '0 0 auto' : '1 1 0'}
            w={hasFixedScrollableWidth ? tabWidth : (scrollable ? 'auto' : 'full')}
            minW={hasFixedScrollableWidth ? tabWidth : (scrollable ? undefined : 0)}
            position="relative"
            display="flex"
            alignItems="stretch"
          >
            {showSeparator && (
              <Box
                aria-hidden
                position="absolute"
                left={0}
                top="4px"
                bottom="4px"
                w="1px"
                bg={separatorColor}
                zIndex={1}
                pointerEvents="none"
              />
            )}
            <SidebarUtilityButton
              label={item.label}
              isActive={item.isActive}
              onClick={item.onClick}
              fullWidth={!scrollable || hasFixedScrollableWidth}
              fontSize={fontSize}
              borderless
              visualStyle="tab"
              minWidth={hasFixedScrollableWidth ? tabWidth : undefined}
              tabShape={tabShape}
              tabPaddingX={scrollable && !hasFixedScrollableWidth ? 2 : undefined}
            />
          </Box>
        );
      })}
    </HStack>
  );

  if (!scrollable) {
    return (
      <Box minW={0} w="full" flex={1} display="flex" alignItems="stretch">
        {rail}
      </Box>
    );
  }

  return (
    <Box minW={0} w="full" flex={1} overflow="hidden" display="flex" alignItems="stretch">
      <Box
        overflowX="auto"
        overflowY="hidden"
        w="full"
        css={{
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {rail}
      </Box>
    </Box>
  );
};
