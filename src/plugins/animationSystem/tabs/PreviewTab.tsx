import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VStack, HStack, Text, Box, Badge } from '@chakra-ui/react';
import type { CanvasElement } from '../../../types';
import { useCanvasStore } from '../../../store/canvasStore';
import type { AnimationPluginSlice, DraftAnimation, SVGAnimation } from '../types';
import { CustomSelect } from '../../../ui/CustomSelect';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { AnimationPreviewPanel } from './AnimationPreviewPanel';

const resolvePreviewSource = (mode?: 'animation' | 'draft', draft?: DraftAnimation | null): 'animation' | 'draft' => {
  if (mode === 'draft' && !draft) return 'animation';
  if (mode === 'draft' && draft) return 'draft';
  if (mode === 'animation') return 'animation';
  return draft ? 'draft' : 'animation';
};

type PreviewTabProps = {
  selectedElement?: CanvasElement;
  selectedAnimationId?: string | null;
  draftAnimation?: DraftAnimation | null;
  mode?: 'animation' | 'draft';
};

export const PreviewTab: React.FC<PreviewTabProps> = ({
  selectedElement,
  selectedAnimationId,
  draftAnimation,
  mode,
}) => {
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const elements = useCanvasStore((state) => state.elements);

  const [animationId, setAnimationId] = useState<string | null>(selectedAnimationId ?? null);
  const [activeSource, setActiveSource] = useState<'animation' | 'draft'>(resolvePreviewSource(mode, draftAnimation));
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    setActiveSource(resolvePreviewSource(mode, draftAnimation));
  }, [mode, draftAnimation]);

  useEffect(() => {
    setAnimationId(selectedAnimationId ?? null);
  }, [selectedAnimationId]);

  useEffect(() => {
    if (animationId && !animations.find((a) => a.id === animationId)) {
      setAnimationId(null);
    }
  }, [animationId, animations]);

  useEffect(() => {
    setPreviewVersion(0);
  }, [animationId, draftAnimation, activeSource]);

  const selectedAnimation = useMemo<SVGAnimation | null>(
    () => animations.find((a) => a.id === animationId) ?? null,
    [animations, animationId]
  );

  const effectivePreview = useMemo<DraftAnimation | SVGAnimation | null>(() => {
    if (activeSource === 'draft' && draftAnimation) return draftAnimation;
    if (activeSource === 'animation' && selectedAnimation) return selectedAnimation;
    return draftAnimation ?? selectedAnimation ?? null;
  }, [activeSource, draftAnimation, selectedAnimation]);

  // Helper to find element that uses a specific def ID (gradient, pattern, filter, clipPath)
  const findElementUsingDef = useCallback((defId: string, defType: 'gradient' | 'pattern' | 'clipPath' | 'filter' | 'mask' | 'marker' | 'symbol'): CanvasElement | undefined => {
    for (const el of elements) {
      const data = el.data as Record<string, unknown>;
      
      if (defType === 'gradient' || defType === 'pattern') {
        const extractPaintId = (paint: unknown): string | undefined => {
          if (typeof paint !== 'string') return undefined;
          const match = paint.match(/url\(#([^)]+)\)/);
          return match ? match[1] : undefined;
        };
        const fillId = extractPaintId(data.fillColor);
        const strokeId = extractPaintId(data.strokeColor);
        if (fillId === defId || strokeId === defId) {
          return el;
        }
      }
      
      if (defType === 'filter' && data.filterId === defId) {
        return el;
      }
      
      if (defType === 'clipPath' && (data.clipPathTemplateId === defId || data.clipPathId === defId)) {
        return el;
      }

      if (defType === 'marker') {
        const markerStart = (data as { markerStart?: string }).markerStart;
        const markerMid = (data as { markerMid?: string }).markerMid;
        const markerEnd = (data as { markerEnd?: string }).markerEnd;
        if (markerStart === defId || markerMid === defId || markerEnd === defId) {
          return el;
        }
      }

      if (defType === 'symbol' && (data as { symbolId?: string }).symbolId === defId) {
        return el;
      }
    }
    return undefined;
  }, [elements]);

  // Determine if this is a transitive animation (def-based)
  const isTransitiveAnimation = useMemo(() => {
    const anim = effectivePreview ?? selectedAnimation;
    return Boolean(
      anim?.gradientTargetId || 
      anim?.patternTargetId || 
      anim?.clipPathTargetId || 
      anim?.filterTargetId ||
      anim?.maskTargetId ||
      anim?.markerTargetId
    );
  }, [effectivePreview, selectedAnimation]);

  const previewTargetElement = useMemo<CanvasElement | undefined>(() => {
    const anim = effectivePreview ?? selectedAnimation;
    
    // For transitive animations (gradient, pattern, clipPath, filter), use previewElementId
    // which points to the element that uses the def, allowing the animation effect to be visible
    const previewId = anim?.previewElementId;
    
    // If previewElementId is set, use it directly
    if (previewId) {
      const found = elements.find((el) => el.id === previewId);
      if (found) return found;
    }
    
    // For transitive animations, find the element that uses the def
    if (anim?.gradientTargetId) {
      const found = findElementUsingDef(anim.gradientTargetId, 'gradient');
      if (found) return found;
    }
    if (anim?.patternTargetId) {
      const found = findElementUsingDef(anim.patternTargetId, 'pattern');
      if (found) return found;
    }
    if (anim?.clipPathTargetId) {
      const found = findElementUsingDef(anim.clipPathTargetId, 'clipPath');
      if (found) return found;
    }
    if (anim?.filterTargetId) {
      const found = findElementUsingDef(anim.filterTargetId, 'filter');
      if (found) return found;
    }
    if (anim?.maskTargetId) {
      const found = findElementUsingDef(anim.maskTargetId, 'mask');
      if (found) return found;
    }
    if (anim?.markerTargetId) {
      const found = findElementUsingDef(anim.markerTargetId, 'marker');
      if (found) return found;
    }
    
    // For direct animations, use targetElementId
    const targetId = anim?.targetElementId;
    if (targetId) {
      const found = elements.find((el) => el.id === targetId);
      if (found) return found;
    }
    
    // Fallback to selected element
    return selectedElement;
  }, [effectivePreview, selectedAnimation, elements, selectedElement, findElementUsingDef]);

  const handleSelectAnimation = useCallback((value: string) => {
    const nextId = value || null;
    setAnimationId(nextId);
    setActiveSource('animation');
    setPreviewVersion(0);
  }, []);

  const handleUseDraft = useCallback(() => {
    if (!draftAnimation) return;
    setActiveSource('draft');
    setPreviewVersion(0);
  }, [draftAnimation]);

  const getDraftAnimation = useCallback(() => effectivePreview ?? null, [effectivePreview]);

  const sourceLabel = activeSource === 'draft' ? 'Editor draft' : 'Saved animation';

  // Generate descriptive target info for transitive animations
  const targetInfo = useMemo(() => {
    const anim = effectivePreview ?? selectedAnimation;
    if (!anim) return previewTargetElement?.id ?? 'no element selected';
    
    const parts: string[] = [];
    if (previewTargetElement?.id) {
      parts.push(previewTargetElement.id);
    }
    
    if (anim.gradientTargetId) {
      parts.push(`→ gradient:${anim.gradientTargetId}`);
      if (anim.stopIndex !== undefined) {
        parts.push(`[stop ${anim.stopIndex}]`);
      }
    } else if (anim.patternTargetId) {
      parts.push(`→ pattern:${anim.patternTargetId}`);
    } else if (anim.clipPathTargetId) {
      parts.push(`→ clipPath:${anim.clipPathTargetId}`);
    } else if (anim.maskTargetId) {
      parts.push(`→ mask:${anim.maskTargetId}`);
    } else if (anim.markerTargetId) {
      parts.push(`→ marker:${anim.markerTargetId}`);
    } else if (anim.filterTargetId) {
      parts.push(`→ filter:${anim.filterTargetId}`);
      if (anim.filterPrimitiveIndex !== undefined) {
        parts.push(`[primitive ${anim.filterPrimitiveIndex}]`);
      }
    }
    
    return parts.join(' ');
  }, [effectivePreview, selectedAnimation, previewTargetElement?.id]);

  return (
    <VStack spacing={3} align="stretch">
      <HStack spacing={2} align="center">
        <Box flex={1}>
          <CustomSelect
            value={animationId ?? ''}
            onChange={handleSelectAnimation}
            options={[
              { value: '', label: 'Select an animation' },
              ...animations.map((anim) => ({
                value: anim.id,
                label: `${anim.type} • ${anim.attributeName ?? anim.transformType ?? anim.id.slice(-6)}`,
              })),
            ]}
            size="sm"
          />
        </Box>
        <Badge colorScheme={activeSource === 'draft' ? 'purple' : 'gray'}>{sourceLabel}</Badge>
        <PanelStyledButton size="sm" onClick={handleUseDraft} isDisabled={!draftAnimation}>
          Use editor draft
        </PanelStyledButton>
      </HStack>
      <HStack fontSize="xs" color="gray.500" spacing={1}>
        <Text>Target:</Text>
        <Text isTruncated>{targetInfo}</Text>
        {isTransitiveAnimation && (
          <Badge colorScheme="purple" fontSize="9px" ml={1}>transitive</Badge>
        )}
      </HStack>
      <AnimationPreviewPanel
        elements={elements}
        baseAnimations={animations}
        draftAnimation={null}
        getDraftAnimation={getDraftAnimation}
        previewVersion={previewVersion}
        onPreviewActivated={() => setPreviewVersion((v) => v + 1)}
        selectedElement={previewTargetElement}
      />
    </VStack>
  );
};
