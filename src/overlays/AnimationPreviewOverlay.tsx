import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../store/canvasStore';
import type { CanvasElement } from '../types';
import type { SVGAnimation, AnimationState } from '../types/animations';
import { AnimationPreviewControls } from './animationPreview/AnimationPreviewControls';
import {
  buildPreviewSvgHtml,
  computeTotalDuration,
  insertPreviewSvg,
} from './animationPreview/previewSvgUtils';

// Throttle slider updates to ~15fps
const SLIDER_UPDATE_INTERVAL = 1000 / 15;

interface AnimationPreviewOverlayProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

export const AnimationPreviewOverlay: React.FC<AnimationPreviewOverlayProps> = ({
  viewport,
  canvasSize,
}) => {
  const { 
    isCanvasPreviewMode, 
    isPlaying, 
    currentTime,
    restartKey,
    animations,
    elements,
    playCanvasPreview,
    pauseCanvasPreview,
    stopCanvasPreview,
    setAnimationTime,
  } = useCanvasStore(
    useShallow((state) => {
      const s = state as CanvasStore & {
        animationState?: AnimationState;
        animations?: SVGAnimation[];
        playCanvasPreview?: () => void;
        pauseCanvasPreview?: () => void;
        stopCanvasPreview?: () => void;
        setAnimationTime?: (t: number) => void;
      };
      const animState = s.animationState;
      return {
        isCanvasPreviewMode: animState?.isCanvasPreviewMode ?? false,
        isPlaying: animState?.isPlaying ?? false,
        currentTime: animState?.currentTime ?? 0,
        restartKey: animState?.restartKey ?? 0,
        animations: s.animations ?? ([] as SVGAnimation[]),
        elements: state.elements,
        playCanvasPreview: s.playCanvasPreview,
        pauseCanvasPreview: s.pauseCanvasPreview,
        stopCanvasPreview: s.stopCanvasPreview,
        setAnimationTime: s.setAnimationTime,
      };
    })
  );

  const [showPlaceholder, setShowPlaceholder] = useState(true);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const playStartRef = useRef<number | null>(null);
  const currentTimeRef = useRef(currentTime);
  const lastStateUpdateRef = useRef<number>(0);
  const wasPlayingRef = useRef(false);
  const hasInsertedRef = useRef(false);

  const maxDuration = useMemo(() => {
    if (!animations.length) return 0;
    return animations.reduce((max, a) => Math.max(max, computeTotalDuration(a)), 0);
  }, [animations]);

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  const viewBox = useMemo(() => {
    const x = -viewport.panX / viewport.zoom;
    const y = -viewport.panY / viewport.zoom;
    const w = canvasSize.width / viewport.zoom;
    const h = canvasSize.height / viewport.zoom;
    return `${x} ${y} ${w} ${h}`;
  }, [viewport, canvasSize]);

  // Generate SVG HTML with all elements and animations
  const generateSvgHtml = useCallback(
    (): string =>
      buildPreviewSvgHtml({
        elements,
        animations,
        elementMap,
        viewBox,
        restartKey,
      }),
    [elements, animations, elementMap, viewBox, restartKey]
  );

  const insertAndPlay = useCallback(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const svgHtml = generateSvgHtml();
    const svgEl = insertPreviewSvg({
      container,
      svgHtml,
      restartKey,
      autoplay: true,
    });
    if (svgEl) {
      svgRef.current = svgEl;
      hasInsertedRef.current = true;
      setShowPlaceholder(false);
    }
  }, [generateSvgHtml, restartKey]);

  useEffect(() => {
    if (!isCanvasPreviewMode) {
      hasInsertedRef.current = false;
      wasPlayingRef.current = false;
      setShowPlaceholder(true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const container = svgContainerRef.current;
      if (container) {
        container.innerHTML = '';
      }
      svgRef.current = null;
    }
  }, [isCanvasPreviewMode]);

  useEffect(() => {
    if (!isCanvasPreviewMode) return;

    if (isPlaying && !wasPlayingRef.current) {
      insertAndPlay();
      playStartRef.current = performance.now();
      currentTimeRef.current = 0;

      let cancelled = false;
      const tick = (ts: number) => {
        if (cancelled || !svgRef.current) return;

        const elapsed = Math.max(0, (ts - (playStartRef.current ?? ts)) / 1000);
        const nextTime = maxDuration > 0 ? Math.min(maxDuration, elapsed) : elapsed;

        if (svgRef.current.animationsPaused?.()) {
          svgRef.current.unpauseAnimations?.();
        }
        svgRef.current.setCurrentTime?.(nextTime);
        currentTimeRef.current = nextTime;

        if (ts - lastStateUpdateRef.current >= SLIDER_UPDATE_INTERVAL) {
          setAnimationTime?.(nextTime);
          lastStateUpdateRef.current = ts;
        }

        if (maxDuration > 0 && nextTime >= maxDuration) {
          setAnimationTime?.(nextTime);
          pauseCanvasPreview?.();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      wasPlayingRef.current = true;

      return () => {
        cancelled = true;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    } else if (!isPlaying && wasPlayingRef.current) {
      const svgEl = svgRef.current;
      if (svgEl) {
        svgEl.pauseAnimations?.();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      wasPlayingRef.current = false;
    }
  }, [isPlaying, isCanvasPreviewMode, maxDuration, setAnimationTime, pauseCanvasPreview, insertAndPlay]);

  const handleScrub = useCallback((value: number) => {
    const container = svgContainerRef.current;
    if (!container) return;

    const clamped = Math.max(0, Math.min(value, maxDuration || value));
    
    if (!svgRef.current) {
      const svgHtml = generateSvgHtml();
      const svgEl = insertPreviewSvg({
        container,
        svgHtml,
        restartKey,
        autoplay: false,
      });
      if (svgEl) {
        svgRef.current = svgEl;
        hasInsertedRef.current = true;
        setShowPlaceholder(false);
      }
    }

    const svgEl = svgRef.current;
    if (svgEl) {
      svgEl.setCurrentTime?.(clamped);
      svgEl.pauseAnimations?.();
    }
    
    currentTimeRef.current = clamped;
    setAnimationTime?.(clamped);
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    wasPlayingRef.current = false;
    pauseCanvasPreview?.();
  }, [maxDuration, setAnimationTime, pauseCanvasPreview, generateSvgHtml, restartKey]);

  if (!isCanvasPreviewMode) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      bg="blackAlpha.800"
      pointerEvents="auto"
    >
      <Box
        ref={svgContainerRef}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom="60px"
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {showPlaceholder && (
          <Text color="gray.400" fontSize="lg">
            Press Play to start animation preview
          </Text>
        )}
      </Box>

      <AnimationPreviewControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        maxDuration={maxDuration}
        onTogglePlay={() => (isPlaying ? pauseCanvasPreview?.() : playCanvasPreview?.())}
        onStop={() => stopCanvasPreview?.()}
        onScrub={handleScrub}
        onClose={() => stopCanvasPreview?.()}
      />
    </Box>
  );
};
