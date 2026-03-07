import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';
import {
  VStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Checkbox,
  IconButton,
} from '@chakra-ui/react';
import { MoreVertical } from 'lucide-react';
import { Panel } from '../../ui/Panel';
import type { PanelComponentProps } from '../../types/panel';
import { useSidebarPanelState } from '../../contexts/sidebarPanelState';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice } from '../animationSystem/types';
import type { SvgStructureSlice } from './slice';
import type { RegisteredSvgDefsEditor } from '../../utils/svgDefsEditorRegistry';
import type { UiSlice } from '../../store/slices/uiSlice';
import type { SvgStructureAttributeSnapshot } from '../../types/plugins';
import { buildElementMap } from '../../utils/elementMapUtils';
import { pluginManager } from '../../utils/pluginManager';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { useFrozenCanvasStoreValueDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ExportManager } from '../../utils/export/ExportManager';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import type { SvgTreeNode, AnimationTargetKey } from './svgStructureTypes';
import {
  textProps,
  DEF_CONTAINER_TAGS,
  ANIMATION_TAGS,
  LAST_OPEN_NODE_KEY,
  DEFAULT_HIDDEN_TAGS,
  SKIPPED_TAGS,
  isArtboardBackgroundRectNode,
  formatDisplayId,
  findNodeByKey,
  collectCanvasElementIdsFromNode,
  hasTrackedElementsChanged,
  selectAnimatedElementSummary,
} from './svgStructureUtils';
import { SvgNodeRow } from './SvgNodeRow';

const SvgStructurePanelComponent: React.FC<PanelComponentProps> = ({ panelKey }) => {
  const activeDetailElementIdsRef = useRef<Set<string>>(new Set());
  const isPanelVisibleRef = useRef(false);
  const elements = useFrozenCanvasStoreValueDuringDrag(
    useCallback((state) => state.elements, []),
    Object.is,
    useCallback(({
      previousState,
      nextState,
    }: {
      previousState: CanvasStore;
      nextState: CanvasStore;
    }) => {
      if (!isPanelVisibleRef.current) {
        return false;
      }

      return hasTrackedElementsChanged(
        previousState,
        nextState,
        activeDetailElementIdsRef.current
      );
    }, [])
  );
  const elementMap = useMemo(() => buildElementMap(elements), [elements]);
  const {
    directAnimatedElementIdsKey,
    indirectAnimatedElementIdsKey,
  } = useFrozenCanvasStoreValueDuringDrag(
    useCallback(selectAnimatedElementSummary, []),
    shallow
  );

  const enabledPlugins = useEnabledPlugins();
  const enabledPluginsSet = useMemo(() => new Set(enabledPlugins), [enabledPlugins]);
  const contributions = useMemo(
    () =>
      pluginManager
        .getSvgStructureContributions()
        .filter((entry) => enabledPluginsSet.has(entry.pluginId)),
    [enabledPluginsSet]
  );

  const defsEditors = useMemo<RegisteredSvgDefsEditor[]>(
    () =>
      pluginManager
        .getSvgDefsEditors()
        .filter((entry) => enabledPluginsSet.has(entry.pluginId)),
    [enabledPluginsSet]
  );

  const defsRevision = useFrozenCanvasStoreValueDuringDrag(
    useCallback(
      (state) => defsEditors.map((entry) => entry.editor.revisionSelector?.(state as CanvasStore) ?? null),
      [defsEditors]
    ),
    shallow
  );

  const animationTargetKeys = useCanvasStore(
    useShallow((state) => {
      const animations = (state as CanvasStore & AnimationPluginSlice).animations ?? [];
      const targetKeys = new Set<AnimationTargetKey>();

      animations.forEach((anim) => {
        if (anim.gradientTargetId) {
          if (anim.stopIndex === undefined) {
            targetKeys.add(`def:gradient:${anim.gradientTargetId}`);
          } else {
            targetKeys.add(`child:stop:${anim.gradientTargetId}:${anim.stopIndex}`);
          }
        }
        if (anim.patternTargetId) {
          if (anim.patternChildIndex === undefined) {
            targetKeys.add(`def:pattern:${anim.patternTargetId}`);
          } else {
            targetKeys.add(`child:pattern:${anim.patternTargetId}:${anim.patternChildIndex}`);
          }
        }
        if (anim.markerTargetId) {
          if (anim.markerChildIndex === undefined) {
            targetKeys.add(`def:marker:${anim.markerTargetId}`);
          } else {
            targetKeys.add(`child:marker:${anim.markerTargetId}:${anim.markerChildIndex}`);
          }
        }
        if (anim.clipPathTargetId) {
          if (anim.clipPathChildIndex === undefined) {
            targetKeys.add(`def:clippath:${anim.clipPathTargetId}`);
          } else {
            targetKeys.add(`child:clippath:${anim.clipPathTargetId}:${anim.clipPathChildIndex}`);
          }
        }
        if (anim.maskTargetId) {
          if (anim.maskChildIndex === undefined) {
            targetKeys.add(`def:mask:${anim.maskTargetId}`);
          } else {
            targetKeys.add(`child:mask:${anim.maskTargetId}:${anim.maskChildIndex}`);
          }
        }
        if (anim.filterTargetId) {
          if (anim.filterPrimitiveIndex === undefined) {
            targetKeys.add(`def:filter:${anim.filterTargetId}`);
          } else {
            targetKeys.add(`child:filter:${anim.filterTargetId}:${anim.filterPrimitiveIndex}`);
          }
        }
        if (anim.symbolTargetId) {
          if (anim.symbolChildIndex === undefined) {
            targetKeys.add(`def:symbol:${anim.symbolTargetId}`);
          } else {
            targetKeys.add(`child:symbol:${anim.symbolTargetId}:${anim.symbolChildIndex}`);
          }
        }
      });

      return Array.from(targetKeys).sort();
    })
  );
  const animationTargets = useMemo(() => new Set<AnimationTargetKey>(animationTargetKeys), [animationTargetKeys]);

  const referencedDefs = useMemo(() => {
    const used = new Set<string>();
    const contributions = defsContributionRegistry.getContributions();
    contributions.forEach((c) => {
      const ids = c.collectUsedIds ? c.collectUsedIds(elements ?? []) : new Set<string>();
      ids.forEach((id) => used.add(id));
    });
    return used;
  }, [elements]);

  const [tree, setTree] = useState<SvgTreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['svg']));
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<Set<string>>(new Set());
  const [attributeExpandedKeys, setAttributeExpandedKeys] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Set<string>>(new Set());
  const storedEnabledTags = useCanvasStore((state) => (state as CanvasStore & UiSlice).svgStructureEnabledTags);
  const storedShowWithAnimationOnly = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).svgStructureShowWithAnimationOnly
  );
  const setStoredEnabledTags = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).setSvgStructureEnabledTags
  );
  const setStoredShowWithAnimationOnly = useCanvasStore(
    (state) => (state as CanvasStore & UiSlice).setSvgStructureShowWithAnimationOnly
  );
  const [enabledTags, setEnabledTags] = useState<Set<string>>(
    () => new Set(storedEnabledTags ?? [])
  );
  const [showWithAnimationOnly, setShowWithAnimationOnly] = useState(storedShowWithAnimationOnly ?? false);
  const hiddenElementIds = useCanvasStore((state) => state.hiddenElementIds ?? []);
  const lockedElementIds = useCanvasStore((state) => state.lockedElementIds ?? []);
  const hiddenElementIdSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const lockedElementIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);
  const selectedIds = useCanvasStore((state) => state.selectedIds ?? []);
  const isVirtualShiftActive = useCanvasStore((state) => state.isVirtualShiftActive ?? false);
  const setHoveredStructureElementId = useCanvasStore((state) => (state as unknown as SvgStructureSlice).setHoveredStructureElementId);
  const { openPanelKey } = useSidebarPanelState();
  const isPanelVisible = panelKey ? (openPanelKey === panelKey || openPanelKey === null) : false;

  const [rememberedNodeKey, setRememberedNodeKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(LAST_OPEN_NODE_KEY);
    } catch {
      return null;
    }
  });
  const lastDetailKeyRef = useRef<string | null>(rememberedNodeKey);
  const nodeListRef = useRef<HTMLDivElement | null>(null);

  const activeDetailElementIds = useMemo(() => {
    if (!tree || detailExpandedKeys.size === 0) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    detailExpandedKeys.forEach((key) => {
      const node = findNodeByKey(tree, key);
      if (!node) {
        return;
      }
      collectCanvasElementIdsFromNode(node, ids);
    });

    return ids;
  }, [detailExpandedKeys, tree]);

  useEffect(() => {
    lastDetailKeyRef.current = rememberedNodeKey;
  }, [rememberedNodeKey]);

  useEffect(() => {
    activeDetailElementIdsRef.current = activeDetailElementIds;
  }, [activeDetailElementIds]);

  useEffect(() => {
    isPanelVisibleRef.current = isPanelVisible;
  }, [isPanelVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (rememberedNodeKey) {
        localStorage.setItem(LAST_OPEN_NODE_KEY, rememberedNodeKey);
      } else {
        localStorage.removeItem(LAST_OPEN_NODE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [rememberedNodeKey]);

  useEffect(() => {
    if (!isPanelVisible || !rememberedNodeKey || !tree) return;
    setExpandedKeys((prevExpanded) => {
      const next = new Set(prevExpanded);
      const parts = rememberedNodeKey.split('.');
      let prefix = '';
      parts.forEach((part, index) => {
        prefix = index === 0 ? part : `${prefix}.${part}`;
        next.add(prefix);
      });
      return next;
    });
    setDetailExpandedKeys((prev) => {
      if (prev.size === 1 && prev.has(rememberedNodeKey)) return prev;
      return new Set([rememberedNodeKey]);
    });
  }, [isPanelVisible, rememberedNodeKey, tree]);

  const storeApi = useMemo(() => ({
    getState: canvasStoreApi.getState,
    setState: canvasStoreApi.setState,
    subscribe: canvasStoreApi.subscribe,
  }), []);

  const collectDescendants = useCallback((id: string, acc: Set<string>) => {
    const el = elementMap.get(id);
    if (!el || el.type !== 'group') return;
    const childIds = (el.data as { childIds?: string[] }).childIds ?? [];
    childIds.forEach((childId) => {
      if (acc.has(childId)) return;
      acc.add(childId);
      collectDescendants(childId, acc);
    });
  }, [elementMap]);

  const highlightedIds = useMemo(() => {
    const acc = new Set<string>();
    selectedIds.forEach((id) => {
      acc.add(id);
      collectDescendants(id, acc);
    });
    return acc;
  }, [collectDescendants, selectedIds]);

  const directAnimatedElementIds = useMemo(
    () => new Set(directAnimatedElementIdsKey ? directAnimatedElementIdsKey.split('\u0001') : []),
    [directAnimatedElementIdsKey]
  );
  const indirectAnimatedElementIds = useMemo(
    () => new Set(indirectAnimatedElementIdsKey ? indirectAnimatedElementIdsKey.split('\u0001') : []),
    [indirectAnimatedElementIdsKey]
  );

  const buildNode = useCallback(
    (
      el: Element,
      path: string,
      inDefs: boolean,
      parentId: string | null = null,
      childIndex?: number,
      numberPath: string | null = null
    ): SvgTreeNode | null => {
      const tagName = el.tagName.toLowerCase();
      if (SKIPPED_TAGS.has(tagName)) return null;
      if (isArtboardBackgroundRectNode(el, tagName)) return null;
      if (tagName !== 'svg' && availableTags.size > 0 && !enabledTags.has(tagName)) return null;
      const idAttribute = el.getAttribute('id');
      const dataElementId = el.getAttribute('data-element-id');
      const idType = idAttribute ? 'id' : dataElementId ? 'data' : null;
      // Resolve the canvas element early so we can use data.name as display label
      const canvasElement = dataElementId
        ? elementMap.get(dataElementId)
        : idAttribute
          ? elementMap.get(idAttribute)
          : undefined;
      const elementDataName = (canvasElement?.data as Record<string, unknown> | undefined)?.name as string | undefined;
      const displayId = elementDataName || formatDisplayId(idAttribute ?? dataElementId, idType, tagName);
      const attributes: SvgStructureAttributeSnapshot[] = Array.from(el.attributes)
        .filter((attr) => attr.name !== 'id' && !attr.name.startsWith('xmlns'))
        .map((attr) => ({
          name: attr.name,
          value: attr.value,
        }));
      const nextIsDefs = inDefs || tagName === 'defs';

      const childElements = Array.from(el.children);

      // When in defs, calculate adjusted child indices (excluding animation elements)
      let adjustedIdx = 0;
      let visibleChildIdx = 0;
      const children: SvgTreeNode[] = [];
      childElements.forEach((child, _domIdx) => {
        const childTagName = child.tagName.toLowerCase();
        const isAnimationElement = ANIMATION_TAGS.has(childTagName);

        // For defs, use adjusted index that excludes animation elements
        // For non-defs, use DOM index
        const effectiveChildIndex = nextIsDefs && !isAnimationElement ? adjustedIdx : _domIdx;

        // Only increment adjusted index for non-animation elements
        if (!isAnimationElement) {
          adjustedIdx++;
        }

        const nextVisibleNumber = String(visibleChildIdx + 1);
        const childNumberPath = numberPath ? `${numberPath}.${nextVisibleNumber}` : nextVisibleNumber;
        const childNode = buildNode(
          child,
          `${path}.${_domIdx}`,
          nextIsDefs,
          idAttribute ?? dataElementId ?? parentId,
          effectiveChildIndex,
          childNumberPath
        );
        if (!childNode) {
          return;
        }
        children.push(childNode);
        visibleChildIdx++;
      });
      return {
        key: path,
        numberPath,
        tagName,
        idAttribute,
        dataElementId,
        displayId,
        isDefs: nextIsDefs,
        // For defs children, keep the owner as the nearest defs ancestor (parentId) even if the child has its own id
        defsOwnerId: nextIsDefs ? (parentId ?? idAttribute ?? null) : undefined,
        childIndex,
        attributes,
        children,
        canvasElement,
      };
    },
    [availableTags, elementMap, enabledTags]
  );

  const rebuildTree = useCallback(() => {
    if (typeof DOMParser === 'undefined') return;

    const state = (storeApi.getState?.() ?? canvasStoreApi.getState()) as CanvasStore;
    const { content } = ExportManager.generateSvgContent(false, 0, state);

    if (!content) {
      setTree(null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    const svg = doc.querySelector('svg');

    if (parseError || !svg) {
      setTree(null);
      return;
    }

    const discoveredTags = new Set<string>();
    const collectTags = (el: Element) => {
      discoveredTags.add(el.tagName.toLowerCase());
      Array.from(el.children).forEach(collectTags);
    };
    collectTags(svg);
    const availableChanged =
      discoveredTags.size !== availableTags.size || Array.from(discoveredTags).some((tag) => !availableTags.has(tag));
    if (availableChanged) {
      setAvailableTags(discoveredTags);
    }
    setEnabledTags((prev) => {
      if (prev.size === 0) {
        const next = new Set(
          Array.from(discoveredTags).filter((tag) => tag !== 'svg' && !DEFAULT_HIDDEN_TAGS.has(tag))
        );
        queueMicrotask(() => setStoredEnabledTags(Array.from(next)));
        return next;
      }
      const next = new Set<string>();
      const previousAvailable = availableTags;
      discoveredTags.forEach((tag) => {
        const isNewTag = !previousAvailable.has(tag);
        if (prev.has(tag) || (isNewTag && !DEFAULT_HIDDEN_TAGS.has(tag))) {
          next.add(tag);
        }
      });
      const isSame = next.size === prev.size && Array.from(next).every((tag) => prev.has(tag));
      if (!isSame) {
        queueMicrotask(() => setStoredEnabledTags(Array.from(next)));
      }
      return isSame ? prev : next;
    });

    const nextTree = buildNode(svg, 'svg', false, svg.getAttribute('id'));
    if (!nextTree) {
      setTree(null);
      return;
    }
    setTree(nextTree);
    setExpandedKeys((prev) => {
      if (prev.size > 0) return prev;
      const initial = new Set<string>(['svg']);
      const defsChild = nextTree.children.find((child) => child.tagName === 'defs');
      if (defsChild) initial.add(defsChild.key);
      return initial;
    });
  }, [availableTags, buildNode, setStoredEnabledTags, storeApi]);

  useEffect(() => {
    rebuildTree();
  }, [elements, defsRevision, rebuildTree]);

  useEffect(() => {
    if (!isPanelVisible || !lastDetailKeyRef.current) return;
    const container = nodeListRef.current;
    const target = container?.querySelector(`[data-node-key="${lastDetailKeyRef.current}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center' });
    }
  }, [isPanelVisible, tree]);

  const handleToggle = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleAttributes = useCallback((key: string) => {
    setAttributeExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleDetails = useCallback((key: string) => {
    setDetailExpandedKeys((prev) => {
      if (prev.has(key)) {
        setRememberedNodeKey(null);
        return new Set();
      }
      setRememberedNodeKey(key);
      return new Set([key]);
    });
  }, []);

  const themeColors = useThemeColors();
  const menuListProps = {
    bg: themeColors.menu.bg,
    border: '1px solid',
    borderColor: themeColors.menu.borderColor,
    borderRadius: 'lg',
    boxShadow: 'lg',
    py: 1,
  };

  const menuItemProps = {
    bg: themeColors.menu.bg,
    color: themeColors.menu.iconColor,
    _hover: { bg: themeColors.menu.hoverBg },
    _focus: { outline: 'none', boxShadow: 'none', bg: themeColors.menu.bg },
    _active: { outline: 'none', bg: themeColors.menu.bg },
    fontSize: '14px',
    fontWeight: 'medium',
    px: 3,
    py: 2,
    gap: 2,
  };

  const availableTagList = useMemo(() => {
    const tags = Array.from(availableTags).filter((tag) => tag !== 'svg');
    tags.sort();
    return tags;
  }, [availableTags]);

  const rootsToRender = useMemo(() => {
    if (!tree) return [];
    if (!showWithAnimationOnly) return [tree];

    const nodeHasAnimationBadge = (node: SvgTreeNode): boolean => {
      const tag = node.tagName.toLowerCase();

      if (node.isDefs) {
        const ownerId = node.defsOwnerId ?? node.idAttribute ?? null;
        if (!ownerId) return false;

        if (DEF_CONTAINER_TAGS.has(tag) && node.idAttribute) {
          if (tag === 'lineargradient' || tag === 'radialgradient') {
            return animationTargets.has(`def:gradient:${ownerId}` as AnimationTargetKey);
          }
          if (tag === 'pattern') return animationTargets.has(`def:pattern:${ownerId}` as AnimationTargetKey);
          if (tag === 'marker') return animationTargets.has(`def:marker:${ownerId}` as AnimationTargetKey);
          if (tag === 'clippath') return animationTargets.has(`def:clippath:${ownerId}` as AnimationTargetKey);
          if (tag === 'mask') return animationTargets.has(`def:mask:${ownerId}` as AnimationTargetKey);
          if (tag === 'filter') return animationTargets.has(`def:filter:${ownerId}` as AnimationTargetKey);
          if (tag === 'symbol') return animationTargets.has(`def:symbol:${ownerId}` as AnimationTargetKey);
          return false;
        }

        const index = node.childIndex;
        if (index === undefined) return false;

        if (tag === 'stop') return animationTargets.has(`child:stop:${ownerId}:${index}` as AnimationTargetKey);
        return (
          animationTargets.has(`child:pattern:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:symbol:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:filter:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:marker:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:clippath:${ownerId}:${index}` as AnimationTargetKey) ||
          animationTargets.has(`child:mask:${ownerId}:${index}` as AnimationTargetKey)
        );
      }

      const elementId = node.dataElementId ?? node.idAttribute ?? node.canvasElement?.id ?? null;
      if (!elementId) return false;

      return directAnimatedElementIds.has(elementId) || indirectAnimatedElementIds.has(elementId);
    };

    const filterNode = (node: SvgTreeNode): SvgTreeNode[] => {
      const filteredChildren = node.children.flatMap(filterNode);
      if (!nodeHasAnimationBadge(node)) {
        return filteredChildren;
      }
      return [{ ...node, children: filteredChildren }];
    };

    return filterNode(tree);
  }, [
    animationTargets,
    directAnimatedElementIds,
    indirectAnimatedElementIds,
    showWithAnimationOnly,
    tree,
  ]);

  const headerActions = (
    <Menu closeOnSelect={false} isLazy>
      <MenuButton
        as={IconButton}
        aria-label="Filter element types"
        icon={<MoreVertical size={14} />}
        size="xs"
        variant="ghost"
        borderRadius="full"
        minW="24px"
        h="24px"
        p={0}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <MenuList
        {...menuListProps}
        minW="180px"
        maxH="240px"
        overflowY="auto"
        px={0}
        py={1}
        sx={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '4px',
          },
        }}
      >
        <MenuItem
          {...menuItemProps}
          closeOnSelect={false}
          onClick={(e) => {
            e.stopPropagation();
            setShowWithAnimationOnly((prev) => {
              const next = !prev;
              setStoredShowWithAnimationOnly(next);
              return next;
            });
          }}
        >
          <Checkbox
            isChecked={showWithAnimationOnly}
            pointerEvents="none"
            size="sm"
          >
            only with animation
          </Checkbox>
        </MenuItem>
        <MenuDivider />
        {availableTagList.length === 0 && <MenuItem {...menuItemProps} isDisabled>No element types</MenuItem>}
        {availableTagList.map((tag) => (
          <MenuItem
            {...menuItemProps}
            key={tag}
            closeOnSelect={false}
            onClick={(e) => {
              e.stopPropagation();
              setEnabledTags((prev) => {
                const next = new Set(prev);
                if (next.has(tag)) {
                  next.delete(tag);
                } else {
                  next.add(tag);
                }
                setStoredEnabledTags(Array.from(next));
                return next;
              });
            }}
          >
            <Checkbox
              isChecked={enabledTags.has(tag)}
              pointerEvents="none"
              size="sm"
            >
              {tag}
            </Checkbox>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );

  return (
    <Panel
      title="Structure"
      panelKey={panelKey}
      isCollapsible={false}
      isMaximizable={false}
      defaultOpen={true}
      headerActions={headerActions}
    >
      <VStack spacing={0.5} align="stretch" px={0} py={0} ref={nodeListRef}>
        {!tree && (
          <Text {...textProps}>SVG root is not available yet.</Text>
        )}
        {tree && rootsToRender.map((root) => (
          <SvgNodeRow
            key={root.key}
            node={root}
            expandedKeys={expandedKeys}
            onToggle={handleToggle}
            detailExpandedKeys={detailExpandedKeys}
            onToggleDetails={handleToggleDetails}
            attributeExpandedKeys={attributeExpandedKeys}
            onToggleAttributes={handleToggleAttributes}
            contributions={contributions}
            elements={elements}
            elementMap={elementMap}
            storeApi={storeApi}
            hiddenElementIds={hiddenElementIdSet}
            lockedElementIds={lockedElementIdSet}
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
    </Panel>
  );
};

export const SvgStructurePanel = React.memo(SvgStructurePanelComponent);
