import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { useResponsive } from '../hooks/useResponsive';
import { SidebarUtilityButton, SIDEBAR_UTILITY_BORDER_WIDTH } from './SidebarUtilityButton';
import ConditionalTooltip from './ConditionalTooltip';

export const SIDEBAR_TAB_SEPARATOR_WIDTH = '2px';

export interface SidebarTabStripItem {
  key: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ size?: number }>;
  iconOnly?: boolean;
  iconSize?: number;
  tooltip?: string;
}

interface SidebarTabStripProps {
  items: SidebarTabStripItem[];
  scrollable?: boolean;
  tabWidth?: string;
  fontSize?: string;
  flat?: boolean;
  variant?: 'tabs' | 'iconRail';
  distribution?: 'fill' | 'space-between';
}

export const SidebarTabStrip: React.FC<SidebarTabStripProps> = ({
  items,
  scrollable = false,
  tabWidth,
  fontSize = 'sm',
  flat = false,
  variant = 'tabs',
  distribution = 'fill',
}) => {
  const isIconRail = variant === 'iconRail';
  const useSpaceBetween = !scrollable && distribution === 'space-between';
  const separatorColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
  const { isMobile } = useResponsive();

  if (items.length === 0) {
    return null;
  }

  const rail = (
    <HStack
      spacing={isIconRail ? 0.5 : 0}
      align="stretch"
      justify={useSpaceBetween ? 'space-between' : undefined}
      w={scrollable ? 'max-content' : 'full'}
      minW={scrollable ? 'full' : undefined}
      borderRadius={isIconRail ? 0 : flat || isMobile ? 0 : '12px'}
      border={isIconRail ? 'none' : flat ? 'none' : `${SIDEBAR_UTILITY_BORDER_WIDTH} solid`}
      borderLeftWidth={isIconRail ? 0 : flat || isMobile ? 0 : SIDEBAR_UTILITY_BORDER_WIDTH}
      borderTopWidth={isIconRail ? 0 : flat || isMobile ? 0 : SIDEBAR_UTILITY_BORDER_WIDTH}
      borderBottomWidth={isIconRail ? 0 : '0'}
      borderColor={flat ? 'transparent' : separatorColor}
      bg="transparent"
      p="0"
      boxShadow={flat || isMobile ? 'none' : isIconRail ? 'none' : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'}
    >
      {items.map((item, index) => {
        const previousItem = items[index - 1];
        const showSeparator = !isIconRail && index > 0 && !item.isActive && !previousItem?.isActive;
        const hasFixedScrollableWidth = scrollable && Boolean(tabWidth);
        const tabShape = isIconRail
          ? 'full'
          : flat || isMobile
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
            flex={useSpaceBetween ? '0 0 auto' : scrollable ? '0 0 auto' : '1 1 0'}
            w={hasFixedScrollableWidth ? tabWidth : (scrollable || useSpaceBetween ? 'auto' : 'full')}
            minW={hasFixedScrollableWidth ? tabWidth : (scrollable ? undefined : useSpaceBetween ? 'auto' : 0)}
            position="relative"
            display="flex"
            alignItems="stretch"
            overflow={item.isActive ? 'hidden' : undefined}
            zIndex={item.isActive ? 1 : 0}
            borderTopLeftRadius={item.isActive ? '8px' : 0}
            borderTopRightRadius={item.isActive ? '8px' : 0}
          >
            {showSeparator && (
              <Box
                aria-hidden
                position="absolute"
                left={0}
                top="4px"
                bottom="4px"
                w={SIDEBAR_TAB_SEPARATOR_WIDTH}
                bg={separatorColor}
                zIndex={1}
                pointerEvents="none"
              />
            )}
            <ConditionalTooltip label={item.tooltip ?? item.label}>
              <Box display="flex" alignItems="stretch" h="full">
                <SidebarUtilityButton
                  label={item.label}
                  isActive={item.isActive}
                  onClick={item.onClick}
                  fullWidth={!scrollable || hasFixedScrollableWidth}
                  fontSize={fontSize}
                  borderless
                  icon={item.icon}
                  iconOnly={item.iconOnly}
                  iconSize={item.iconSize ?? (isIconRail ? 14 : 14)}
                  visualStyle={isIconRail ? 'segment' : 'tab'}
                  minWidth={hasFixedScrollableWidth ? tabWidth : undefined}
                  tabShape={tabShape}
                  tabPaddingX={scrollable && !hasFixedScrollableWidth ? 2 : undefined}
                  activeTopRadius="6px"
                />
              </Box>
            </ConditionalTooltip>
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
