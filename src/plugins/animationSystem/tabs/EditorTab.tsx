import React, { useState, useEffect, useCallback } from 'react';
import { VStack, HStack, Text, Box, Divider } from '@chakra-ui/react';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { PanelTextInput } from '../../../ui/PanelTextInput';
import { CustomSelect } from '../../../ui/CustomSelect';
import { SliderControl } from '../../../ui/SliderControl';
import ConditionalTooltip from '../../../ui/ConditionalTooltip';
import type { CanvasElement } from '../../../types';
import type { AnimationPluginSlice, DraftAnimation, SVGAnimation, AnimationTargetPath } from '../types';
import { useCanvasStore } from '../../../store/canvasStore';
import {
  ANIMATION_TYPE_OPTIONS,
  getPresetConfig,
  type AnimationSelectValue,
} from '../animationPresets';
import { AnimationTargetSelector } from '../components';
import type { GradientsSlice } from '../../gradients/slice';
import type { PatternsSlice } from '../../patterns/slice';
import type { FilterSlice } from '../../filter/slice';
import type { MasksSlice } from '../../masks/types';
import type { MarkersSlice, MarkerDefinition } from '../../markers/slice';
import type { SymbolDefinition, SymbolPluginSlice } from '../../symbols/slice';

const LABEL_WIDTH = '70px';
const labelStyle = { fontSize: '11px', color: 'gray.600', _dark: { color: 'gray.400' } };

type FieldRowProps = {
  label: React.ReactNode;
  tooltip?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

const FieldRow: React.FC<FieldRowProps> = ({ label, tooltip, right, children }) => (
  <HStack align="center" spacing={2}>
    {tooltip ? (
      <ConditionalTooltip label={tooltip} placement="top">
        <Text {...labelStyle} minW={LABEL_WIDTH}>{label}</Text>
      </ConditionalTooltip>
    ) : (
      <Text {...labelStyle} minW={LABEL_WIDTH}>{label}</Text>
    )}
    <Box flex={1}>
      {children}
    </Box>
    {right}
  </HStack>
);

interface EditorTabProps {
  selectedElement: CanvasElement | undefined;
  editingAnimationId?: string | null;
  onSave?: () => void;
  onOpenPreview?: (draft: DraftAnimation | null) => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({
  selectedElement,
  editingAnimationId,
  onSave,
  onOpenPreview,
}) => {
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const addAnimation = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).addAnimation);
  const updateAnimation = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).updateAnimation);
  const elements = useCanvasStore((state) => state.elements);
  const gradients = useCanvasStore((state) => (state as unknown as GradientsSlice).gradients);
  const patterns = useCanvasStore((state) => (state as unknown as PatternsSlice).patterns);
  const filters = useCanvasStore((state) => (state as unknown as FilterSlice).filters);
  const importedFilters = useCanvasStore((state) => (state as unknown as FilterSlice).importedFilters);
  const masks = useCanvasStore((state) => (state as unknown as MasksSlice).masks);
  const markers = useCanvasStore((state) => (state as unknown as MarkersSlice).markers ?? []);
  const symbols = useCanvasStore((state) => (state as unknown as SymbolPluginSlice).symbols ?? []);

  const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
  const [editorType, setEditorType] = useState<'animate' | 'animateTransform' | 'animateMotion' | 'set'>('animate');
  const [editorAttribute, setEditorAttribute] = useState('opacity');
  const [editorDur, setEditorDur] = useState(2);
  const [editorFrom, setEditorFrom] = useState('0');
  const [editorTo, setEditorTo] = useState('1');
  const [editorValues, setEditorValues] = useState('');
  const [editorUseValues, setEditorUseValues] = useState(false);
  const [editorRepeat, setEditorRepeat] = useState<string>('1');
  const [editorFill, setEditorFill] = useState<'freeze' | 'remove'>('freeze');
  const [editorCalcMode, setEditorCalcMode] = useState<'linear' | 'discrete' | 'paced' | 'spline'>('linear');
  const [editorTransformType, setEditorTransformType] = useState<'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY'>('translate');
  const [editorPath, setEditorPath] = useState('M 0 0 L 100 0');
  const [editorMPath, setEditorMPath] = useState('');
  const [editorRotate, setEditorRotate] = useState<'auto' | 'auto-reverse' | string>('auto');
  const [editorBegin, setEditorBegin] = useState('0s');
  const [editorEnd, setEditorEnd] = useState('');
  const [editorRepeatDur, setEditorRepeatDur] = useState('');
  const [editorKeyTimes, setEditorKeyTimes] = useState('');
  const [editorKeySplines, setEditorKeySplines] = useState('');
  const [editorAdditive, setEditorAdditive] = useState<'replace' | 'sum'>('replace');
  const [editorAccumulate, setEditorAccumulate] = useState<'none' | 'sum'>('none');
  const [editorKeyPoints, setEditorKeyPoints] = useState('');
  const [editorTargetId, setEditorTargetId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<AnimationSelectValue>('custom');
  const [presetCategory, setPresetCategory] = useState<string>('all');
  const [presetApplyTo, setPresetApplyTo] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Target path for transitive animations (gradient, pattern, clipPath, filter)
  const [targetPath, setTargetPath] = useState<AnimationTargetPath>({
    previewElementId: selectedElement?.id,
  });

  const applyPreset = (preset: AnimationSelectValue) => {
    const config = getPresetConfig(preset);
    setSelectedPreset(preset);

    setEditorDur(config.dur ?? 2);
    setEditorRepeat(config.repeatCount === undefined ? '1' : String(config.repeatCount));
    setEditorFill((config.fill as typeof editorFill) ?? 'freeze');
    setEditorCalcMode((config.calcMode as typeof editorCalcMode) ?? 'linear');
    setEditorAdditive((config.additive as typeof editorAdditive) ?? 'replace');
    setEditorAccumulate((config.accumulate as typeof editorAccumulate) ?? 'none');
    setEditorBegin('0s');
    setEditorEnd('');
    setEditorRepeatDur('');
    setEditorKeyTimes(config.keyTimes ?? '');
    setEditorKeyPoints(config.keyPoints ?? '');
    setEditorKeySplines(config.keySplines ?? '');
    setEditorPath(config.path ?? 'M 0 0 L 100 0');
    setEditorMPath(config.mpath ?? '');
    setEditorRotate((config.rotate as typeof editorRotate) ?? 'auto');
    setEditorTransformType((config.transformType as typeof editorTransformType) ?? 'translate');

    const useValues = Boolean(config.useValues && config.values);
    setEditorUseValues(useValues);
    setEditorValues(useValues ? config.values ?? '' : '');
    setEditorFrom(config.from ?? '0');
    setEditorTo(useValues ? '' : (config.to ?? '1'));

    const type = config.type ?? 'animate';
    setEditorType(type);
    const attribute =
      type === 'animateTransform'
        ? config.attributeName ?? 'transform'
        : config.attributeName ?? 'opacity';
    setEditorAttribute(attribute);

    if (config.targetId) {
      setEditorTargetId(config.targetId);
    } else if (selectedElement?.id) {
      setEditorTargetId(selectedElement.id);
    }
  };

  useEffect(() => {
    if (editorMode === 'new' && selectedElement?.id && !editorTargetId) {
      setEditorTargetId(selectedElement.id);
      // Reset target path when element changes in new mode
      setTargetPath({ previewElementId: selectedElement.id });
    }
  }, [editorMode, editorTargetId, selectedElement?.id]);

  // Helper to find element that uses a specific def ID (gradient, pattern, filter, clipPath)
  const findElementUsingDef = useCallback((defId: string, defType: 'gradient' | 'pattern' | 'clipPath' | 'filter' | 'mask' | 'marker'): string | undefined => {
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
          return el.id;
        }
      }
      
      if (defType === 'filter' && data.filterId === defId) {
        return el.id;
      }
      
      if (defType === 'clipPath' && (data.clipPathTemplateId === defId || data.clipPathId === defId)) {
        return el.id;
      }

      if (defType === 'mask' && (data as { maskId?: string }).maskId === defId) {
        return el.id;
      }

      if (defType === 'marker' && ((data as { markerStart?: string }).markerStart === defId || (data as { markerMid?: string }).markerMid === defId || (data as { markerEnd?: string }).markerEnd === defId)) {
        return el.id;
      }
    }
    return undefined;
  }, [elements]);

  // Helper to extract target path from an animation
  const extractTargetPathFromAnimation = useCallback((anim: SVGAnimation): AnimationTargetPath => {
    const defType = anim.gradientTargetId ? 'gradient' as const
      : anim.patternTargetId ? 'pattern' as const
      : anim.clipPathTargetId ? 'clipPath' as const
      : anim.filterTargetId ? 'filter' as const
      : anim.maskTargetId ? 'mask' as const
      : anim.markerTargetId ? 'marker' as const
      : undefined;
    
    const defId = anim.gradientTargetId ?? anim.patternTargetId ?? anim.clipPathTargetId ?? anim.filterTargetId ?? anim.maskTargetId ?? anim.markerTargetId;
    
    // If the animation already has a previewElementId, use it
    // Otherwise, if it's a def-based animation, find the element that uses the def
    let previewElementId = anim.previewElementId;
    if (!previewElementId && defType && defId) {
      previewElementId = findElementUsingDef(defId, defType);
    }
    // Fallback to targetElementId only if it's a direct element (not a def ID)
    if (!previewElementId && !defType) {
      previewElementId = anim.targetElementId;
    }
    
    return {
      previewElementId,
      defType,
      defId,
      stopIndex: anim.stopIndex,
      filterPrimitiveIndex: anim.filterPrimitiveIndex,
    };
  }, [findElementUsingDef]);

  // Load animation when editingAnimationId is provided from parent
  useEffect(() => {
    if (editingAnimationId) {
      const anim = animations.find((a) => a.id === editingAnimationId);
      if (anim) {
        setEditorMode('edit');
        setEditingId(anim.id);
        setEditorTargetId(anim.targetElementId);
        setEditorType(anim.type as typeof editorType);
        setEditorAttribute(anim.attributeName ?? 'opacity');
        setEditorDur(parseFloat(String(anim.dur ?? '2s')) || 2);
        setEditorFrom(anim.from !== undefined ? String(anim.from) : '0');
        setEditorTo(anim.to !== undefined ? String(anim.to) : '1');
        setEditorValues(anim.values ?? '');
        setEditorUseValues(Boolean(anim.values));
        setEditorRepeat(String(anim.repeatCount ?? '1'));
        setEditorFill((anim.fill as 'freeze' | 'remove') ?? 'freeze');
        setEditorCalcMode((anim.calcMode as 'linear' | 'discrete' | 'paced' | 'spline') ?? 'linear');
        setEditorTransformType((anim.transformType as 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY') ?? 'translate');
        setEditorPath(anim.path ?? 'M 0 0 L 100 0');
        setEditorMPath(anim.mpath ?? '');
        setEditorRotate((anim.rotate as 'auto' | 'auto-reverse' | string) ?? 'auto');
        setEditorBegin(anim.begin ?? '0s');
        setEditorEnd(anim.end ?? '');
        setEditorRepeatDur(anim.repeatDur ?? '');
        setEditorKeyTimes(anim.keyTimes ?? '');
        setEditorKeySplines(anim.keySplines ?? '');
        setEditorAdditive((anim.additive as 'replace' | 'sum') ?? 'replace');
        setEditorAccumulate((anim.accumulate as 'none' | 'sum') ?? 'none');
        setEditorKeyPoints(anim.keyPoints ?? '');
        // Extract and set target path for transitive animations
        setTargetPath(extractTargetPathFromAnimation(anim));
      }
    } else if (editingAnimationId === null) {
      // Reset to new animation mode when explicitly set to null
      setEditorMode('new');
      setEditingId(null);
      // Reset target path
      setTargetPath({ previewElementId: selectedElement?.id });
    }
  }, [editingAnimationId, animations, extractTargetPathFromAnimation, selectedElement?.id]);

  const handleLoadAnimation = (anim: SVGAnimation) => {
    setEditorMode('edit');
    setEditingId(anim.id);
    setEditorTargetId(anim.targetElementId);
    setEditorType(anim.type as typeof editorType);
    setEditorAttribute(anim.attributeName ?? 'opacity');
    setEditorDur(parseFloat(String(anim.dur ?? '2s')) || 2);
    setEditorFrom(anim.from !== undefined ? String(anim.from) : '0');
    setEditorTo(anim.to !== undefined ? String(anim.to) : '1');
    setEditorValues(anim.values ?? '');
    setEditorUseValues(Boolean(anim.values));
    setEditorRepeat(String(anim.repeatCount ?? '1'));
    setEditorFill((anim.fill as 'freeze' | 'remove') ?? 'freeze');
    setEditorCalcMode((anim.calcMode as 'linear' | 'discrete' | 'paced' | 'spline') ?? 'linear');
    setEditorTransformType((anim.transformType as typeof editorTransformType) ?? 'translate');
    setEditorPath(anim.path ?? 'M 0 0 L 100 0');
    setEditorMPath(anim.mpath ?? '');
    setEditorRotate((anim.rotate as typeof editorRotate) ?? 'auto');
    setEditorBegin(anim.begin ?? '0s');
    setEditorEnd(anim.end ?? '');
    setEditorRepeatDur(anim.repeatDur ?? '');
    setEditorKeyTimes(anim.keyTimes ?? '');
    setEditorKeySplines(anim.keySplines ?? '');
    setEditorAdditive((anim.additive as typeof editorAdditive) ?? 'replace');
    setEditorAccumulate((anim.accumulate as typeof editorAccumulate) ?? 'none');
    setEditorKeyPoints(anim.keyPoints ?? '');
    // Extract and set target path for transitive animations
    setTargetPath(extractTargetPathFromAnimation(anim));
  };

  const handleSaveAnimation = () => {
    // Determine the target ID: use def ID if targeting a def, otherwise element ID
    const effectiveTargetId = targetPath.defId 
      ?? (editorTargetId || (editingId ? animations.find((a) => a.id === editingId)?.targetElementId : selectedElement?.id));
    if (!effectiveTargetId) return;
    const targetIdStr = String(effectiveTargetId);

    // Build def target IDs based on targetPath
    const defTargets: Partial<SVGAnimation> = {};
    if (targetPath.defType === 'gradient' && targetPath.defId) {
      defTargets.gradientTargetId = targetPath.defId;
      defTargets.stopIndex = targetPath.stopIndex;
    } else if (targetPath.defType === 'pattern' && targetPath.defId) {
      defTargets.patternTargetId = targetPath.defId;
    } else if (targetPath.defType === 'clipPath' && targetPath.defId) {
      defTargets.clipPathTargetId = targetPath.defId;
    } else if (targetPath.defType === 'filter' && targetPath.defId) {
      defTargets.filterTargetId = targetPath.defId;
      defTargets.filterPrimitiveIndex = targetPath.filterPrimitiveIndex;
    }

    const base: Partial<SVGAnimation> = {
      targetElementId: targetIdStr,
      previewElementId: targetPath.previewElementId,
      ...defTargets,
      dur: `${editorDur}s`,
      repeatCount: editorRepeat === 'indefinite' ? 'indefinite' : parseFloat(editorRepeat) || 1,
      fill: editorFill,
      calcMode: editorCalcMode,
      begin: editorBegin,
      end: editorEnd || undefined,
      repeatDur: editorRepeatDur || undefined,
      keyTimes: editorKeyTimes || undefined,
      keySplines: editorCalcMode === 'spline' && editorKeySplines ? editorKeySplines : undefined,
    };

    let payload: SVGAnimation;

    if (editorType === 'animate') {
      payload = {
        id: editingId ?? undefined,
        type: 'animate',
        attributeName: editorAttribute,
        ...base,
        additive: editorAdditive,
        accumulate: editorAccumulate,
        ...(editorUseValues
          ? { values: editorValues, from: undefined, to: undefined }
          : { from: editorFrom, to: editorTo }),
      } as SVGAnimation;
    } else if (editorType === 'animateTransform') {
      // Use gradientTransform for gradient-targeted animations, patternTransform for pattern-targeted
      const transformAttributeName = targetPath.defType === 'gradient'
        ? 'gradientTransform'
        : targetPath.defType === 'pattern'
          ? 'patternTransform'
          : 'transform';
      payload = {
        id: editingId ?? undefined,
        type: 'animateTransform',
        attributeName: transformAttributeName,
        transformType: editorTransformType,
        ...base,
        ...(editorUseValues
          ? { values: editorValues, from: undefined, to: undefined }
          : { from: editorFrom, to: editorTo }),
      } as SVGAnimation;
    } else if (editorType === 'animateMotion') {
      payload = {
        id: editingId ?? undefined,
        type: 'animateMotion',
        ...base,
        path: editorMPath ? undefined : editorPath,
        mpath: editorMPath || undefined,
        rotate: editorRotate as SVGAnimation['rotate'],
        keyPoints: editorKeyPoints || undefined,
      } as SVGAnimation;
    } else {
      payload = {
        id: editingId ?? undefined,
        type: 'set',
        attributeName: editorAttribute,
        to: editorTo,
        ...base,
      } as SVGAnimation;
    }

    if (editorMode === 'edit' && editingId) {
      updateAnimation?.(editingId, payload);
    } else {
      addAnimation?.(payload);
    }
    setEditorMode('new');
    setEditingId(null);
    onSave?.();
  };

  const buildAnimationPayload = useCallback((): DraftAnimation | null => {
    // Determine the target ID: use def ID if targeting a def, otherwise element ID
    const effectiveTargetId = targetPath.defId 
      ?? (editorTargetId || (editingId ? animations.find((a) => a.id === editingId)?.targetElementId : selectedElement?.id));
    if (!effectiveTargetId) return null;
    
    const targetIdStr = String(effectiveTargetId);

    // Build def target IDs based on targetPath
    const defTargets: Partial<SVGAnimation> = {};
    if (targetPath.defType === 'gradient' && targetPath.defId) {
      defTargets.gradientTargetId = targetPath.defId;
      defTargets.stopIndex = targetPath.stopIndex;
    } else if (targetPath.defType === 'pattern' && targetPath.defId) {
      defTargets.patternTargetId = targetPath.defId;
    } else if (targetPath.defType === 'clipPath' && targetPath.defId) {
      defTargets.clipPathTargetId = targetPath.defId;
    } else if (targetPath.defType === 'filter' && targetPath.defId) {
      defTargets.filterTargetId = targetPath.defId;
      defTargets.filterPrimitiveIndex = targetPath.filterPrimitiveIndex;
    }

    const repeatCount = editorRepeat === 'indefinite' ? 'indefinite' : parseFloat(editorRepeat) || 1;
    const base: Partial<SVGAnimation> = {
      targetElementId: targetIdStr,
      previewElementId: targetPath.previewElementId,
      ...defTargets,
      dur: `${editorDur}s`,
      repeatCount,
      fill: editorFill,
      calcMode: editorCalcMode,
      begin: editorBegin,
      end: editorEnd || undefined,
      repeatDur: editorRepeatDur || undefined,
      keyTimes: editorKeyTimes || undefined,
      keySplines: editorCalcMode === 'spline' && editorKeySplines ? editorKeySplines : undefined,
    };

    if (editorType === 'animate') {
      return {
        id: editingId ?? undefined,
        type: 'animate',
        targetElementId: targetIdStr,
        attributeName: editorAttribute,
        ...base,
        additive: editorAdditive,
        accumulate: editorAccumulate,
        ...(editorUseValues
          ? { values: editorValues, from: undefined, to: undefined }
          : { from: editorFrom, to: editorTo }),
      };
    }

    if (editorType === 'animateTransform') {
      return {
        id: editingId ?? undefined,
        type: 'animateTransform',
        targetElementId: targetIdStr,
        attributeName: 'transform',
        transformType: editorTransformType,
        ...base,
        ...(editorUseValues
          ? { values: editorValues, from: undefined, to: undefined }
          : { from: editorFrom, to: editorTo }),
      };
    }

    if (editorType === 'animateMotion') {
      return {
        id: editingId ?? undefined,
        type: 'animateMotion',
        targetElementId: targetIdStr,
        ...base,
        path: editorMPath ? undefined : editorPath,
        mpath: editorMPath || undefined,
        rotate: editorRotate as SVGAnimation['rotate'],
        keyPoints: editorKeyPoints || undefined,
      };
    }

    return {
      id: editingId ?? undefined,
      type: 'set',
      targetElementId: targetIdStr,
      attributeName: editorAttribute,
      to: editorTo,
      ...base,
    };
  }, [
    animations,
    editorAccumulate,
    editorAdditive,
    editorAttribute,
    editorBegin,
    editorCalcMode,
    editorDur,
    editorEnd,
    editorFill,
    editorFrom,
    editorKeyPoints,
    editorKeySplines,
    editorKeyTimes,
    editorMPath,
    editorPath,
    editorRepeat,
    editorRepeatDur,
    editorRotate,
    editorTargetId,
    editorTo,
    editorTransformType,
    editorType,
    editorUseValues,
    editorValues,
    editingId,
    selectedElement?.id,
    targetPath,
  ]);

  return (
    <VStack spacing={2} align="stretch">
      <FieldRow label="Preview" tooltip="Open the Preview tab without interrupting editing">
        <PanelStyledButton
          size="sm"
          width="100%"
          onClick={() => onOpenPreview?.(buildAnimationPayload())}
        >
          Open Preview
        </PanelStyledButton>
      </FieldRow>
      <FieldRow label="Action">
        <CustomSelect
          value={editingId ?? ''}
          onChange={(value) => {
            const anim = animations.find((a) => a.id === value);
            if (anim) {
              handleLoadAnimation(anim);
            } else {
              setEditorMode('new');
              setEditingId(null);
              setEditorTargetId(selectedElement?.id ?? '');
            }
          }}
          options={[
            { value: '', label: 'New animation' },
            ...animations.map((anim) => ({
              value: anim.id,
              label: `Edit ${anim.type} • ${anim.attributeName ?? anim.transformType ?? anim.id.slice(-6)}`,
            })),
          ]}
          size="sm"
        />
      </FieldRow>

      {editorMode === 'new' && (
        <>
          <FieldRow label="Category" tooltip="Filter presets by category">
            <CustomSelect
              value={presetCategory}
              onChange={(val) => setPresetCategory(val)}
              options={[
                { value: 'all', label: 'All' },
                ...Array.from(new Set(ANIMATION_TYPE_OPTIONS.map((opt) => opt.category).filter(Boolean))).map((cat) => ({
                  value: cat as string,
                  label: cat as string,
                })),
              ]}
              size="sm"
            />
          </FieldRow>
          <FieldRow label="ApplyTo" tooltip="Filter presets by target type">
            <CustomSelect
              value={presetApplyTo}
              onChange={(val) => setPresetApplyTo(val)}
              options={[
                { value: 'all', label: 'All' },
                ...Array.from(
                  new Set(
                    ANIMATION_TYPE_OPTIONS
                      .flatMap((opt) => opt.applyTo ?? [])
                      .filter(Boolean)
                  )
                ).map((target) => ({
                  value: target as string,
                  label: target as string,
                })),
              ]}
              size="sm"
            />
          </FieldRow>
          <FieldRow label="Preset" tooltip="Quick presets for common animation types">
            <CustomSelect
              value={selectedPreset}
              onChange={(val) => {
                if (!val) return;
                applyPreset(val as AnimationSelectValue);
              }}
              options={ANIMATION_TYPE_OPTIONS.filter((opt) => {
                const byCategory = presetCategory === 'all' || opt.category === presetCategory;
                const byApplyTo = presetApplyTo === 'all' || (opt.applyTo ?? []).includes(presetApplyTo);
                return byCategory && byApplyTo;
              }).map((opt, idx) => ({
                value: opt.value,
                label: `${idx + 1}. ${opt.label}`,
              }))}
              size="sm"
              searchable
              placeholder="Select a preset…"
            />
          </FieldRow>
        </>
      )}

      <FieldRow label="Target" tooltip="Element ID to animate">
        <PanelTextInput
          value={editorTargetId}
          onChange={(val) => setEditorTargetId(val)}
          placeholder={selectedElement ? `${selectedElement.id}` : 'Element id'}
          width="100%"
        />
      </FieldRow>

      {/* Target selector for transitive animations (gradients, patterns, filters, clipPaths) */}
      <AnimationTargetSelector
        selectedElement={selectedElement}
        elements={elements}
        gradients={gradients}
        patterns={patterns}
        filters={filters}
        importedFilters={importedFilters}
        masks={masks}
        markers={markers as MarkerDefinition[] | undefined}
        symbols={symbols as SymbolDefinition[] | undefined}
        value={targetPath}
        onChange={setTargetPath}
        labelWidth={LABEL_WIDTH}
      />

      <Divider my={1} />

      <FieldRow label="Type">
        <CustomSelect
          value={editorType}
          onChange={(value) => setEditorType(value as typeof editorType)}
          options={[
            { value: 'animate', label: 'Animate' },
            { value: 'animateTransform', label: 'Transform' },
            { value: 'animateMotion', label: 'Motion' },
            { value: 'set', label: 'Set' },
          ]}
          size="sm"
        />
      </FieldRow>

      {editorType !== 'animateMotion' && (
        <FieldRow label="Attribute">
          <PanelTextInput value={editorAttribute} onChange={(val) => setEditorAttribute(val)} width="100%" />
        </FieldRow>
      )}

      {editorType === 'animateTransform' && (
        <FieldRow label="Transform">
          <CustomSelect
            value={editorTransformType}
            onChange={(value) => setEditorTransformType(value as typeof editorTransformType)}
            options={[
              { value: 'translate', label: 'Translate' },
              { value: 'scale', label: 'Scale' },
              { value: 'rotate', label: 'Rotate' },
              { value: 'skewX', label: 'Skew X' },
              { value: 'skewY', label: 'Skew Y' },
            ]}
            size="sm"
          />
        </FieldRow>
      )}

      {editorType === 'animateMotion' && (
        <>
          <FieldRow label="Path" tooltip="SVG path data for motion">
            <PanelTextInput value={editorPath} onChange={(val) => setEditorPath(val)} width="100%" />
          </FieldRow>
          <FieldRow label="mpath" tooltip="ID of path element to use (optional)">
            <PanelTextInput value={editorMPath} onChange={(val) => setEditorMPath(val)} width="100%" placeholder="Path element ID" />
          </FieldRow>
          <FieldRow label="Rotate">
            <CustomSelect
              value={String(editorRotate)}
              onChange={(value) => setEditorRotate(value as typeof editorRotate)}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'auto-reverse', label: 'Auto reverse' },
                { value: '0', label: '0°' },
                { value: '90', label: '90°' },
                { value: '180', label: '180°' },
                { value: '270', label: '270°' },
              ]}
              size="sm"
            />
          </FieldRow>
          <FieldRow label="Key pts" tooltip="e.g. 0;0.5;1">
            <PanelTextInput value={editorKeyPoints} onChange={(val) => setEditorKeyPoints(val)} width="100%" />
          </FieldRow>
        </>
      )}

      <FieldRow label="Duration">
        <SliderControl
          value={editorDur}
          min={0.1}
          max={20}
          step={0.1}
          onChange={(val) => setEditorDur(val)}
          formatter={(v) => `${v.toFixed(1)}s`}
          valueWidth="45px"
          marginBottom="0"
        />
      </FieldRow>

      <FieldRow label="RepeatDur" tooltip="Max repeat duration">
        <PanelTextInput value={editorRepeatDur} onChange={(val) => setEditorRepeatDur(val)} width="100%" />
      </FieldRow>

      <FieldRow
        label="Repeat"
        tooltip="Number or 'indefinite'"
        right={(
          <PanelStyledButton size="xs" onClick={() => setEditorRepeat('indefinite')}>
            ∞
          </PanelStyledButton>
        )}
      >
        <PanelTextInput value={editorRepeat} onChange={(val) => setEditorRepeat(val)} width="100%" />
      </FieldRow>

      <FieldRow label="Begin">
        <PanelTextInput value={editorBegin} onChange={(val) => setEditorBegin(val)} width="100%" placeholder="0s" />
      </FieldRow>

      <FieldRow label="End">
        <PanelTextInput value={editorEnd} onChange={(val) => setEditorEnd(val)} width="100%" />
      </FieldRow>

      <FieldRow label="Fill">
        <CustomSelect
          value={editorFill}
          onChange={(value) => setEditorFill(value as typeof editorFill)}
          options={[
            { value: 'freeze', label: 'Freeze' },
            { value: 'remove', label: 'Remove' },
          ]}
          size="sm"
        />
      </FieldRow>

      <FieldRow label="CalcMode">
        <CustomSelect
          value={editorCalcMode}
          onChange={(value) => setEditorCalcMode(value as typeof editorCalcMode)}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'discrete', label: 'Discrete' },
            { value: 'paced', label: 'Paced' },
            { value: 'spline', label: 'Spline' },
          ]}
          size="sm"
        />
      </FieldRow>

      <FieldRow label="keyTimes" tooltip="e.g. 0;0.5;1">
        <PanelTextInput value={editorKeyTimes} onChange={(val) => setEditorKeyTimes(val)} width="100%" />
      </FieldRow>

      {editorCalcMode === 'spline' && (
        <FieldRow label="keySplines" tooltip="Bezier control points">
          <PanelTextInput value={editorKeySplines} onChange={(val) => setEditorKeySplines(val)} width="100%" />
        </FieldRow>
      )}

      {editorType !== 'animateMotion' && (
        <>
          {['animate', 'animateTransform'].includes(editorType) && (
            <>
              <FieldRow label="Additive">
                <CustomSelect
                  value={editorAdditive}
                  onChange={(value) => setEditorAdditive(value as typeof editorAdditive)}
                  options={[
                    { value: 'replace', label: 'Replace' },
                    { value: 'sum', label: 'Sum' },
                  ]}
                  size="sm"
                />
              </FieldRow>
              <FieldRow label="Accumulate">
                <CustomSelect
                  value={editorAccumulate}
                  onChange={(value) => setEditorAccumulate(value as typeof editorAccumulate)}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sum', label: 'Sum' },
                  ]}
                  size="sm"
                />
              </FieldRow>
            </>
          )}

          <FieldRow label="From">
            <PanelTextInput value={editorFrom} onChange={(val) => setEditorFrom(val)} width="100%" />
          </FieldRow>

          <FieldRow label="To">
            <PanelTextInput value={editorTo} onChange={(val) => setEditorTo(val)} width="100%" />
          </FieldRow>

          <FieldRow
            label="Values"
            tooltip="Use semicolon to separate values"
            right={(
              <PanelStyledButton size="xs" onClick={() => setEditorUseValues((v) => !v)}>
                {editorUseValues ? '✓' : 'Use'}
              </PanelStyledButton>
            )}
          >
            <PanelTextInput value={editorValues} onChange={(val) => setEditorValues(val)} width="100%" />
          </FieldRow>
        </>
      )}

      <PanelStyledButton onClick={handleSaveAnimation} width="100%">
        {editorMode === 'edit' ? 'Update Animation' : 'Create Animation'}
      </PanelStyledButton>
    </VStack>
  );
};
