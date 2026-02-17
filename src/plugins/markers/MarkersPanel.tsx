import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import type { MarkerDefinition, MarkerSide, MarkersSlice } from './slice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { CustomSelect } from '../../ui/CustomSelect';
import { NumberInput } from '../../ui/NumberInput';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { MarkerItemCard } from './MarkerItemCard';
import { CompactFieldRow, CompactFieldGroup } from '../../ui/CompactFieldRow';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgEditor } from '../../ui/SvgPreview';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import type { NativeShapeElement } from '../nativeShapes/types';


// Simplified sides for the select
const MARKER_SIDES_SELECT: Array<{ key: MarkerSide; label: string }> = [
  { key: 'start', label: 'Start' },
  { key: 'mid', label: 'Middle' },
  { key: 'end', label: 'End' },
];

const MARKER_CAPABLE_NATIVE_KINDS = new Set<NativeShapeElement['data']['kind']>([
  'line',
  'polyline',
  'polygon',
  'rect',
  'square',
  'circle',
  'ellipse',
]);

const EMPTY_MARKERS: MarkerDefinition[] = [];

const selectMarkersPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & MarkersSlice;
  const selectedIds = state.selectedIds;
  let hasMarkerCapableSelection = false;
  if (selectedIds.length > 0) {
    const selectedSet = new Set(selectedIds);
    for (const el of state.elements) {
      if (!selectedSet.has(el.id)) continue;
      if (el.type === 'path') {
        hasMarkerCapableSelection = true;
        break;
      }
      if (el.type === 'nativeShape') {
        const kind = (el as NativeShapeElement).data.kind;
        if (MARKER_CAPABLE_NATIVE_KINDS.has(kind)) {
          hasMarkerCapableSelection = true;
          break;
        }
      }
    }
  }

  return {
    markers: slice.markers ?? EMPTY_MARKERS,
    addMarker: slice.addMarker,
    updateMarker: slice.updateMarker,
    removeMarker: slice.removeMarker,
    assignMarkerToSelection: slice.assignMarkerToSelection,
    clearMarkersFromSelection: slice.clearMarkersFromSelection,
    hasMarkerCapableSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
  };
};

/** Component to display marker preview applied to a line */
const MarkerPreviewBox: React.FC<{
  marker: MarkerDefinition;
}> = ({ marker }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const checkerLight = useColorModeValue('#e2e2e2', '#4a4a4a');
  const checkerDark = useColorModeValue('#ffffff', '#3a3a3a');
  const lineColor = useColorModeValue('#4A90A4', '#7EC8E3');

  // Build marker definition and line with marker applied
  const markerDef = useMemo(() => {
    const viewBox = marker.viewBox ?? `0 0 ${marker.markerWidth} ${marker.markerHeight}`;
    const pathContent = marker.content || `<path d="${marker.path}" fill="currentColor"/>`;
    return `<marker id="preview-marker" viewBox="${viewBox.split(' ').slice(0, 4).join(' ')}" 
      refX="${marker.refX}" refY="${marker.refY}" 
      markerWidth="${marker.markerWidth}" markerHeight="${marker.markerHeight}" 
      orient="${marker.orient}">${pathContent}</marker>`;
  }, [marker]);

  return (
    <Box>
      <LibrarySectionHeader title="Preview" />
      <Box
        bg={bgColor}
        borderRadius="md"
        overflow="hidden"
        position="relative"
        width="100%"
        sx={{
          aspectRatio: '1 / 1',
          backgroundImage: `linear-gradient(45deg, ${checkerLight} 25%, transparent 25%), 
            linear-gradient(-45deg, ${checkerLight} 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, ${checkerLight} 75%), 
            linear-gradient(-45deg, transparent 75%, ${checkerLight} 75%)`,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
          backgroundColor: checkerDark,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <defs dangerouslySetInnerHTML={{ __html: markerDef }} />
          <line 
            x1="15" y1="50" x2="85" y2="50" 
            stroke={lineColor} 
            strokeWidth="2"
            markerStart="url(#preview-marker)"
            markerEnd="url(#preview-marker)"
          />
          <polyline 
            points="15,25 50,40 85,25" 
            fill="none"
            stroke={lineColor} 
            strokeWidth="2"
            markerStart="url(#preview-marker)"
            markerMid="url(#preview-marker)"
            markerEnd="url(#preview-marker)"
          />
          <polyline 
            points="15,75 50,60 85,75" 
            fill="none"
            stroke={lineColor} 
            strokeWidth="2"
            markerStart="url(#preview-marker)"
            markerMid="url(#preview-marker)"
            markerEnd="url(#preview-marker)"
          />
        </svg>
      </Box>
    </Box>
  );
};

export const MarkersPanel: React.FC = () => {
  const {
    markers,
    addMarker,
    updateMarker,
    removeMarker,
    assignMarkerToSelection,
    clearMarkersFromSelection,
    hasMarkerCapableSelection,
    selectedFromSearch,
    selectFromSearch,
  } = useShallowCanvasSelector(selectMarkersPanelState);

  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = React.useState<string | number | null>(null);

  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setEditingMarkerId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [selectionTargets, setSelectionTargets] = useState<Record<MarkerSide, string>>({
    start: 'none',
    mid: 'none',
    end: 'none',
  });

  useEffect(() => {
    if (!editingMarkerId && markers.length) {
      setEditingMarkerId(markers[0].id);
    } else if (editingMarkerId && !markers.find((marker) => marker.id === editingMarkerId)) {
      setEditingMarkerId(markers[0]?.id ?? null);
    }
  }, [editingMarkerId, markers]);

  const editingMarker = useMemo(
    () => markers.find((marker) => marker.id === editingMarkerId) ?? null,
    [editingMarkerId, markers]
  );

  // Generate SVG content for the marker
  const markerSvgContent = useMemo(() => {
    if (!editingMarker) return '';
    // Prefer content if available (complex marker)
    if (editingMarker.content) return editingMarker.content;
    // Generate from path
    const viewBox = editingMarker.viewBox ?? `0 0 ${editingMarker.markerWidth} ${editingMarker.markerHeight}`;
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${editingMarker.path}" fill="currentColor"/>
</svg>`;
  }, [editingMarker]);

  const handleContentChange = useCallback((newContent: string) => {
    if (!editingMarkerId || !updateMarker) return;
    updateMarker(editingMarkerId, { content: newContent });
  }, [editingMarkerId, updateMarker]);

  const selectionEmpty = !hasMarkerCapableSelection;

  const markerOptions = useMemo(
    () => [
      { value: 'none', label: 'None' },
      ...markers.map((marker) => ({ value: marker.id, label: marker.name })),
    ],
    [markers]
  );

  const handleFieldUpdate = (field: keyof MarkerDefinition, value: string | number) => {
    if (!editingMarkerId) return;
    updateMarker?.(editingMarkerId, { [field]: value });
  };

  const handleAssign = (side: MarkerSide) => {
    const markerId = selectionTargets[side];
    assignMarkerToSelection?.(side, markerId === 'none' ? null : markerId);
  };

  const renderItem = (marker: MarkerDefinition, isSelected: boolean) => (
    <MarkerItemCard
      marker={marker}
      isSelected={isSelected}
    />
  );

  return (
    <LibraryPanelHelper
      title="Markers"
      items={markers}
      selectedId={editingMarkerId}
      onSelect={setEditingMarkerId}
      onAdd={addMarker}
      onDelete={(id) => removeMarker?.(id)}
      emptyMessage="No markers available."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        editingMarker ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={editingMarker.name}
                  onChange={(value) => handleFieldUpdate('name', value)}
                  placeholder="Marker name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <CompactFieldRow label="Path" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={editingMarker.path}
                  onChange={(value) => handleFieldUpdate('path', value)}
                  placeholder="M0 0 L4 4"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <CompactFieldRow label="Orient" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={editingMarker.orient}
                  onChange={(value) => handleFieldUpdate('orient', value)}
                  placeholder="auto"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <CompactFieldRow label="Size" labelWidth="45px">
              <CompactFieldGroup>
                <NumberInput
                  value={editingMarker.markerWidth}
                  onChange={(val) => handleFieldUpdate('markerWidth', val)}
                  min={1}
                  step={1}
                  label="W"
                  labelWidth="14px"
                  inputWidth='45px'
                />
                <NumberInput
                  value={editingMarker.markerHeight}
                  onChange={(val) => handleFieldUpdate('markerHeight', val)}
                  min={1}
                  step={1}
                  label="H"
                  labelWidth="14px"
                  inputWidth='45px'
                />
              </CompactFieldGroup>
            </CompactFieldRow>
            <CompactFieldRow label="Ref" labelWidth="45px">
              <CompactFieldGroup>
                <NumberInput
                  value={editingMarker.refX}
                  onChange={(val) => handleFieldUpdate('refX', val)}
                  min={0}
                  step={1}
                  label="X"
                  labelWidth="14px"
                  inputWidth='45px'
                />
                <NumberInput
                  value={editingMarker.refY}
                  onChange={(val) => handleFieldUpdate('refY', val)}
                  min={0}
                  step={1}
                  label="Y"
                  labelWidth="14px"
                  inputWidth='45px'
                />
              </CompactFieldGroup>
            </CompactFieldRow>
            <MarkerPreviewBox marker={editingMarker} />
            <SvgEditor
              content={markerSvgContent}
              onChange={handleContentChange}
              height="80px"
              showPreview={false}
            />
          </>
        ) : null
      }
      actionsTitle="Assign to Selection"
      Actions={
        <>
          {MARKER_SIDES_SELECT.map(({ key, label }) => (
            <Flex key={key} align="center" gap={1.5}>
              <CustomSelect
                value={selectionTargets[key]}
                options={markerOptions}
                onChange={(value) =>
                  setSelectionTargets((prev) => ({ ...prev, [key]: value }))
                }
                size="sm"
                isDisabled={selectionEmpty}
              />
              <PanelStyledButton
                onClick={() => handleAssign(key)}
                isDisabled={selectionEmpty}
                flexShrink={0}
              >
                {label}
              </PanelStyledButton>
            </Flex>
          ))}
          <ActionButtonGroup>
            <PanelStyledButton
              onClick={() => clearMarkersFromSelection?.()}
              isDisabled={selectionEmpty}
              w="full"
            >
              Clear markers
            </PanelStyledButton>
          </ActionButtonGroup>
          {selectionEmpty && (
            <StatusMessage>
              Select a path or shape to attach markers.
            </StatusMessage>
          )}
        </>
      }
    />
  );
};
