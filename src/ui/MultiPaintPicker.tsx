import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Collapse,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Input,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { paintContributionRegistry } from '../utils/paintContributionRegistry';
import { PanelStyledButton } from './PanelStyledButton';
import { PanelTextInput } from './PanelTextInput';
import { useThemeColors } from '../hooks';

const COLLAPSE_STYLE: React.CSSProperties = { width: '100%', overflow: 'visible' };
interface MultiPaintPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  defaultColor: string;
  mode: 'fill' | 'stroke';
  fullWidth?: boolean;
  floatingContainerRef?: React.RefObject<HTMLElement | null>;
}

export const MultiPaintPicker: React.FC<MultiPaintPickerProps> = ({
  label,
  value,
  onChange,
  defaultColor,
  mode,
  fullWidth = true,
  floatingContainerRef,
}) => {
  const normalizedValue = typeof value === 'string' ? value : '';
  const [tempColor, setTempColor] = useState(
    normalizedValue && !normalizedValue.startsWith('url(') ? normalizedValue : defaultColor
  );
  // No memo — registry is small and contributions may change if plugins register after mount
  const contributions = paintContributionRegistry.getContributions().filter((c) => c.showInPicker ?? true);
  const [isOpen, setIsOpen] = useState(false);
  const {
    panelButton: { panelBg: pickerBg, borderColor: pickerBorderColor },
    input: {
      textColor: tabBaseTextColor,
    },
  } = useThemeColors();
  const tabListBg = useColorModeValue('surface.panelSecondary', 'rgba(255, 255, 255, 0.04)');
  const tabTextColor = useColorModeValue('gray.700', 'gray.200');
  const tabHoverBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const tabSelectedBg = useColorModeValue('gray.200', 'whiteAlpha.200');
  const tabSelectedColor = useColorModeValue('gray.900', 'white');
  const swatchBorderColor = useColorModeValue(
    'var(--chakra-colors-gray-300)',
    'var(--chakra-colors-whiteAlpha-400)'
  );
  const swatchSize = 28;
  const triggerSize = 20;
  const swatchRadius = '0';
  const swatchButtonRadius = '50%';

  const applyColor = (val: string) => {
    setTempColor(val);
    onChange(val);
    setIsOpen(false);
  };

  const isPatternOrGradient = normalizedValue.startsWith('url(');
  const chipStyle = isPatternOrGradient
    ? {
        backgroundImage: normalizedValue,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: normalizedValue === 'none' ? 'transparent' : normalizedValue || defaultColor,
      };

  const contentWidth = fullWidth ? '100%' : '220px';
  const panelMarginTop = floatingContainerRef?.current ? 0 : 2;
  const colorInputValue = tempColor === 'none' ? defaultColor : tempColor || defaultColor;
  const colorPreviewBg = tempColor === 'none' ? 'transparent' : (tempColor || defaultColor);

  const pickerContent = (
    <Collapse in={isOpen} animateOpacity style={COLLAPSE_STYLE}>
      <Box
        mt={panelMarginTop}
        w={contentWidth}
        maxW={fullWidth ? '100%' : undefined}
        borderWidth="1px"
        borderColor={pickerBorderColor}
        borderRadius="0"
        boxShadow="none"
        bg={pickerBg}
        p={0}
      >
        <Tabs size="sm" variant="unstyled" w="100%">
          <TabList
            bg={tabListBg}
            borderBottom="1px solid"
            borderColor={pickerBorderColor}
            px={0}
            pt={0}
            gap={1}
          >
            <Tab
              px={2}
              py={1}
              borderRadius={swatchRadius}
              color={tabTextColor ?? tabBaseTextColor}
              _hover={{ bg: tabHoverBg }}
              _selected={{
                bg: tabSelectedBg,
                color: tabSelectedColor,
              }}
            >
              Color
            </Tab>
            {contributions.map((c) => (
              <Tab
                key={c.id}
                px={2}
                py={1}
                borderRadius={swatchRadius}
                color={tabTextColor ?? tabBaseTextColor}
                _hover={{ bg: tabHoverBg }}
                _selected={{
                  bg: tabSelectedBg,
                  color: tabSelectedColor,
                }}
              >
                {c.label}
              </Tab>
            ))}
          </TabList>
          <TabPanels p={0}>
            <TabPanel p={1}>
              <VStack align="stretch" spacing={0}>
                <HStack spacing={1} align="center" w="100%" h={`${swatchSize}px`}>
                  <Box
                    borderWidth="1px"
                    borderColor={pickerBorderColor}
                    borderRadius={swatchRadius}
                    position="relative"
                    minW={`${swatchSize}px`}
                    w={`${swatchSize}px`}
                    h="100%"
                    overflow="hidden"
                  >
                    <Box
                      h="100%"
                      w="100%"
                      borderRadius="0"
                      border="none"
                      bg={colorPreviewBg}
                    />
                    <Input
                      type="color"
                      value={colorInputValue}
                      onChange={(e) => setTempColor(e.target.value)}
                      position="absolute"
                      inset={0}
                      opacity={0}
                      cursor="pointer"
                      w="100%"
                      h="100%"
                      p={0}
                      aria-label={`Select ${label} color`}
                    />
                  </Box>
                  <Box flex="1 1 0">
                    <PanelTextInput
                      value={tempColor}
                      onChange={setTempColor}
                      width="100%"
                    />
                  </Box>
                  <PanelStyledButton
                    size="xs"
                    onClick={() => applyColor(tempColor)}
                    flexShrink={0}
                  >
                    Apply
                  </PanelStyledButton>
                </HStack>
              </VStack>
            </TabPanel>
            {contributions.map((c) => (
              <TabPanel key={c.id} p={0}>
                {c.renderPicker({
                  currentValue: value,
                  onSelect: (val) => {
                    onChange(val);
                    setIsOpen(false);
                  },
                  mode,
                })}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </Collapse>
  );

  const renderedContent =
    floatingContainerRef?.current && isOpen
      ? createPortal(pickerContent, floatingContainerRef.current)
      : pickerContent;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      width={fullWidth ? '100%' : 'auto'}
      maxW={fullWidth ? '100%' : undefined}
      position="relative"
    >
      <Box
        as="button"
        type="button"
        aria-label={`Select ${label}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Select ${label}`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${triggerSize}px`,
          height: `${triggerSize}px`,
          cursor: 'pointer',
          padding: 0,
          border: 'none',
          background: 'none',
        }}
      >
        {isPatternOrGradient ? (
          <svg
            width={triggerSize}
            height={triggerSize}
            viewBox={`0 0 ${triggerSize} ${triggerSize}`}
            style={{
              borderRadius: swatchButtonRadius,
              border: `1px solid ${swatchBorderColor}`,
              overflow: 'hidden',
            }}
          >
            <defs>{paintContributionRegistry.renderDefs()}</defs>
            <rect width={triggerSize} height={triggerSize} fill={value} />
          </svg>
        ) : (
          <span
            style={{
              display: 'inline-block',
              width: `${triggerSize}px`,
              height: `${triggerSize}px`,
              borderRadius: swatchButtonRadius,
              ...chipStyle,
              border: `1px solid ${swatchBorderColor}`,
            }}
          />
        )}
      </Box>
      {renderedContent}
    </Box>
  );
};
