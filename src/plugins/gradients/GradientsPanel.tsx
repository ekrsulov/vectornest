import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VStack,
  Box,
  Input,
  Flex,
  HStack,
  Text,
} from '@chakra-ui/react';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { RefreshCcw, Shuffle, X } from 'lucide-react';
import type { CanvasStore } from '../../store/canvasStore';
import type { GradientDef, GradientsSlice, GradientStop } from './slice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { ToggleButton } from '../../ui/ToggleButton';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { GradientItemCard } from './GradientItemCard';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgPreview } from '../../ui/SvgPreview';
import { coordinatesFromAngle } from './linearGradientUtils';


const selectGradientsPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & GradientsSlice;
  return {
    gradients: slice.gradients ?? EMPTY_GRADIENTS,
    addGradient: slice.addGradient,
    updateGradient: slice.updateGradient,
    removeGradient: slice.removeGradient,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

const EMPTY_GRADIENTS: GradientDef[] = [];

const normalizeStops = (raw: GradientStop[]) => {
  if (!raw.length) return raw;
  const sorted = raw
    .map((s) => ({ ...s, offset: Math.min(100, Math.max(0, s.offset)) }))
    .sort((a, b) => a.offset - b.offset);
  sorted[0].offset = 0;
  sorted[sorted.length - 1].offset = 100;
  return sorted;
};

const parseHexColor = (input: string): [number, number, number] | null => {
  const normalized = input.trim();
  const shortMatch = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('').map((ch) => parseInt(ch + ch, 16));
    return [r, g, b];
  }
  const longMatch = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!longMatch) return null;
  const value = longMatch[1];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const interpolateHexColor = (from: string, to: string, t: number): string => {
  const fromRgb = parseHexColor(from);
  const toRgb = parseHexColor(to);
  if (!fromRgb || !toRgb) return from;
  const channel = (index: 0 | 1 | 2) =>
    Math.round(fromRgb[index] + (toRgb[index] - fromRgb[index]) * t);
  return `#${[channel(0), channel(1), channel(2)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

export const GradientsPanel: React.FC = () => {
  const {
    gradients,
    addGradient,
    updateGradient,
    removeGradient,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectGradientsPanelState);

  const [editingGradientId, setEditingGradientId] = useState<string | null>(null);
  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);

  // When a gradient is selected from search, open it, scroll the details into view and trigger flash
  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setEditingGradientId(selectedFromSearch);
    // Scroll the details section into view
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    // Clear the selection so it doesn't re-trigger
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);
  const [type, setType] = useState<GradientDef['type']>('linear');
  const [gradientUnits, setGradientUnits] = useState<'userSpaceOnUse' | 'objectBoundingBox'>('objectBoundingBox');
  const [angle, setAngle] = useState(90);
  const [x1, setX1] = useState(0);
  const [y1, setY1] = useState(0);
  const [x2, setX2] = useState(100);
  const [y2, setY2] = useState(0);
  const [cx, setCx] = useState(50);
  const [cy, setCy] = useState(50);
  const [r, setR] = useState(70);
  const [fx, setFx] = useState(50);
  const [fy, setFy] = useState(50);
  const [stops, setStops] = useState<GradientStop[]>([
    { offset: 0, color: '#ff7f50' },
    { offset: 100, color: '#1e3a8a' },
  ]);
  const gradientTrackRef = React.useRef<HTMLDivElement | null>(null);
  const [draggingStopIndex, setDraggingStopIndex] = useState<number | null>(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingGradientId && gradients.length) {
      setEditingGradientId(gradients[0].id);
    } else if (editingGradientId && !gradients.find((gradient) => gradient.id === editingGradientId)) {
      setEditingGradientId(gradients[0]?.id ?? null);
    }
  }, [editingGradientId, gradients]);

  const editingGradient = gradients.find((gradient) => gradient.id === editingGradientId) ?? null;

  useEffect(() => {
    if (editingGradient) {
      setType(editingGradient.type);
      setGradientUnits(editingGradient.gradientUnits ?? 'objectBoundingBox');
      setAngle(editingGradient.angle ?? 90);
      setX1(editingGradient.x1 ?? 0);
      setY1(editingGradient.y1 ?? 0);
      setX2(editingGradient.x2 ?? 100);
      setY2(editingGradient.y2 ?? 0);
      setCx(editingGradient.cx ?? 50);
      setCy(editingGradient.cy ?? 50);
      setR(editingGradient.r ?? 70);
      setFx(editingGradient.fx ?? 50);
      setFy(editingGradient.fy ?? 50);
      setStops(editingGradient.stops ?? []);
      setDraggingStopIndex(null);
      setSelectedStopIndex(null);
      setEditorMessage(null);
    }
  }, [editingGradient]);

  useEffect(() => {
    if (!editorMessage) return;
    const timeoutId = window.setTimeout(() => setEditorMessage(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [editorMessage]);

  const getOffsetFromClientX = useCallback((clientX: number) => {
    const node = gradientTrackRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const relative = ((clientX - rect.left) / rect.width) * 100;
    return Math.round(Math.max(0, Math.min(100, relative)));
  }, []);

  const updateStopOffsetFromClientX = useCallback((index: number, clientX: number) => {
    const nextOffset = getOffsetFromClientX(clientX);
    if (nextOffset === null) return;
    setStops((previousStops) => {
      if (!previousStops[index]) return previousStops;
      const nextStops = [...previousStops];
      nextStops[index] = { ...nextStops[index], offset: nextOffset };
      return nextStops;
    });
  }, [getOffsetFromClientX]);

  useEffect(() => {
    if (draggingStopIndex === null) return;
    const handlePointerMove = (event: PointerEvent) => {
      updateStopOffsetFromClientX(draggingStopIndex, event.clientX);
    };
    const handlePointerUp = () => {
      setDraggingStopIndex(null);
      setStops((previousStops) => normalizeStops(previousStops.slice()));
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingStopIndex, updateStopOffsetFromClientX]);

  const inferColorAtOffset = useCallback((sourceStops: GradientStop[], targetOffset: number): string => {
    if (!sourceStops.length) return '#ffffff';
    const ordered = sourceStops.slice().sort((a, b) => a.offset - b.offset);
    if (targetOffset <= ordered[0].offset) return ordered[0].color;
    if (targetOffset >= ordered[ordered.length - 1].offset) return ordered[ordered.length - 1].color;
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = ordered[index];
      const right = ordered[index + 1];
      if (targetOffset >= left.offset && targetOffset <= right.offset) {
        const range = Math.max(1, right.offset - left.offset);
        const interpolation = (targetOffset - left.offset) / range;
        return interpolateHexColor(left.color, right.color, interpolation);
      }
    }
    return ordered[ordered.length - 1].color;
  }, []);

  const addStopAtOffset = useCallback((offset: number) => {
    setStops((previousStops) => {
      const nextColor = inferColorAtOffset(previousStops, offset);
      return normalizeStops([...previousStops, { offset, color: nextColor }]);
    });
    setEditorMessage('Stop added');
  }, [inferColorAtOffset]);

  const livePreview = useMemo(() => {
    const orderedStops = normalizeStops(stops.slice());
    return type === 'linear'
      ? `linear-gradient(${angle}deg, ${orderedStops.map((s) => `${s.color} ${s.offset}%`).join(',')})`
      : `radial-gradient(circle at ${cx}% ${cy}%, ${orderedStops.map((s) => `${s.color} ${s.offset}%`).join(',')})`;
  }, [type, angle, stops, cx, cy]);

  // Generate SVG content for the gradient preview
  const gradientSvgContent = useMemo(() => {
    const orderedStops = normalizeStops(stops.slice());
    const stopsMarkup = orderedStops.map((s) => 
      `<stop offset="${s.offset}%" stop-color="${s.color}"/>`
    ).join('\n    ');
    
    if (type === 'linear') {
      const { x1: x1Pct, y1: y1Pct, x2: x2Pct, y2: y2Pct } = coordinatesFromAngle(angle);
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${editingGradientId}" x1="${x1Pct}%" y1="${y1Pct}%" x2="${x2Pct}%" y2="${y2Pct}%">
    ${stopsMarkup}
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" fill="url(#${editingGradientId})"/>
</svg>`;
    } else {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${editingGradientId}" cx="${cx}%" cy="${cy}%" r="${r}%" fx="${fx}%" fy="${fy}%">
    ${stopsMarkup}
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" fill="url(#${editingGradientId})"/>
</svg>`;
    }
  }, [type, angle, stops, cx, cy, r, fx, fy, editingGradientId]);

  const handleAdd = () => {
    const id = `grad-${Date.now()}`;
    const newGradient: GradientDef = {
      id,
      name: 'New Gradient',
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#ff7f50' },
        { offset: 100, color: '#1e3a8a' },
      ],
    };
    addGradient?.(newGradient);
    setEditingGradientId(id);
  };

  const handleFieldUpdate = (field: keyof GradientDef, value: string | number) => {
    if (!editingGradientId) return;
    updateGradient?.(editingGradientId, { [field]: value });
  };

  const handleUpdate = () => {
    if (!editingGradientId) return;
    const target = gradients.find((g) => g.id === editingGradientId);
    if (!target || target.preset) return;

    const objectCoordinates = type === 'linear' && gradientUnits === 'objectBoundingBox'
      ? coordinatesFromAngle(angle)
      : null;

    const updated: Partial<GradientDef> = {
      type,
      gradientUnits,
      angle: type === 'linear' && gradientUnits === 'objectBoundingBox' ? angle : undefined,
      x1: type === 'linear' ? (gradientUnits === 'userSpaceOnUse' ? x1 : objectCoordinates?.x1) : undefined,
      y1: type === 'linear' ? (gradientUnits === 'userSpaceOnUse' ? y1 : objectCoordinates?.y1) : undefined,
      x2: type === 'linear' ? (gradientUnits === 'userSpaceOnUse' ? x2 : objectCoordinates?.x2) : undefined,
      y2: type === 'linear' ? (gradientUnits === 'userSpaceOnUse' ? y2 : objectCoordinates?.y2) : undefined,
      cx: type === 'radial' ? cx : undefined,
      cy: type === 'radial' ? cy : undefined,
      r: type === 'radial' ? r : undefined,
      fx: type === 'radial' ? fx : undefined,
      fy: type === 'radial' ? fy : undefined,
      stops: normalizeStops(stops.slice()),
    };
    updateGradient?.(editingGradientId, updated);
  };

  const addStopSmart = () => {
    const ordered = normalizeStops(stops.slice());
    let insertOffset = 50;
    if (ordered.length >= 2) {
      let maxGap = -1;
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const gap = ordered[i + 1].offset - ordered[i].offset;
        if (gap > maxGap) {
          maxGap = gap;
          insertOffset = ordered[i].offset + gap / 2;
        }
      }
    }
    const next = normalizeStops([...ordered, { offset: insertOffset, color: '#ffffff' }]);
    setStops(next);
  };

  const handleReverseStops = () => {
    setStops((previousStops) =>
      normalizeStops(
        previousStops.map((stop) => ({
          ...stop,
          offset: 100 - stop.offset,
        }))
      )
    );
    if (type === 'linear') {
      setAngle((previousAngle) => (previousAngle + 180) % 360);
    }
    setEditorMessage('Gradient reversed');
  };

  const randomHex = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

  const handleRandomize = () => {
    if (type === 'linear') {
      setAngle(Math.floor(Math.random() * 361));
    } else {
      setCx(Math.floor(Math.random() * 101));
      setCy(Math.floor(Math.random() * 101));
    }
    setStops((previousStops) =>
      normalizeStops(previousStops.map((stop) => ({ ...stop, color: randomHex() })))
    );
    setEditorMessage('Gradient randomized');
  };

  const canUpdate = editingGradient && !editingGradient.preset;

  const renderItem = (gradient: GradientDef, isSelected: boolean) => (
    <GradientItemCard
      gradient={gradient}
      isSelected={isSelected}
    />
  );

  return (
    <LibraryPanelHelper
      title="Gradients"
      items={gradients}
      selectedId={editingGradientId}
      onSelect={setEditingGradientId}
      onAdd={handleAdd}
      onDelete={editingGradient && !editingGradient.preset ? (id) => removeGradient?.(id) : undefined}
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        editingGradient ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={editingGradient.name}
                  onChange={(value) => handleFieldUpdate('name', value)}
                  placeholder="Gradient name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>

            <CompactFieldRow label="Type" labelWidth="45px">
              <JoinedButtonGroup
                size="sm"
                value={type}
                onChange={(v) => setType(v as 'linear' | 'radial')}
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'radial', label: 'Radial' },
                ]}
                fullWidth
              />
            </CompactFieldRow>

            <CompactFieldRow label="Units" labelWidth="45px">
              <JoinedButtonGroup
                size="sm"
                value={gradientUnits}
                onChange={(v) => setGradientUnits(v as 'objectBoundingBox' | 'userSpaceOnUse')}
                options={[
                  { value: 'objectBoundingBox', label: 'Relative' },
                  { value: 'userSpaceOnUse', label: 'Absolute' },
                ]}
                fullWidth
              />
            </CompactFieldRow>

            {type === 'linear' ? (
              <VStack spacing={1} align="stretch" pr={0.5}>
                {gradientUnits === 'objectBoundingBox' ? (
                  <SliderControl
                    label="Angle"
                    value={angle}
                    min={0}
                    max={360}
                    step={5}
                    onChange={(v) => setAngle(v)}
                    inline
                    gap="4px"
                    labelWidth="35px"
                    valueWidth="48px"
                    formatter={(v) => v.toFixed(2)}
                  />
                ) : (
                  <>
                    <SliderControl label="X1" value={x1} min={0} max={2048} step={1} onChange={(v) => setX1(v)} inline gap="4px" labelWidth="25px" valueWidth="42px" />
                    <SliderControl label="Y1" value={y1} min={0} max={2048} step={1} onChange={(v) => setY1(v)} inline gap="4px" labelWidth="25px" valueWidth="42px" />
                    <SliderControl label="X2" value={x2} min={0} max={2048} step={1} onChange={(v) => setX2(v)} inline gap="4px" labelWidth="25px" valueWidth="42px" />
                    <SliderControl label="Y2" value={y2} min={0} max={2048} step={1} onChange={(v) => setY2(v)} inline gap="4px" labelWidth="25px" valueWidth="42px" />
                  </>
                )}
              </VStack>
            ) : (
              <VStack spacing={1} align="stretch" pr={0.5}>
                <SliderControl label="CX" value={cx} min={0} max={gradientUnits === 'userSpaceOnUse' ? 2048 : 100} step={1} onChange={(v) => setCx(v)} inline gap="4px" labelWidth="25px" valueWidth={gradientUnits === 'userSpaceOnUse' ? '42px' : '32px'} />
                <SliderControl label="CY" value={cy} min={0} max={gradientUnits === 'userSpaceOnUse' ? 2048 : 100} step={1} onChange={(v) => setCy(v)} inline gap="4px" labelWidth="25px" valueWidth={gradientUnits === 'userSpaceOnUse' ? '42px' : '32px'} />
                <SliderControl label="R" value={r} min={1} max={gradientUnits === 'userSpaceOnUse' ? 2048 : 200} step={1} onChange={(v) => setR(v)} inline gap="4px" labelWidth="25px" valueWidth={gradientUnits === 'userSpaceOnUse' ? '42px' : '32px'} />
                <SliderControl label="FX" value={fx} min={0} max={gradientUnits === 'userSpaceOnUse' ? 2048 : 100} step={1} onChange={(v) => setFx(v)} inline gap="4px" labelWidth="25px" valueWidth={gradientUnits === 'userSpaceOnUse' ? '42px' : '32px'} />
                <SliderControl label="FY" value={fy} min={0} max={gradientUnits === 'userSpaceOnUse' ? 2048 : 100} step={1} onChange={(v) => setFy(v)} inline gap="4px" labelWidth="25px" valueWidth={gradientUnits === 'userSpaceOnUse' ? '42px' : '32px'} />
              </VStack>
            )}

            <VStack spacing={1} align="stretch" mt={1}>
              <Box h="28px" borderRadius="sm" borderWidth="1px" borderColor="gray.300" bgImage={livePreview} />
              <Box
                ref={gradientTrackRef}
                h="14px"
                borderRadius="sm"
                borderWidth="1px"
                borderColor="gray.300"
                bgImage={livePreview}
                position="relative"
                cursor="crosshair"
                userSelect="none"
                style={{ touchAction: 'none' }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  const offset = getOffsetFromClientX(event.clientX);
                  if (offset === null) return;
                  addStopAtOffset(offset);
                }}
              >
                {stops.map((stop, idx) => (
                  <Box
                    key={`handle-${idx}-${stop.offset}-${stop.color}`}
                    position="absolute"
                    left={`calc(${Math.max(0, Math.min(100, stop.offset))}% - 6px)`}
                    top="50%"
                    transform="translateY(-50%)"
                    w="12px"
                    h="12px"
                    borderRadius="full"
                    bg={stop.color}
                    borderWidth={selectedStopIndex === idx ? '2px' : '1px'}
                    borderColor={selectedStopIndex === idx ? 'blue.500' : 'white'}
                    boxShadow="0 0 0 1px rgba(0, 0, 0, 0.35)"
                    cursor="ew-resize"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedStopIndex(idx);
                      setDraggingStopIndex(idx);
                      updateStopOffsetFromClientX(idx, event.clientX);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedStopIndex(idx);
                    }}
                  />
                ))}
              </Box>
              <Text fontSize="xs" color="gray.500">
                Tap/click to add stop. Drag handles to reposition.
              </Text>
              <LibrarySectionHeader title="Stops" action={
                <HStack spacing={1}>
                  <PanelStyledButton size="xs" onClick={addStopSmart} title="Add stop in the largest gap">
                    Add
                  </PanelStyledButton>
                  <PanelStyledButton size="xs" onClick={handleReverseStops} title="Reverse direction">
                    <RefreshCcw size={10} />
                  </PanelStyledButton>
                  <PanelStyledButton size="xs" onClick={handleRandomize} title="Randomize colors">
                    <Shuffle size={10} />
                  </PanelStyledButton>
                </HStack>
              } compact />
              <VStack spacing={0.5} align="stretch">
                {stops.map((stop, idx) => (
                  <Flex key={idx} align="center" gap={1}>
                    <Input
                      type="color"
                      value={stop.color}
                      onChange={(e) => {
                        const next = [...stops];
                        next[idx] = { ...stop, color: e.target.value };
                        setStops(next);
                      }}
                      w="24px"
                      h="22px"
                      p={0}
                      borderRadius="sm"
                      cursor="pointer"
                      flexShrink={0}
                    />
                    <Box flex={1} minW={0} pr={0.5}>
                      <SliderControl
                        label=""
                        value={stop.offset}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => {
                          const next = [...stops];
                          next[idx] = { ...stop, offset: v };
                          setSelectedStopIndex(idx);
                          setStops(next);
                        }}
                        inline
                        gap="4px"
                        valueWidth="32px"
                      />
                    </Box>
                    <ToggleButton
                      size="sm"
                      variant="icon"
                      aria-label="Remove stop"
                      icon={<X size={10} />}
                      sx={{ w: '16px', h: '16px', minW: '16px', minH: '16px' }}
                      isActive={false}
                      isDisabled={stops.length <= 2}
                      onClick={() => {
                        const next = stops.filter((_, i) => i !== idx);
                        setStops(normalizeStops(next));
                        setSelectedStopIndex((previousIndex) => {
                          if (previousIndex === null) return null;
                          if (previousIndex === idx) return null;
                          return previousIndex > idx ? previousIndex - 1 : previousIndex;
                        });
                      }}
                    />
                  </Flex>
                ))}
              </VStack>
            </VStack>

            <Flex justify="flex-end" mt={1}>
              <PanelStyledButton size="xs" onClick={handleUpdate} isDisabled={!canUpdate}>
                Update
              </PanelStyledButton>
            </Flex>

            {editingGradient.preset && (
              <StatusMessage>
                Preset gradient. Create a new gradient to customize.
              </StatusMessage>
            )}
            {editorMessage && !editingGradient.preset && (
              <StatusMessage>
                {editorMessage}
              </StatusMessage>
            )}

            <SvgPreview
              content={gradientSvgContent}
              height="60px"
              showVisualPreview={false}
            />
          </>
        ) : null
      }
    />
  );
};
