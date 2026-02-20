import React, { useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { ElementInspectorPluginSlice, InspectorTab } from './slice';
import { inspectGeometry, inspectStyle, getElementProperties } from './inspectorUtils';
import type { CanvasElement } from '../../types';

type InspectorStore = CanvasStore & ElementInspectorPluginSlice;

const PropRow: React.FC<{ label: string; value: string; type?: string }> = ({ label, value, type }) => (
  <HStack justify="space-between" px={2} py={0.5}>
    <Text fontSize="2xs" color="gray.400" fontFamily="mono">{label}</Text>
    <HStack gap={1}>
      {type === 'color' && value !== 'none' && (
        <Box w={2.5} h={2.5} borderRadius="sm" bg={value} border="1px solid" borderColor="whiteAlpha.300" />
      )}
      <Text
        fontSize="2xs"
        fontWeight="bold"
        fontFamily="mono"
        color={type === 'boolean' ? (value === 'true' ? 'green.300' : 'gray.500') : 'gray.200'}
        maxW="120px"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        title={value}
      >
        {value}
      </Text>
    </HStack>
  </HStack>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <Box
    as="button"
    px={2}
    py={1}
    fontSize="2xs"
    fontWeight={active ? 'bold' : 'normal'}
    color={active ? 'blue.200' : 'gray.400'}
    bg={active ? 'whiteAlpha.100' : 'transparent'}
    borderRadius="sm"
    cursor="pointer"
    _hover={{ bg: 'whiteAlpha.50' }}
    onClick={onClick}
  >
    {label}
  </Box>
);

export const ElementInspectorPanel: React.FC = () => {
  const { state, update, selectedIds, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as InspectorStore;
      return {
        state: st.elementInspector,
        update: st.updateElementInspectorState,
        selectedIds: s.selectedIds,
        elements: s.elements,
      };
    })
  );

  const selectedEl = useMemo(() => {
    if (selectedIds.length === 0) return null;
    return elements.find((el: CanvasElement) => el.id === selectedIds[0]) ?? null;
  }, [selectedIds, elements]);

  const geometry = useMemo(() => {
    if (!selectedEl) return null;
    return inspectGeometry(selectedEl);
  }, [selectedEl]);

  const style = useMemo(() => {
    if (!selectedEl) return null;
    return inspectStyle(selectedEl);
  }, [selectedEl]);

  const properties = useMemo(() => {
    if (!selectedEl) return [];
    return getElementProperties(selectedEl);
  }, [selectedEl]);

  if (!state || !update) return null;

  const setTab = (tab: InspectorTab) => update({ activeTab: tab });

  return (
    <Panel title="Element Inspector" isCollapsible defaultOpen={false}>
      {selectedEl ? (
        <>
          {/* Element summary */}
          <Box bg="whiteAlpha.50" borderRadius="md" p={2} mb={1} mx={1}>
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="bold" color="blue.200">{selectedEl.type.toUpperCase()}</Text>
              <Text fontSize="2xs" fontFamily="mono" color="gray.500" maxW="140px" overflow="hidden" textOverflow="ellipsis">
                {selectedEl.id}
              </Text>
            </HStack>
            {selectedIds.length > 1 && (
              <Text fontSize="2xs" color="gray.500" mt={0.5}>
                Showing first of {selectedIds.length} selected
              </Text>
            )}
          </Box>

          {/* Tab bar */}
          <HStack px={1} gap={0} mb={1}>
            <TabButton label="Props" active={state.activeTab === 'properties'} onClick={() => setTab('properties')} />
            <TabButton label="Geometry" active={state.activeTab === 'geometry'} onClick={() => setTab('geometry')} />
            <TabButton label="Style" active={state.activeTab === 'style'} onClick={() => setTab('style')} />
            <TabButton label="Raw" active={state.activeTab === 'raw'} onClick={() => setTab('raw')} />
          </HStack>

          {/* Properties tab */}
          {state.activeTab === 'properties' && (
            <VStack gap={0} align="stretch">
              <SectionHeader title="Element Properties" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                {properties.map((p) => (
                  <PropRow key={p.key} label={p.key} value={p.value} type={p.type} />
                ))}
              </Box>
            </VStack>
          )}

          {/* Geometry tab */}
          {state.activeTab === 'geometry' && geometry && (
            <VStack gap={0} align="stretch">
              <SectionHeader title="Path Geometry" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                <PropRow label="subPaths" value={String(geometry.subPathCount)} />
                <PropRow label="nodes" value={String(geometry.totalNodes)} />
                <PropRow label="segments" value={String(geometry.totalSegments)} />
                <PropRow label="lines" value={String(geometry.lineCount)} />
                <PropRow label="curves" value={String(geometry.curveCount)} />
                <PropRow label="closes" value={String(geometry.closeCount)} />
                <PropRow label="estLength" value={`${geometry.estimatedLength.toFixed(1)} px`} />
              </Box>

              {geometry.boundingBox && (
                <>
                  <SectionHeader title="Bounding Box" />
                  <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                    <PropRow label="x" value={geometry.boundingBox.x.toFixed(1)} />
                    <PropRow label="y" value={geometry.boundingBox.y.toFixed(1)} />
                    <PropRow label="width" value={geometry.boundingBox.width.toFixed(1)} />
                    <PropRow label="height" value={geometry.boundingBox.height.toFixed(1)} />
                    {geometry.center && (
                      <PropRow label="center" value={`${geometry.center.x.toFixed(0)}, ${geometry.center.y.toFixed(0)}`} />
                    )}
                  </Box>
                </>
              )}
            </VStack>
          )}
          {state.activeTab === 'geometry' && !geometry && (
            <Text fontSize="xs" color="gray.500" px={2} py={2}>
              Geometry info only available for path elements
            </Text>
          )}

          {/* Style tab */}
          {state.activeTab === 'style' && style && (
            <VStack gap={0} align="stretch">
              <SectionHeader title="Fill" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                <PropRow label="fillColor" value={style.fillColor} type="color" />
                <PropRow label="fillOpacity" value={String(style.fillOpacity)} />
                {style.fillRule && <PropRow label="fillRule" value={style.fillRule} />}
              </Box>

              <SectionHeader title="Stroke" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                <PropRow label="strokeColor" value={style.strokeColor} type="color" />
                <PropRow label="strokeWidth" value={`${style.strokeWidth} px`} />
                <PropRow label="strokeOpacity" value={String(style.strokeOpacity)} />
                {style.strokeLinecap && <PropRow label="linecap" value={style.strokeLinecap} />}
                {style.strokeLinejoin && <PropRow label="linejoin" value={style.strokeLinejoin} />}
                {style.strokeDasharray && style.strokeDasharray !== 'none' && (
                  <PropRow label="dasharray" value={style.strokeDasharray} />
                )}
              </Box>

              <SectionHeader title="Presentation" />
              <Box bg="whiteAlpha.50" borderRadius="md" py={1}>
                <PropRow label="opacity" value={String(style.opacity ?? 1)} />
                {style.mixBlendMode && <PropRow label="blendMode" value={style.mixBlendMode} />}
                {style.visibility && <PropRow label="visibility" value={style.visibility} />}
                {style.vectorEffect && <PropRow label="vectorEffect" value={style.vectorEffect} />}
              </Box>
            </VStack>
          )}
          {state.activeTab === 'style' && !style && (
            <Text fontSize="xs" color="gray.500" px={2} py={2}>
              Style info only available for path elements
            </Text>
          )}

          {/* Raw tab */}
          {state.activeTab === 'raw' && (
            <VStack gap={0} align="stretch">
              <SectionHeader title="Raw Data" />
              <PanelToggle
                isChecked={state.showInherited}
                onChange={(e) => update({ showInherited: e.target.checked })}
              >
                Show all data keys
              </PanelToggle>
              <Box
                bg="whiteAlpha.50"
                borderRadius="md"
                p={2}
                maxH="250px"
                overflowY="auto"
                fontFamily="mono"
                fontSize="2xs"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
                color="gray.300"
              >
                {JSON.stringify(
                  state.showInherited ? selectedEl : { id: selectedEl.id, type: selectedEl.type, data: selectedEl.data },
                  null,
                  2
                )}
              </Box>
            </VStack>
          )}
        </>
      ) : (
        <Text fontSize="xs" color="gray.500" px={2} py={2}>
          Select an element to inspect its properties
        </Text>
      )}
    </Panel>
  );
};
