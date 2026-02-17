import React from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { useResponsive } from '../hooks';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, shouldWrapChildren = true, ...props }) => {
  const { isMobile } = useResponsive();
  const showTooltips = useCanvasStore(state => state.settings.showTooltips);

  // Hide tooltips on mobile or when disabled in settings
  if (!showTooltips || isMobile) {
    return <>{children}</>;
  }

  return <Tooltip {...props} shouldWrapChildren={shouldWrapChildren} hasArrow>{children}</Tooltip>;
};

export default ConditionalTooltip;
