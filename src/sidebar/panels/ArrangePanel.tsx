import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useArrangeHandlers } from '../../hooks/useArrangeHandlers';
import { useThemeColors } from '../../hooks';
import {
  Triangle,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  UnfoldHorizontal,
  UnfoldVertical,
  FoldHorizontal,
  FoldVertical,
  ArrowLeftRight,
  ArrowUpDown
} from 'lucide-react';
import { VStack, HStack, IconButton as ChakraIconButton, Box } from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { pluginManager } from '../../utils/pluginManager';

interface ButtonConfig {
  handler: () => void;
  icon: React.ReactElement;
  title: string;
  disabled?: boolean;
}

const ROTATE_180_STYLE: React.CSSProperties = { transform: 'rotate(180deg)' };

const ArrangePanelComponent: React.FC = () => {
  // Only trigger re-render when activePlugin changes via useArrangeHandlers
  const currentHandlers = useArrangeHandlers();

  // Subscribe to selection changes to trigger re-renders
  const selectedCount = useCanvasStore(state => state.selectedIds.length);
  const selectedCommandsCount = useCanvasStore(state => state.selectedCommands?.length ?? 0);
  const selectedSubpathsCount = useCanvasStore(state => state.selectedSubpaths?.length ?? 0);

  // Get selection mode from the active plugin's behavior flags
  const selectionMode = pluginManager.getActiveSelectionMode();

  // Determine alignment/distribution thresholds based on selection mode
  const canAlign = selectedCount >= 2 ||
    (selectionMode === 'commands' && selectedCommandsCount >= 2) ||
    (selectionMode === 'subpaths' && selectedSubpathsCount >= 2);
  const canDistribute = selectedCount >= 3 ||
    (selectionMode === 'commands' && selectedCommandsCount >= 3) ||
    (selectionMode === 'subpaths' && selectedSubpathsCount >= 3);

  // Button configurations - now using the consolidated handlers
  const distributionButtons: ButtonConfig[] = [
    { handler: currentHandlers.distributeHorizontally, icon: <ArrowLeftRight size={12} />, title: "Distribute Horizontally", disabled: !canDistribute },
    { handler: currentHandlers.distributeVertically, icon: <ArrowUpDown size={12} />, title: "Distribute Vertically", disabled: !canDistribute }
  ];

  const sizeMatchButtons: ButtonConfig[] = [
    { handler: currentHandlers.matchWidthToLargest, icon: <UnfoldHorizontal size={12} />, title: "Match Width to Largest", disabled: !canAlign },
    { handler: currentHandlers.matchHeightToLargest, icon: <UnfoldVertical size={12} />, title: "Match Height to Largest", disabled: !canAlign },
    { handler: currentHandlers.matchWidthToSmallest, icon: <FoldHorizontal size={12} />, title: "Match Width to Smallest", disabled: !canAlign },
    { handler: currentHandlers.matchHeightToSmallest, icon: <FoldVertical size={12} />, title: "Match Height to Smallest", disabled: !canAlign }
  ];

  // Order buttons are only available for element and subpath selection modes
  const orderButtons: ButtonConfig[] = selectionMode === 'commands' ? [] : [
    { handler: currentHandlers.bringToFront, icon: <Triangle size={12} />, title: `Bring ${selectionMode === 'subpaths' ? 'Subpath' : ''} to Front`, disabled: selectionMode === 'subpaths' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendForward, icon: <ChevronUp size={12} />, title: `Send ${selectionMode === 'subpaths' ? 'Subpath' : ''} Forward`, disabled: selectionMode === 'subpaths' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendBackward, icon: <ChevronDown size={12} />, title: `Send ${selectionMode === 'subpaths' ? 'Subpath' : ''} Backward`, disabled: selectionMode === 'subpaths' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendToBack, icon: <Triangle size={12} style={ROTATE_180_STYLE} />, title: `Send ${selectionMode === 'subpaths' ? 'Subpath' : ''} to Back`, disabled: selectionMode === 'subpaths' ? selectedSubpathsCount === 0 : selectedCount === 0 }
  ];

  const alignmentButtons: ButtonConfig[] = [
    { handler: currentHandlers.alignLeft, icon: <AlignLeft size={12} />, title: "Align Left", disabled: !canAlign },
    { handler: currentHandlers.alignCenter, icon: <AlignCenter size={12} />, title: "Align Center", disabled: !canAlign },
    { handler: currentHandlers.alignRight, icon: <AlignRight size={12} />, title: "Align Right", disabled: !canAlign },
    { handler: currentHandlers.alignTop, icon: <AlignVerticalJustifyStart size={12} />, title: "Align Top", disabled: !canAlign },
    { handler: currentHandlers.alignMiddle, icon: <AlignVerticalJustifyCenter size={12} />, title: "Align Middle", disabled: !canAlign },
    { handler: currentHandlers.alignBottom, icon: <AlignVerticalJustifyEnd size={12} />, title: "Align Bottom", disabled: !canAlign }
  ];

  const { panelButton: { color, hoverBg, activeBg } } = useThemeColors();

  const renderButtonRow = (buttons: ButtonConfig[]) => (
    <HStack spacing={0.5} w="full">
      {buttons.map((button, index) => (
        <React.Fragment key={index}>
          <ConditionalTooltip label={button.title} shouldWrapChildren={false}>
            <Box flex={1} minW={0} display="flex">
              <ChakraIconButton
                aria-label={button.title}
                icon={button.icon}
                onClick={button.handler}
                isDisabled={button.disabled}
                size="xs"
                w="full"
                variant="ghost"
                bg="transparent"
                borderRadius="full"
                color={color}
                _hover={{ bg: hoverBg }}
                _active={{ bg: activeBg }}
                minW={0}
              />
            </Box>
          </ConditionalTooltip>
        </React.Fragment>
      ))}
    </HStack>
  );

  return (
    <Box
      px={0}
      w="full"
      position="relative"
    >
      <RenderCountBadgeWrapper componentName="ArrangePanel" position="top-right" />
      <VStack spacing={0} align="stretch">
        {/* Row 1: Align buttons */}
        {renderButtonRow(alignmentButtons)}

        {/* Row 2: Distribution and Order buttons */}
        {selectionMode === 'commands' ? (
          /* Commands mode has different layout - no order buttons */
          <HStack spacing={0.5} justify="space-between">
            {renderButtonRow(distributionButtons)}
          </HStack>
        ) : (
          /* Normal layout for element and subpath modes */
          <HStack spacing={0.5}>
            {renderButtonRow([...distributionButtons, ...orderButtons])}
          </HStack>
        )}

        {/* Row 3: Size Match buttons (hidden in commands mode) */}
        {selectionMode !== 'commands' && renderButtonRow(sizeMatchButtons)}
      </VStack>
    </Box>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when useArrangeHandlers changes (activePlugin)
export const ArrangePanel = React.memo(ArrangePanelComponent);