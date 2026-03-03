import React, { useCallback, useMemo, useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
} from '@chakra-ui/react';
import { canvasStoreApi } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, Command, GroupElement, PathData } from '../../types';
import type {
  SvgStructureContributionProps as SvgStructureContributionPropsType,
  SvgDefsEditor,
} from '../../types/plugins';
import type { RegisteredSvgStructureContribution } from '../../utils/svgStructureContributionRegistry';
import type { RegisteredSvgDefsEditor } from '../../utils/svgDefsEditorRegistry';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PathThumbnail } from '../../ui/PathThumbnail';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import {
  getItemThumbnailData,
  buildNativeShapeThumbnailCommands,
  getGroupThumbnailCommands,
} from '../../utils/selectPanelHelpers';
import type { SvgTreeNode, AnimationTargetKey, ReferencedElementData } from './svgStructureTypes';
import {
  ROW_SPACING,
  textProps,
  DEF_CONTAINER_TAGS,
  getReferencedElementData,
  truncateValue,
  formatValue,
  toSnapshot,
  fallbackDeleteDefsNode,
} from './svgStructureUtils';

interface SvgNodeRowProps {
  node: SvgTreeNode;
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  detailExpandedKeys: Set<string>;
  onToggleDetails: (key: string) => void;
  attributeExpandedKeys: Set<string>;
  onToggleAttributes: (key: string) => void;
  contributions: RegisteredSvgStructureContribution[];
  elements: CanvasElement[];
  elementMap: Map<string, CanvasElement>;
  storeApi: SvgStructureContributionPropsType['store'];
  hiddenElementIds: Set<string>;
  lockedElementIds: Set<string>;
  highlightedIds: Set<string>;
  defsEditors: RegisteredSvgDefsEditor[];
  animationTargets: Set<AnimationTargetKey>;
  referencedDefs: Set<string>;
  isVirtualShiftActive: boolean;
  selectedIds: string[];
  setHoveredStructureElementId: (id: string | null) => void;
}

export const SvgNodeRow: React.FC<SvgNodeRowProps> = ({
  node,
  expandedKeys,
  onToggle,
  detailExpandedKeys,
  onToggleDetails,
  attributeExpandedKeys,
  onToggleAttributes,
  contributions,
  elements,
  elementMap,
  storeApi,
  hiddenElementIds,
  lockedElementIds,
  highlightedIds,
  defsEditors,
  animationTargets,
  referencedDefs,
  isVirtualShiftActive,
  selectedIds,
  setHoveredStructureElementId,
}) => {
  const isExpanded = true;
  const isDetailsExpanded = detailExpandedKeys.has(node.key);
  const isSvgRoot = node.tagName === 'svg';

  const [openAttributeEditor, setOpenAttributeEditor] = useState<{ name: string; value: string } | null>(null);
  const [newAttribute, setNewAttribute] = useState<{ name: string; value: string }>({ name: '', value: '' });

  const elementId = useMemo(
    () => node.dataElementId ?? node.idAttribute ?? node.canvasElement?.id,
    [node.canvasElement?.id, node.dataElementId, node.idAttribute]
  );

  const isHidden = useMemo(() => {
    if (!elementId) return false;
    return hiddenElementIds.has(elementId);
  }, [elementId, hiddenElementIds]);

  const isLocked = useMemo(() => {
    if (!elementId) return false;
    return lockedElementIds.has(elementId);
  }, [elementId, lockedElementIds]);

  const showDetails = isDetailsExpanded && !isSvgRoot;

  const numberLabel = node.numberPath;

  const fullId = useMemo(() => node.idAttribute ?? node.dataElementId ?? node.displayId, [node.dataElementId, node.displayId, node.idAttribute]);

  const nodeSnapshot = useMemo(() => ({
    ...toSnapshot(node),
    childIndex: node.childIndex,
  }), [node]);

  const defsEditor = useMemo(() =>
    defsEditors
      .map((entry) => entry.editor)
      .find((ed) => ed.appliesTo(nodeSnapshot)),
    [defsEditors, nodeSnapshot]);

  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(node.isDefs && node.defsOwnerId && node.childIndex !== undefined && !isDefContainerTag);
  const defsOwnerId = node.defsOwnerId ?? node.idAttribute ?? null;

  const isReferencedDefsNode = useMemo(() => {
    if (!node.isDefs || !defsOwnerId) return false;
    const parentReferenced = referencedDefs.has(defsOwnerId);

    // If the parent def is used anywhere, treat all its nodes as referenced
    if (parentReferenced) return true;

    // Animations targeting defs elements
    if (node.childIndex === undefined && node.idAttribute && isDefContainerTag) {
      const tag = node.tagName.toLowerCase();
      const key = (() => {
        if (tag === 'lineargradient' || tag === 'radialgradient') return `def:gradient:${defsOwnerId}` as const;
        if (tag === 'pattern') return `def:pattern:${defsOwnerId}` as const;
        if (tag === 'marker') return `def:marker:${defsOwnerId}` as const;
        if (tag === 'clippath') return `def:clippath:${defsOwnerId}` as const;
        if (tag === 'mask') return `def:mask:${defsOwnerId}` as const;
        if (tag === 'filter') return `def:filter:${defsOwnerId}` as const;
        if (tag === 'symbol') return `def:symbol:${defsOwnerId}` as const;
        return null;
      })();

      return key ? animationTargets.has(key) : false;
    }

    // Animations targeting defs children
    if (isDefsChild && node.childIndex !== undefined) {
      const index = node.childIndex;
      const tag = node.tagName.toLowerCase();

      if (tag === 'stop' && animationTargets.has(`child:stop:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:pattern:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:symbol:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:filter:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:marker:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:clippath:${defsOwnerId}:${index}`)) return true;
      if (animationTargets.has(`child:mask:${defsOwnerId}:${index}`)) return true;

      return false;
    }

    return false;
  }, [animationTargets, defsOwnerId, isDefContainerTag, isDefsChild, node.childIndex, node.idAttribute, node.isDefs, node.tagName, referencedDefs]);

  const isDeleteDisabled = useMemo(() => {
    if (!node.isDefs) return false;
    return isReferencedDefsNode;
  }, [isReferencedDefsNode, node.isDefs]);

  const baseMapAttributeNameToDataKey = useCallback((attrName: string, current: Record<string, unknown>): string => {
    const normalized = attrName.toLowerCase();
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());

    const explicitMap: Record<string, string> = {
      fill: 'fillColor',
      stroke: 'strokeColor',
      'stroke-width': 'strokeWidth',
      'stroke-opacity': 'strokeOpacity',
      'fill-opacity': 'fillOpacity',
      opacity: 'opacity',
      'stroke-linecap': 'strokeLinecap',
      'stroke-linejoin': 'strokeLinejoin',
      'stroke-dasharray': 'strokeDasharray',
      'stroke-dashoffset': 'strokeDashoffset',
      'stroke-miterlimit': 'strokeMiterlimit',
      'vector-effect': 'vectorEffect',
      'shape-rendering': 'shapeRendering',
      'mix-blend-mode': 'mixBlendMode',
      transform: 'transform',
      // Gradient / marker common fields
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      cx: 'cx',
      cy: 'cy',
      r: 'r',
      fx: 'fx',
      fy: 'fy',
      angle: 'angle',
      'gradient-units': 'gradientUnits',
      gradientunits: 'gradientUnits',
      'gradient-transform': 'gradientTransform',
      gradienttransform: 'gradientTransform',
      'spread-method': 'spreadMethod',
      spreadmethod: 'spreadMethod',
      href: 'href',
      'xlink:href': 'href',
      'marker-width': 'markerWidth',
      markerwidth: 'markerWidth',
      'marker-height': 'markerHeight',
      markerheight: 'markerHeight',
      'ref-x': 'refX',
      refx: 'refX',
      'ref-y': 'refY',
      refy: 'refY',
      orient: 'orient',
    };

    const mapped = explicitMap[normalized];
    if (mapped) return mapped;
    if (camel in current) return camel;
    return normalized;
  }, []);

  const mapAttributeNameToDataKey = useCallback((attrName: string, current: Record<string, unknown>, editor?: SvgDefsEditor<CanvasStore>): string => {
    if (editor?.mapAttributeNameToDataKey) {
      return editor.mapAttributeNameToDataKey(attrName, current);
    }
    return baseMapAttributeNameToDataKey(attrName, current);
  }, [baseMapAttributeNameToDataKey]);

  const matchingContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const matchingBadgeContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => contribution.badgesComponent && (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const matchingButtonContributions = useMemo(() => {
    return contributions
      .filter(({ contribution }) => contribution.buttonsComponent && (contribution.appliesTo ? contribution.appliesTo(nodeSnapshot) : true))
      .sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0));
  }, [contributions, nodeSnapshot]);

  const pluginThumbnail = useMemo(() => {
    if (!node.canvasElement) return null;
    const contribution = elementContributionRegistry.getContribution(node.canvasElement.type);
    return (
      contribution?.renderThumbnail?.(node.canvasElement, {
        viewport: { zoom: 1, panX: 0, panY: 0 },
        elementMap,
      }) ?? null
    );
  }, [node.canvasElement, elementMap]);

  const isHighlighted = elementId ? highlightedIds.has(elementId) : false;

  const thumbnailCommands = useMemo<Command[]>(() => {
    if (!node.canvasElement) return [];
    if (node.canvasElement.type === 'path') {
      const { commands } = getItemThumbnailData('element', node.canvasElement.data as never);
      return commands as Command[];
    }
    if (node.canvasElement.type === 'group') {
      const childIds = (node.canvasElement.data as { childIds?: string[] }).childIds;
      return getGroupThumbnailCommands(childIds, elements) as Command[];
    }
    if (node.canvasElement.type === 'nativeShape') {
      return buildNativeShapeThumbnailCommands(node.canvasElement.data as never) as Command[];
    }
    const bounds = elementContributionRegistry.getBounds(node.canvasElement, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (!bounds) return [];
    return [
      { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
      { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
      { type: 'Z' },
    ];
  }, [node.canvasElement, elements, elementMap]);

  const resolvedBbox = useMemo(() => {
    if (!node.canvasElement) return null;
    if (node.canvasElement.type === 'path') {
      const { bbox } = getItemThumbnailData('element', node.canvasElement.data as PathData);
      if (bbox) return bbox;
    }
    if (node.canvasElement.type === 'group') {
      const viewport = { zoom: 1, panX: 0, panY: 0 };
      const groupElement = node.canvasElement as GroupElement;
      const bounds = getGroupBounds(groupElement, elementMap, viewport);
      if (bounds) {
        return {
          topLeft: { x: bounds.minX, y: bounds.minY },
          bottomRight: { x: bounds.maxX, y: bounds.maxY },
        };
      }
    }
    const fallbackBounds = elementContributionRegistry.getBounds(node.canvasElement, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (!fallbackBounds) return null;
    return {
      topLeft: { x: fallbackBounds.minX, y: fallbackBounds.minY },
      bottomRight: { x: fallbackBounds.maxX, y: fallbackBounds.maxY },
    };
  }, [elementMap, node.canvasElement]);

  const detailBbox = resolvedBbox
    ? {
      width: resolvedBbox.bottomRight.x - resolvedBbox.topLeft.x,
      height: resolvedBbox.bottomRight.y - resolvedBbox.topLeft.y,
      topLeft: resolvedBbox.topLeft,
      bottomRight: resolvedBbox.bottomRight,
    }
    : null;

  const pathPointStats = useMemo(() => {
    if (node.canvasElement?.type !== 'path') return null;

    const pointsMatch = (
      a: { x: number; y: number } | null,
      b: { x: number; y: number } | null
    ): boolean => {
      if (!a || !b) return false;
      return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    };

    const subPaths = (node.canvasElement.data as PathData).subPaths ?? [];
    let totalPoints = 0;
    let curvePoints = 0;
    let linePoints = 0;

    for (const subPath of subPaths) {
      const firstCommand = subPath[0];
      const firstPoint =
        firstCommand && (firstCommand.type === 'M' || firstCommand.type === 'L' || firstCommand.type === 'C')
          ? firstCommand.position
          : null;

      const lastPoint = (() => {
        for (let index = subPath.length - 1; index >= 0; index -= 1) {
          const command = subPath[index];
          if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
            return command.position;
          }
        }
        return null;
      })();

      const firstPointEqualsLastPoint = pointsMatch(firstPoint, lastPoint);
      const closingZIndex = subPath.findIndex((command) => command.type === 'Z');
      const lastPointBeforeZ = (() => {
        if (closingZIndex === -1) return null;
        for (let index = closingZIndex - 1; index >= 0; index -= 1) {
          const command = subPath[index];
          if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
            return command.position;
          }
        }
        return null;
      })();
      const zClosesOpenPath = Boolean(
        closingZIndex !== -1 &&
        firstPoint &&
        lastPointBeforeZ &&
        !pointsMatch(firstPoint, lastPointBeforeZ)
      );

      for (let index = 0; index < subPath.length; index += 1) {
        const command = subPath[index];
        if (command.type === 'C') {
          curvePoints += 1;
          totalPoints += 1;
          continue;
        }

        if (command.type === 'L') {
          linePoints += 1;
          totalPoints += 1;
          continue;
        }

        if (command.type === 'Z') {
          if (index === closingZIndex && zClosesOpenPath) {
            linePoints += 1;
            totalPoints += 1;
          }
          continue;
        }

        if (command.type === 'M') {
          if (index === 0 && (firstPointEqualsLastPoint || zClosesOpenPath)) {
            continue;
          }

          const nextDrawableCommand = subPath
            .slice(index + 1)
            .find((nextCommand) => nextCommand.type === 'C' || nextCommand.type === 'L');

          if (nextDrawableCommand?.type === 'C') {
            curvePoints += 1;
          } else {
            linePoints += 1;
          }

          totalPoints += 1;
        }
      }
    }

    return { totalPoints, curvePoints, linePoints };
  }, [node.canvasElement]);

  const referencedDetails = useMemo(() => {
    if (!node.canvasElement) return [];
    const refs: Array<{ id: string; type: string }> = [];
    const seen = new Set<string>();
    const data = getReferencedElementData(node.canvasElement);

    const addRef = (id: string | null | undefined, type: string) => {
      if (!id) return;
      const match = id.match(/url\\(#([^)]+)\\)/);
      const cleanId = match ? match[1] : id.startsWith('#') ? id.slice(1) : id;
      if (!cleanId) return;
      const key = `${type}:${cleanId}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push({ id: cleanId, type });
    };

    const idFields: Array<[keyof ReferencedElementData, string]> = [
      ['clipPathId', 'CLIPPATH'],
      ['maskId', 'MASK'],
      ['filterId', 'FILTER'],
      ['markerStart', 'MARKER'],
      ['markerMid', 'MARKER'],
      ['markerEnd', 'MARKER'],
    ];
    idFields.forEach(([field, type]) => {
      const value = data[field];
      if (typeof value === 'string') addRef(value, type);
    });

    const paintFields: Array<keyof Pick<ReferencedElementData, 'fillColor' | 'strokeColor'>> = ['fillColor', 'strokeColor'];
    paintFields.forEach((field) => {
      const value = data[field];
      if (typeof value === 'string' && value.includes('url(')) addRef(value, 'PAINT');
    });

    // href / xlink:href
    const href = data.href || data['xlink:href'];
    if (typeof href === 'string') addRef(href, 'SYMBOL');

    // textPath href
    const tp = data.textPath;
    const textPathHref = tp && typeof tp === 'object'
      ? (tp as { href?: string }).href
      : undefined;
    if (typeof textPathHref === 'string') {
      addRef(textPathHref, 'PATH');
    }

    return refs;
  }, [node.canvasElement]);

  const typeLetter = useMemo(() => {
    if (node.tagName) return node.tagName.charAt(0).toUpperCase();
    if (node.canvasElement?.type) return node.canvasElement.type.charAt(0).toUpperCase();
    return '';
  }, [node.canvasElement?.type, node.tagName]);

  const renderContribution = (entry: RegisteredSvgStructureContribution) => {
    const ContributionComponent = entry.contribution.component as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <ContributionComponent
        key={`${node.key}-${entry.contribution.id}`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  const renderBadgeContribution = (entry: RegisteredSvgStructureContribution) => {
    const BadgeComponent = entry.contribution.badgesComponent as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <BadgeComponent
        key={`${node.key}-${entry.contribution.id}-badge`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  const renderButtonContribution = (entry: RegisteredSvgStructureContribution) => {
    const ButtonsComponent = entry.contribution.buttonsComponent as React.ComponentType<SvgStructureContributionPropsType>;
    return (
      <ButtonsComponent
        key={`${node.key}-${entry.contribution.id}-buttons`}
        node={nodeSnapshot}
        store={storeApi}
      />
    );
  };

  return (
    <VStack
      spacing={ROW_SPACING}
      align="stretch"
      px={0}
      data-node-key={node.key}
    >
      <VStack spacing={0} align="stretch" px={0}>
        <HStack
          spacing={1}
          align="center"
          pr={0}
          py={0}
        >
          <Box
            width="26px"
            height="26px"
            borderRadius="md"
            borderWidth="1px"
            borderColor={isHighlighted ? 'yellow.400' : 'border.subtle'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="bg.subtle"
            overflow="hidden"
            flexShrink={0}
            cursor={node.attributes.length > 0 ? 'pointer' : 'default'}
            onClick={node.attributes.length > 0 ? () => onToggleAttributes(node.key) : undefined}
            onMouseEnter={() => {
              if (elementId) {
                setHoveredStructureElementId(elementId);
              }
            }}
            onMouseLeave={() => {
              setHoveredStructureElementId(null);
            }}
          >
            {pluginThumbnail ? (
              pluginThumbnail
            ) : thumbnailCommands.length > 0 ? (
              <PathThumbnail commands={thumbnailCommands} />
            ) : (
              <Text
                fontSize="14px"
                fontWeight="bold"
                color="gray.500"
                _dark={{ color: 'gray.300' }}
                textTransform="uppercase"
                width="100%"
                textAlign="center"
                lineHeight="1"
              >
                {typeLetter}
              </Text>
            )}
          </Box>

          <VStack
            spacing={0.25}
            align="stretch"
            flex={1}
            minWidth={0}
            pr={0}
            py={0}
          >
            <HStack spacing={1} align="center" minWidth={0} width="100%">
              <HStack
                spacing={1}
                align="center"
                minWidth={0}
                flexShrink={1}
                flex={1}
                onClick={() => onToggleDetails(node.key)}
                cursor="pointer"
              >
                {numberLabel && (
                  <Text {...textProps} fontWeight="600" fontSize="xs" noOfLines={1} flexShrink={0}>
                    {numberLabel}
                  </Text>
                )}
                <Text {...textProps} fontWeight="600" fontSize="xs" noOfLines={1} flexShrink={1} minWidth={0}>
                  {node.displayId}
                </Text>
              </HStack>

              <HStack spacing={1} align="center" justify="flex-end" flexShrink={0} flexWrap="wrap">
                <Badge variant="subtle" colorScheme="gray" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                  {node.tagName}
                </Badge>
                {node.isDefs && <Badge colorScheme="purple" fontSize="2xs" px={1} py={0.5}>D</Badge>}
                {node.dataElementId && !node.idAttribute && (
                  <Badge colorScheme="blue" fontSize="2xs" px={1} py={0.5}>data-id</Badge>
                )}
                {matchingBadgeContributions.map(renderBadgeContribution)}
                {node.children.length > 0 && (
                  <Badge variant="outline" colorScheme="gray" fontSize="2xs" px={1} py={0.5} borderRadius="sm">
                    {node.children.length}
                  </Badge>
                )}
              </HStack>
            </HStack>
          </VStack>
        </HStack>

        {showDetails && (() => {
          const showIdSection = fullId && (fullId !== node.displayId || fullId.length >= 13);
          const showDimensions = detailBbox !== null;
          const showPathPoints = pathPointStats !== null;
          const showReferences = referencedDetails.length > 0;
          const hasSectionAbovePathPoints = showIdSection || showDimensions;
          const hasSectionAboveReferences = hasSectionAbovePathPoints || showPathPoints;
          const hasSectionAboveActions = hasSectionAboveReferences || showReferences;

          return (
            <VStack
              spacing={0}
              align="stretch"
              pt={hasSectionAboveReferences ? 0.25 : 0}
              pr={0}
              pl={2}
              ml={1}
              borderLeftWidth="1px"
              borderColor="border.subtle"
            >
              {showIdSection && (
                <Box width="100%" pb={2}>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>ID</Text>
                  <Text {...textProps} fontSize="xs" wordBreak="break-all" userSelect="text" fontFamily="monospace">
                    {fullId}
                  </Text>
                </Box>
              )}

              {showDimensions && (
                <Box width="100%">
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>DIMENSIONS</Text>
                  <VStack spacing={1} align="stretch">
                    <HStack spacing={3} align="start" width="100%" justify="space-between">
                      <VStack spacing={0} align="start">
                        <Text fontSize="2xs" color="gray.500">Top-Left</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.topLeft.x)},{formatValue(detailBbox.topLeft.y)}</Text>
                      </VStack>
                      <VStack spacing={0} align="end">
                        <Text fontSize="2xs" color="gray.500">Width</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.width)}</Text>
                      </VStack>
                    </HStack>
                    <HStack spacing={3} align="start" width="100%" justify="space-between">
                      <VStack spacing={0} align="start">
                        <Text fontSize="2xs" color="gray.500">Height</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.height)}</Text>
                      </VStack>
                      <VStack spacing={0} align="end">
                        <Text fontSize="2xs" color="gray.500">Bottom-Right</Text>
                        <Text fontSize="xs" fontFamily="monospace">{formatValue(detailBbox.bottomRight.x)},{formatValue(detailBbox.bottomRight.y)}</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {showPathPoints && pathPointStats && (
                <Box
                  width="100%"
                  {...(hasSectionAbovePathPoints ? { pt: 2 } : { p: 0 })}
                >
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>POINTS</Text>
                  <HStack spacing={3} align="start" width="100%" justify="space-between">
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Total</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.totalPoints}</Text>
                    </VStack>
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Curves</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.curvePoints}</Text>
                    </VStack>
                    <VStack spacing={0} align="start">
                      <Text fontSize="2xs" color="gray.500">Lines</Text>
                      <Text fontSize="xs" fontFamily="monospace">{pathPointStats.linePoints}</Text>
                    </VStack>
                  </HStack>
                </Box>
              )}

              {showReferences && (
                <Box
                  width="100%"
                  {...(hasSectionAboveReferences ? { pt: 2 } : { p: 0 })}
                >
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>REFERENCES</Text>
                  <VStack spacing={1} align="stretch">
                    {referencedDetails.map((ref) => (
                      <HStack
                        key={`${ref.type}-${ref.id}`}
                        spacing={2}
                        justify="space-between"
                        align="center"
                      >
                        <Text fontSize="xs" fontFamily="monospace" color="gray.700" _dark={{ color: 'gray.200' }}>
                          {ref.id}
                        </Text>
                        <Badge variant="outline" colorScheme="gray" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                          {ref.type}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              <Box
                width="100%"
                {...(hasSectionAboveActions ? { pt: 2 } : { p: 0 })}
              >
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>ACTIONS</Text>
                <VStack spacing={10} align="stretch">
                  <HStack spacing={1} flexWrap="wrap">
                  {!node.isDefs && elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={(e) => {
                        if (!elementId) return;
                        const isShiftActive = e.shiftKey || isVirtualShiftActive;
                        const select = (storeApi.getState?.() as CanvasStore | undefined)?.selectElement ?? canvasStoreApi.getState().selectElement;
                        select?.(elementId, isShiftActive);
                      }}
                    >
                      Select
                    </PanelStyledButton>
                  )}

                  {elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={() => {
                        if (!elementId) return;
                        const toggle = (storeApi.getState?.() as CanvasStore | undefined)?.toggleElementVisibility ?? canvasStoreApi.getState().toggleElementVisibility;
                        toggle?.(elementId);
                      }}
                    >
                      {isHidden ? 'Show' : 'Hide'}
                    </PanelStyledButton>
                  )}

                  {elementId && (
                    <PanelStyledButton
                      size="xs"
                      onClick={() => {
                        if (!elementId) return;
                        const toggle = (storeApi.getState?.() as CanvasStore | undefined)?.toggleElementLock ?? canvasStoreApi.getState().toggleElementLock;
                        toggle?.(elementId);
                      }}
                    >
                      {isLocked ? 'Unlock' : 'Lock'}
                    </PanelStyledButton>
                  )}

                  {(elementId || node.isDefs) && (
                    <PanelStyledButton
                      size="xs"
                      colorScheme="red"
                      isDisabled={isDeleteDisabled}
                      onClick={() => {
                        if (isDeleteDisabled) return;
                        const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
                        if (elementId) {
                          const remove = (storeState as CanvasStore | undefined)?.deleteElement ?? canvasStoreApi.getState().deleteElement;
                          remove?.(elementId);
                          return;
                        }
                        if (node.isDefs && defsEditor?.removeChild) {
                          const handled = defsEditor.removeChild({ store: storeState, node: nodeSnapshot });
                          if (!handled) {
                            fallbackDeleteDefsNode(nodeSnapshot, storeState);
                          }
                          setOpenAttributeEditor(null);
                          return;
                        }
                        if (node.isDefs) {
                          fallbackDeleteDefsNode(nodeSnapshot, storeState);
                          setOpenAttributeEditor(null);
                        }
                      }}
                    >
                      Delete
                    </PanelStyledButton>
                  )}
               

                  {matchingButtonContributions.map(renderButtonContribution)}
                  </HStack>
                </VStack>
              </Box>

            {node.attributes.length > 0 && attributeExpandedKeys.has(node.key) && (
              <Box
                pl={0}
                pr={0}
                py={0}
                overflowX="auto"
                whiteSpace="nowrap"
                display="flex"
                columnGap={1}
                sx={{
                  scrollbarWidth: 'none',
                  '::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {node.attributes.map((attr) => (
                  <Badge
                    key={`${node.key}-${attr.name}`}
                    variant="outline"
                    colorScheme="gray"
                    fontSize="2xs"
                    px={1.5}
                    py={0.5}
                    borderRadius="sm"
                    flexShrink={0}
                    cursor="pointer"
                    onClick={() => {
                      setOpenAttributeEditor((prev) => {
                        if (prev?.name === attr.name) return null;
                        return { name: attr.name, value: attr.value };
                      });
                    }}
                  >
                    {attr.name}="{truncateValue(attr.value, 36)}"
                  </Badge>
                ))}
              </Box>
            )}

            {openAttributeEditor && attributeExpandedKeys.has(node.key) && (
              <VStack spacing={0.5} align="stretch" pl={0} pr={1} pt={1} pb={1.5}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.300' }}>
                  {openAttributeEditor.name}
                </Text>
                <PanelTextInput
                  value={openAttributeEditor.value}
                  onChange={(val) => setOpenAttributeEditor((prev) => (prev ? { ...prev, value: val } : prev))}
                  width="100%"
                />
                <PanelStyledButton
                  size="xs"
                  onClick={() => {
                    if (!openAttributeEditor) return;
                    const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore & {
                      gradients?: { id: string }[];
                      updateGradient?: (id: string, updates: Record<string, unknown>) => void;
                      markers?: { id: string }[];
                      updateMarker?: (id: string, updates: Record<string, unknown>) => void;
                    };

                    const rawValue = openAttributeEditor.value;

                    if (node.canvasElement) {
                      const updateElement = storeState.updateElement;
                      if (!updateElement) return;
                      const current = node.canvasElement.data as Record<string, unknown>;
                      const dataKey = mapAttributeNameToDataKey(openAttributeEditor.name, current, defsEditor);
                      const existingValue = current[dataKey];

                      let nextValue: unknown = rawValue;
                      if (typeof existingValue === 'number') {
                        const parsed = parseFloat(rawValue);
                        nextValue = Number.isFinite(parsed) ? parsed : existingValue;
                      } else if (typeof existingValue === 'boolean') {
                        if (rawValue === 'true') nextValue = true;
                        else if (rawValue === 'false') nextValue = false;
                      }

                      updateElement(
                        node.canvasElement.id,
                        { data: { ...current, [dataKey]: nextValue } } as Partial<CanvasElement>
                      );
                      setOpenAttributeEditor(null);
                      return;
                    }

                    if (defsEditor) {
                      const ctx = {
                        store: storeState,
                        node: nodeSnapshot,
                        attrName: openAttributeEditor.name,
                        rawValue,
                      } as const;
                      let handled = false;
                      if (nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                        handled = defsEditor.updateChild(ctx);
                      }
                      if (!handled) {
                        handled = defsEditor.update(ctx);
                      }
                      if (handled) {
                        setOpenAttributeEditor(null);
                        return;
                      }
                    }
                  }}
                >
                  Update
                </PanelStyledButton>
                {openAttributeEditor && (
                  <PanelStyledButton
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => {
                      const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore & {
                        updateElement?: CanvasStore['updateElement'];
                      };

                      if (node.canvasElement && storeState.updateElement) {
                        const current = node.canvasElement.data as Record<string, unknown>;
                        const dataKey = mapAttributeNameToDataKey(openAttributeEditor.name, current, defsEditor);
                        const next = { ...current };
                        delete next[dataKey];
                        storeState.updateElement(
                          node.canvasElement.id,
                          { data: next } as Partial<CanvasElement>
                        );
                        setOpenAttributeEditor(null);
                        return;
                      }

                      if (defsEditor) {
                        const ctx = {
                          store: storeState,
                          node: nodeSnapshot,
                          attrName: openAttributeEditor.name,
                        } as const;
                        let handled = false;
                        if (nodeSnapshot.childIndex !== undefined && defsEditor.removeAttribute) {
                          handled = defsEditor.removeAttribute(ctx);
                        }
                        if (!handled && nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                          handled = defsEditor.updateChild({ ...ctx, rawValue: '' });
                        }
                        if (!handled && defsEditor.removeAttribute) {
                          handled = defsEditor.removeAttribute(ctx);
                        }
                        if (!handled) {
                          handled = defsEditor.update({ ...ctx, rawValue: '' });
                        }
                        if (handled) {
                          setOpenAttributeEditor(null);
                        }
                      }
                    }}
                  >
                    Remove
                  </PanelStyledButton>
                )}
              </VStack>
            )}

            {attributeExpandedKeys.has(node.key) && (
              <VStack spacing={0.5} align="stretch" pl={0} pr={1} pt={0.5} pb={1}>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.300' }}>
                  Add attribute
                </Text>
                <HStack spacing={1} align="center">
                  <PanelTextInput
                    value={newAttribute.name}
                    placeholder="name"
                    onChange={(val) => setNewAttribute((prev) => ({ ...prev, name: val }))}
                    width="40%"
                  />
                  <PanelTextInput
                    value={newAttribute.value}
                    placeholder="value"
                    onChange={(val) => setNewAttribute((prev) => ({ ...prev, value: val }))}
                    width="60%"
                  />
                </HStack>
                <PanelStyledButton
                  size="xs"
                  onClick={() => {
                    const name = newAttribute.name.trim();
                    if (!name) return;
                    const value = newAttribute.value;
                    const storeState = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
                    if (node.canvasElement) {
                      const updateElement = storeState.updateElement;
                      if (!updateElement) return;
                      const current = node.canvasElement.data as Record<string, unknown>;
                      const dataKey = mapAttributeNameToDataKey(name, current, defsEditor);
                      updateElement(node.canvasElement.id, { data: { ...current, [dataKey]: value } } as Partial<CanvasElement>);
                      setNewAttribute({ name: '', value: '' });
                      return;
                    }

                    if (defsEditor) {
                      const ctx = { store: storeState, node: nodeSnapshot, attrName: name, rawValue: value } as const;
                      let handled = false;
                      if (nodeSnapshot.childIndex !== undefined && defsEditor.addAttribute) {
                        handled = defsEditor.addAttribute(ctx);
                      }
                      if (!handled && nodeSnapshot.childIndex !== undefined && defsEditor.updateChild) {
                        handled = defsEditor.updateChild(ctx);
                      }
                      if (!handled && defsEditor.addAttribute) {
                        handled = defsEditor.addAttribute(ctx);
                      }
                      if (!handled) {
                        handled = defsEditor.update(ctx);
                      }
                      if (handled) {
                        setNewAttribute({ name: '', value: '' });
                      }
                    }
                  }}
                >
                  Add
                </PanelStyledButton>
              </VStack>
            )}



            {matchingContributions.length > 0 && (
              <VStack spacing={2} align="stretch" pt={1}>
                {matchingContributions.map(renderContribution)}
              </VStack>
            )}
            </VStack>
          );
        })()}
      </VStack>

      {isExpanded && node.children.length > 0 && (
        <VStack spacing={ROW_SPACING} align="stretch" px={0}>
          {node.children.map((child) => (
            <SvgNodeRow
              key={child.key}
              node={child}
              expandedKeys={expandedKeys}
              onToggle={onToggle}
              detailExpandedKeys={detailExpandedKeys}
              onToggleDetails={onToggleDetails}
              attributeExpandedKeys={attributeExpandedKeys}
              onToggleAttributes={onToggleAttributes}
              contributions={contributions}
              elements={elements}
              elementMap={elementMap}
              storeApi={storeApi}
              hiddenElementIds={hiddenElementIds}
              lockedElementIds={lockedElementIds}
              highlightedIds={highlightedIds}
              defsEditors={defsEditors}
              animationTargets={animationTargets}
              referencedDefs={referencedDefs}
              isVirtualShiftActive={isVirtualShiftActive}
              selectedIds={selectedIds}
              setHoveredStructureElementId={setHoveredStructureElementId}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
};
