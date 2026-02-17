import React from 'react';
import { RenderCountBadge } from './RenderCountBadge';
import { useRenderCount } from '../hooks/useRenderCount';
import { useCanvasStore } from '../store/canvasStore';

interface RenderCountBadgeWrapperProps {
  componentName: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  wrapperStyle?: React.CSSProperties;
}

/**
 * Development-only render count badge wrapper.
 * In production, this component renders nothing and adds no overhead.
 * In development, it tracks and displays render counts for debugging.
 * 
 * Note: Hooks are always called unconditionally to follow React rules of hooks.
 * The useRenderCount hook is a no-op in production builds.
 */
export const RenderCountBadgeWrapper: React.FC<RenderCountBadgeWrapperProps> = ({
  componentName,
  position = 'top-left',
  wrapperStyle,
}) => {
  // Always call hooks unconditionally to follow React rules of hooks
  const { count: renderCount, rps: renderRps } = useRenderCount(componentName);
  const showRenderCountBadges = useCanvasStore((state) => state.settings.showRenderCountBadges);

  // Return null in production or when badges are disabled
  if (!import.meta.env.DEV || !showRenderCountBadges) {
    return null;
  }

  // If wrapper style is provided (for fixed positioning), wrap in a div
  if (wrapperStyle) {
    return (
      <div style={wrapperStyle}>
        <RenderCountBadge count={renderCount} rps={renderRps} position={position} />
      </div>
    );
  }

  // Default: just render the badge
  return <RenderCountBadge count={renderCount} rps={renderRps} position={position} />;
};
