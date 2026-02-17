import React from 'react';
import { IconButton as ChakraIconButton, HStack, VStack, Tag as ChakraTag, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { Panel } from '../../ui/Panel';
import type { LucideIcon } from 'lucide-react';

// Pan button configuration to reduce duplication
interface PanButtonConfig {
  label: string;
  icon: LucideIcon;
  dx: number;
  dy: number;
}

const PAN_BUTTONS: PanButtonConfig[][] = [
  // First row: NW, N, NE
  [
    { label: 'Pan Northwest', icon: ArrowUpLeft, dx: -1, dy: -1 },
    { label: 'Pan North', icon: ChevronUp, dx: 0, dy: -1 },
    { label: 'Pan Northeast', icon: ArrowUpRight, dx: 1, dy: -1 },
  ],
  // Second row: W, Reset (special), E
  [
    { label: 'Pan West', icon: ChevronLeft, dx: -1, dy: 0 },
    { label: 'Reset Pan', icon: RotateCcw, dx: 0, dy: 0 }, // Special case for reset
    { label: 'Pan East', icon: ChevronRight, dx: 1, dy: 0 },
  ],
  // Third row: SW, S, SE
  [
    { label: 'Pan Southwest', icon: ArrowDownLeft, dx: -1, dy: 1 },
    { label: 'Pan South', icon: ChevronDown, dx: 0, dy: 1 },
    { label: 'Pan Southeast', icon: ArrowDownRight, dx: 1, dy: 1 },
  ],
];

export const PanPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const pan = useCanvasStore(state => state.pan);
  const resetPan = useCanvasStore(state => state.resetPan);
  const panX = useCanvasStore(state => Math.round(state.viewport.panX));
  const panY = useCanvasStore(state => Math.round(state.viewport.panY));
  
  const panAmount = 50; // pixels to pan

  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const buttonActiveBg = useColorModeValue('gray.200', 'whiteAlpha.300');

  return (
    <Panel 
      title="Pan"
      headerActions={
        <ChakraTag size="sm" colorScheme="gray" fontSize="xs">
          {panX}, {panY}
        </ChakraTag>
      }
    >
      <VStack spacing={1} align="center">
        {PAN_BUTTONS.map((row, rowIndex) => (
          <HStack key={rowIndex} spacing={1}>
            {row.map((button) => {
              const Icon = button.icon;
              const isReset = button.label === 'Reset Pan';
              
              return (
                <ChakraIconButton
                  key={button.label}
                  aria-label={button.label}
                  icon={<Icon size={14} />}
                  onClick={isReset ? resetPan : () => pan(button.dx * panAmount, button.dy * panAmount)}
                  size="sm"
                  variant="secondary"
                  borderRadius="full"
                  _hover={{ bg: buttonHoverBg }}
                  _active={{ bg: buttonActiveBg }}
                />
              );
            })}
          </HStack>
        ))}
      </VStack>
    </Panel>
  );
};