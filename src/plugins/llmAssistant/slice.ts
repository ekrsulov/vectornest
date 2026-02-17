import type { PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

type FullStore = CanvasStore & LlmAssistantSlice;
import type { CanvasElement, CanvasElementInput, GroupElement, GroupData } from '../../types';
import { generateShortId } from '../../utils/idGenerator';
import { buildElementMap } from '../../utils';
import { runCleanupHooks } from '../../store/cleanupHookRegistry';
import { pluginManager } from '../../utils/pluginManager';
import { ExportManager } from '../../utils/export/ExportManager';
import { processSvgFile } from '../../utils/importProcessingUtils';
import { addImportedElementsToCanvas, translateImportedElements } from '../../utils/importHelpers';
import { mergeImportedResources } from '../../utils/importContributionRegistry';

import { buildLlmAssistantContext } from './llmContext';
import {
  EMPTY_SVG,
  extractAndSanitizeSvgFromLlmResponse,
  stripThinkFromLlmResponse,
  type LlmAssistantMode,
} from './llmProtocol';
import { buildLlmAssistantSystemPrompt } from './llmPrompts';
import type { LlmAssistantProviderConfig } from './llmClient';
import { callLlmChatCompletion } from './llmClient';

type LlmStatus = 'idle' | 'running' | 'success' | 'error';

const HISTORY_STORAGE_KEY = 'vectornest.llmAssistant.history';
const STATS_STORAGE_KEY = 'vectornest.llmAssistant.stats';
const SETTINGS_STORAGE_KEY = 'vectornest.llmAssistant.settings';
const HISTORY_LIMIT = 50;

type ChildIdContainer = { childIds?: string[] };

const safeChildIds = (data: ChildIdContainer | null | undefined): string[] => (
  Array.isArray(data?.childIds) ? data.childIds : []
);

export interface LlmAssistantHistoryItem {
  id: string;
  prompt: string;
  mode: LlmAssistantMode;
  createdAt: number;
  summary: string | null;
  staged: LlmAssistantStagedSvg | null;
  raw: string | null;
  reasoning?: string | null;
  endpoint?: string;
  model?: string;
  tokens?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null;
}

export interface LlmTokenStatsEntry {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  callCount: number;
}

const readHistoryFromStorage = (): LlmAssistantHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.prompt === 'string' &&
          typeof item.mode === 'string' &&
          typeof item.createdAt === 'number'
      )
      .slice(0, HISTORY_LIMIT)
      .map((item) => ({
        id: item.id,
        prompt: item.prompt,
        mode: item.mode as LlmAssistantMode,
        createdAt: item.createdAt,
        summary: typeof item.summary === 'string' ? item.summary : null,
        staged: item.staged ?? null,
        raw: typeof item.raw === 'string' ? item.raw : null,
        reasoning: typeof item.reasoning === 'string' ? item.reasoning : null,
        endpoint: typeof item.endpoint === 'string' ? item.endpoint : undefined,
        model: typeof item.model === 'string' ? item.model : undefined,
        tokens: item.tokens ?? null,
      }));
  } catch {
    return [];
  }
};

const persistHistoryToStorage = (history: LlmAssistantHistoryItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  } catch {
    // ignore persistence errors
  }
};

const normalizeEndpoint = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const readStatsFromStorage = (): Record<string, LlmTokenStatsEntry> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, LlmTokenStatsEntry> = {};
    Object.entries(parsed as Record<string, Partial<LlmTokenStatsEntry>>).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') return;
      const endpoint = typeof value.endpoint === 'string' ? value.endpoint : '';
      const model = typeof value.model === 'string' ? value.model : '';
      if (!endpoint || !model) return;
      result[key] = {
        endpoint,
        model,
        promptTokens: typeof value.promptTokens === 'number' ? value.promptTokens : 0,
        completionTokens: typeof value.completionTokens === 'number' ? value.completionTokens : 0,
        totalTokens: typeof value.totalTokens === 'number' ? value.totalTokens : 0,
        callCount: typeof value.callCount === 'number' ? value.callCount : 0,
      };
    });
    return result;
  } catch {
    return {};
  }
};

const persistStatsToStorage = (stats: Record<string, LlmTokenStatsEntry>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore persistence errors
  }
};

const DEFAULT_SETTINGS: LlmAssistantSlice['llmAssistant']['settings'] = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0,
  maxTokens: 800,
};

const readSettingsFromStorage = (): LlmAssistantSlice['llmAssistant']['settings'] => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;
    return {
      provider: parsed.provider === 'openai' || parsed.provider === 'openai-compatible' ? parsed.provider : DEFAULT_SETTINGS.provider,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : DEFAULT_SETTINGS.baseUrl,
      model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_SETTINGS.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_SETTINGS.temperature,
      maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : DEFAULT_SETTINGS.maxTokens,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const persistSettingsToStorage = (settings: LlmAssistantSlice['llmAssistant']['settings']) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore persistence errors
  }
};

export interface LlmAssistantStagedSvg {
  mode: LlmAssistantMode;
  svg: string;
  source: {
    selectionIds: string[];
    targetParentId: string | null;
    targetCenter: { x: number; y: number };
    activeGroupId: string | null;
  };
}

export interface LlmAssistantSlice {
  llmAssistant: {
    settings: {
      provider: LlmAssistantProviderConfig['provider'];
      baseUrl: string;
      model: string;
      apiKey: string;
      temperature: number;
      maxTokens: number;
    };
    runtime: {
      status: LlmStatus;
      error: string | null;
      promptDraft: string;
      lastRawResponse: string | null;
      lastThink: string | null;
      staged: LlmAssistantStagedSvg | null;
      stagedSummary: string | null;
      history: LlmAssistantHistoryItem[];
      tokenStats: Record<string, LlmTokenStatsEntry>;
    };
  };
  updateLlmAssistantSettings: (updates: Partial<LlmAssistantSlice['llmAssistant']['settings']>) => void;
  updateLlmAssistantRuntime: (updates: Partial<LlmAssistantSlice['llmAssistant']['runtime']>) => void;
  runLlmAssistant: (prompt: string) => Promise<void>;
  cancelLlmAssistant: () => void;
  clearLlmAssistantResult: () => void;
  applyLlmAssistantStaged: () => Promise<void>;
  clearLlmAssistantHistory: () => void;
  deleteLlmAssistantHistoryItem: (id: string) => void;
}

const LLM_GENERATED_GROUP_NAME = 'LLM Generated';

let activeAbortController: AbortController | null = null;

const getExpectedMode = (selectedIds: string[]): LlmAssistantMode =>
  selectedIds.length > 0 ? 'editSelection' : 'insertNew';

const computeCommonParentId = (elements: CanvasElement[], ids: string[]): string | null => {
  const selected = elements.filter((el) => ids.includes(el.id));
  if (selected.length === 0) return null;
  const parentIds = new Set(selected.map((el) => el.parentId));
  return parentIds.size === 1 ? selected[0].parentId : null;
};

const buildMessages = (args: {
  expectedMode: LlmAssistantMode;
  prompt: string;
  context: ReturnType<typeof buildLlmAssistantContext>;
  selectionSvg: string | null;
}): Array<{ role: 'system' | 'user'; content: string }> => {
  const system = buildLlmAssistantSystemPrompt({ expectedMode: args.expectedMode });

  const context = {
    document: args.context.document,
    selection: {
      ids: args.context.selection.ids,
      bounds: args.context.selection.bounds,
    },
    styleDefaults: args.context.styleDefaults,
  };

  const userParts = [
    `User prompt:\n${args.prompt}`,
    '',
    `Context (JSON):\n${JSON.stringify(context)}`,
  ];

  if (args.expectedMode === 'editSelection') {
    userParts.push('', 'Selection SVG to modify (return the modified SVG only):', args.selectionSvg ?? EMPTY_SVG);
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: userParts.join('\n') },
  ];
};

const createGroup = (
  elements: CanvasElement[],
  name: string,
  parentId: string | null
): { groupId: string; nextElements: CanvasElement[] } => {
  const groupId = generateShortId('grp');
  const siblings = elements.filter((el) => el.parentId === parentId);
  const zIndex = siblings.length ? Math.max(...siblings.map((el) => el.zIndex)) + 1 : 0;

  const groupElement: GroupElement = {
    id: groupId,
    type: 'group',
    parentId,
    zIndex,
    data: {
      childIds: [],
      name,
      isLocked: false,
      isHidden: false,
      isExpanded: true,
      transform: {
        translateX: 0,
        translateY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
  };

  return { groupId, nextElements: [...elements, groupElement] };
};

const deleteElementPure = (
  elements: CanvasElement[],
  id: string
): { elements: CanvasElement[]; deletedIds: string[] } => {
  const elementMap = buildElementMap(elements);
  const elementToDelete = elementMap.get(id);
  if (!elementToDelete) return { elements, deletedIds: [] };

  const parentId = elementToDelete.parentId;
  const idsToDelete: string[] = [id];
  const idsToDeleteSet = new Set(idsToDelete);

  let updatedElements = elements;

  if (elementToDelete.type === 'group') {
    const queue = [...safeChildIds((elementToDelete as GroupElement).data as ChildIdContainer)];

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const childId = queue[queueIndex];
      if (idsToDeleteSet.has(childId)) continue;

      idsToDelete.push(childId);
      idsToDeleteSet.add(childId);

      const child = elementMap.get(childId);
      if (child && child.type === 'group') {
        queue.push(...safeChildIds((child as GroupElement).data as ChildIdContainer));
      }
    }

    updatedElements = updatedElements.filter((el) => !idsToDeleteSet.has(el.id));
  } else {
    updatedElements = updatedElements.filter((el) => el.id !== id);
  }

  // Remove references to deleted elements from remaining groups
  updatedElements = updatedElements.map((el) => {
    if (el.type !== 'group') return el;
    const existingChildIds = safeChildIds(el.data as GroupData);
    const filteredChildIds = existingChildIds.filter((childId) => !idsToDeleteSet.has(childId));
    if (filteredChildIds.length === existingChildIds.length) return el;
    return {
      ...el,
      data: {
        ...(el.data as GroupData),
        childIds: filteredChildIds,
      },
    };
  });

  // If deleting a non-group element from a group that now has only one child, ungroup it
  if (elementToDelete.type !== 'group' && parentId) {
    const parentElement = updatedElements.find((el) => el.id === parentId);
    const parentData = parentElement?.type === 'group' ? (parentElement.data as GroupData) : null;
    const parentChildIds = safeChildIds(parentData);
    if (
      parentElement &&
      parentElement.type === 'group' &&
      parentChildIds.length === 1
    ) {
      const singleChildId = parentChildIds[0];
      const grandParentId = parentElement.parentId;

      updatedElements = updatedElements.map((el) => (el.id === singleChildId ? { ...el, parentId: grandParentId } : el));

      updatedElements = updatedElements.filter((el) => el.id !== parentId);

      if (grandParentId) {
        updatedElements = updatedElements.map((el) => {
          if (el.id !== grandParentId || el.type !== 'group') return el;
          const groupChildIds = safeChildIds(el.data as GroupData);
          const newChildIds = groupChildIds.map((childId) => (childId === parentId ? singleChildId : childId));
          return {
            ...el,
            data: {
              ...(el.data as GroupData),
              childIds: newChildIds,
            },
          };
        });
      }
    }
  }

  return { elements: updatedElements, deletedIds: idsToDelete };
};

export const createLlmAssistantSlice: PluginSliceFactory<CanvasStore> = (set, get) => {
  const initialSettings = readSettingsFromStorage();
  return {
    state: {
      llmAssistant: {
        settings: initialSettings,
        runtime: {
          status: 'idle',
          error: null,
          promptDraft: '',
          lastRawResponse: null,
      lastThink: null,
          staged: null,
          stagedSummary: null,
          history: readHistoryFromStorage(),
          tokenStats: readStatsFromStorage(),
        },
      },
      updateLlmAssistantSettings: (updates: Partial<LlmAssistantSlice['llmAssistant']['settings']>) => {
        set((state) => {
          const current = (state as unknown as LlmAssistantSlice).llmAssistant;
          const mergedSettings = { ...current.settings, ...updates };
          persistSettingsToStorage(mergedSettings);
          return {
            llmAssistant: {
              ...current,
              settings: mergedSettings,
            },
          } as Partial<CanvasStore>;
        });
      },
    updateLlmAssistantRuntime: (updates: Partial<LlmAssistantSlice['llmAssistant']['runtime']>) =>
      set((state) => {
        const current = (state as unknown as LlmAssistantSlice).llmAssistant;
        return {
          llmAssistant: {
            ...current,
            runtime: { ...current.runtime, ...updates },
          },
        } as Partial<CanvasStore>;
      }),
    runLlmAssistant: async (prompt: string) => {
      const state = get() as FullStore;
      const settings = state.llmAssistant.settings;
      const selectedIds = state.selectedIds ?? [];
      const expectedMode = getExpectedMode(selectedIds);

      if (activeAbortController) {
        activeAbortController.abort();
      }
      const controller = new AbortController();
      activeAbortController = controller;

      state.updateLlmAssistantRuntime({
        status: 'running',
        error: null,
        lastRawResponse: null,
        lastThink: null,
        staged: null,
        stagedSummary: null,
        promptDraft: prompt,
      });

      const context = buildLlmAssistantContext(state);
      const selectionSvg =
        expectedMode === 'editSelection'
          ? ExportManager.generateSvgContent(true, 0, state).content || EMPTY_SVG
          : null;

      const messages = buildMessages({
        expectedMode,
        prompt,
        context,
        selectionSvg,
      });

      const result = await callLlmChatCompletion(
        {
          provider: settings.provider,
          baseUrl: settings.baseUrl,
          model: settings.model,
          apiKey: settings.apiKey,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        },
        messages,
        controller.signal
      );

      if (activeAbortController === controller) {
        activeAbortController = null;
      }

      if (!result.ok) {
        state.updateLlmAssistantRuntime({
          status: result.isAbort ? 'idle' : 'error',
          error: result.isAbort ? null : result.error,
        });
        return;
      }

      const stripped = stripThinkFromLlmResponse(result.content);

      const sanitized = extractAndSanitizeSvgFromLlmResponse(stripped.content, {
        allowForeignObject: false,
        allowExternalUrls: true,
      });

      if (!sanitized.ok) {
        state.updateLlmAssistantRuntime({
          status: 'error',
          error: sanitized.error,
          lastRawResponse: stripped.content,
          lastThink: stripped.think ?? null,
        });
        return;
      }

      const targetParentId =
        expectedMode === 'editSelection' ? computeCommonParentId(state.elements, selectedIds) : null;
      const bounds = context.selection.bounds;
      const targetCenter =
        bounds && Number.isFinite(bounds.centerX) && Number.isFinite(bounds.centerY)
          ? { x: bounds.centerX, y: bounds.centerY }
          : context.document.insertAt;

      const stagedValue: LlmAssistantStagedSvg = {
        mode: expectedMode,
        svg: sanitized.svg,
        source: {
          selectionIds: selectedIds,
          targetParentId,
          targetCenter,
          activeGroupId: context.document.activeGroupId,
        },
      };

      const endpoint = normalizeEndpoint(settings.baseUrl);
      const model = settings.model;
      const usage = result.usage ?? {};

      const historyEntry: LlmAssistantHistoryItem = {
        id: generateShortId('llmh'),
        prompt,
        mode: expectedMode,
        createdAt: Date.now(),
        summary: expectedMode === 'insertNew' ? 'SVG generated' : 'SVG updated',
        staged: stagedValue,
        raw: stripped.content,
        reasoning: result.reasoningContent ?? stripped.think ?? null,
        endpoint,
        model,
        tokens: usage,
      };

      set((storeState) => {
        const current = storeState as FullStore;
        const prevHistory = current.llmAssistant.runtime.history ?? [];
        const nextHistory = [historyEntry, ...prevHistory].slice(0, HISTORY_LIMIT);
        persistHistoryToStorage(nextHistory);

        const currentStats = current.llmAssistant.runtime.tokenStats ?? {};
        const statsKey = `${endpoint}|${model}`;
        const prevStats = currentStats[statsKey] ?? {
          endpoint,
          model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          callCount: 0,
        };
        const updatedStats: LlmTokenStatsEntry = {
          endpoint,
          model,
          promptTokens: prevStats.promptTokens + (usage.promptTokens ?? 0),
          completionTokens: prevStats.completionTokens + (usage.completionTokens ?? 0),
          totalTokens: prevStats.totalTokens + (usage.totalTokens ?? 0),
          callCount: prevStats.callCount + 1,
        };
        const nextStats = { ...currentStats, [statsKey]: updatedStats };
        persistStatsToStorage(nextStats);

        return {
          llmAssistant: {
            ...current.llmAssistant,
            runtime: {
              ...current.llmAssistant.runtime,
              status: 'success',
              error: null,
              lastRawResponse: stripped.content,
              lastThink: result.reasoningContent ?? stripped.think ?? null,
              staged: stagedValue,
              stagedSummary: expectedMode === 'insertNew' ? 'SVG generated' : 'SVG updated',
              history: nextHistory,
              tokenStats: nextStats,
            },
          },
        } as Partial<CanvasStore>;
      });
    },
    cancelLlmAssistant: () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      set((state) => {
        const current = (state as unknown as LlmAssistantSlice).llmAssistant;
        return {
          llmAssistant: {
            ...current,
            runtime: { ...current.runtime, status: 'idle', error: null },
          },
        } as Partial<CanvasStore>;
      });
    },
    clearLlmAssistantResult: () => {
      set((state) => {
        const current = (state as unknown as LlmAssistantSlice).llmAssistant;
        return {
          llmAssistant: {
            ...current,
            runtime: {
              ...current.runtime,
              error: null,
              lastRawResponse: null,
              lastThink: null,
              staged: null,
              stagedSummary: null,
              status: 'idle',
            },
          },
        } as Partial<CanvasStore>;
      });
    },
    applyLlmAssistantStaged: async () => {
      const state = get() as FullStore;
      const staged = state.llmAssistant.runtime.staged;
      if (!staged) return;
      if (state.llmAssistant.runtime.status === 'running') return;

      state.updateLlmAssistantRuntime({ status: 'running', error: null });

      let processed: Awaited<ReturnType<typeof processSvgFile>> | null = null;
      try {
        const file = new File([staged.svg], 'llm.svg', { type: 'image/svg+xml' });
        processed = await processSvgFile(file, {
          resizeImport: false,
          resizeWidth: 0,
          resizeHeight: 0,
          applyUnion: false,
        });
      } catch (error) {
        state.updateLlmAssistantRuntime({
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to parse SVG.',
        });
        return;
      }

      if (!processed) {
        state.updateLlmAssistantRuntime({ status: 'error', error: 'No elements found in SVG.' });
        return;
      }

      const importedBounds = processed.bounds;
      const importedCenterX = (importedBounds.minX + importedBounds.maxX) / 2;
      const importedCenterY = (importedBounds.minY + importedBounds.maxY) / 2;
      const deltaX = staged.source.targetCenter.x - importedCenterX;
      const deltaY = staged.source.targetCenter.y - importedCenterY;

      const translatedElements = translateImportedElements(processed.elements, deltaX, deltaY);

      let didDelete = false;
      let didChangeSelection = false;
      let sourceIdMap: Map<string, string> = new Map();
      const pluginImports = processed.pluginImports ?? {};

      set((storeState) => {
        const current = storeState as FullStore;
        let updatedElements = [...current.elements];

        const deletedIds: string[] = [];
        if (staged.mode === 'editSelection') {
          staged.source.selectionIds.forEach((id) => {
            const res = deleteElementPure(updatedElements, id);
            updatedElements = res.elements;
            deletedIds.push(...res.deletedIds);
          });
        }

        const uniqueDeletedIds = Array.from(new Set(deletedIds));
        if (uniqueDeletedIds.length > 0) {
          didDelete = true;
        }

        let parentId: string | null = null;
        if (staged.mode === 'insertNew') {
          const initialParentId = staged.source.activeGroupId ?? null;
          const initialParentExists =
            initialParentId && updatedElements.some((el) => el.id === initialParentId && el.type === 'group');
          parentId = initialParentExists ? initialParentId : null;
          if (!parentId) {
            const res = createGroup(updatedElements, LLM_GENERATED_GROUP_NAME, null);
            parentId = res.groupId;
            updatedElements = res.nextElements;
          }
        } else {
          parentId = staged.source.targetParentId ?? staged.source.activeGroupId ?? null;
        }

        const tempElements: CanvasElement[] = [...updatedElements];
        const maxZIndex = tempElements.length > 0 ? Math.max(...tempElements.map((e) => e.zIndex)) : -1;
        const globalZIndexCounter = { value: maxZIndex + 1 };

        let groupCounter = 1;
        const getNextGroupName = () => `${LLM_GENERATED_GROUP_NAME} ${groupCounter++}`;

        const addElement = (element: CanvasElementInput, zIndex?: number) => {
          const id = generateShortId('el');
          tempElements.push({
            ...(element as CanvasElement),
            parentId: element.parentId ?? null,
            id,
            zIndex: zIndex ?? globalZIndexCounter.value++,
          } as CanvasElement);
          return id;
        };

        const updateElement = (id: string, updates: Partial<CanvasElement>) => {
          const idx = tempElements.findIndex((el) => el.id === id);
          if (idx === -1) return;
          const element = tempElements[idx];
          const updatedData = updates.data
            ? { ...(element.data as Record<string, unknown>), ...(updates.data as Record<string, unknown>) }
            : element.data;
          tempElements[idx] = { ...element, ...updates, data: updatedData } as CanvasElement;
        };

        const { childIds, sourceIdMap: nextSourceIdMap, hiddenElementIds } = addImportedElementsToCanvas(
          translatedElements,
          addElement,
          updateElement,
          getNextGroupName,
          parentId,
          globalZIndexCounter
        );
        sourceIdMap = nextSourceIdMap;

        if (parentId) {
          const parent = tempElements.find((el) => el.id === parentId);
          if (parent?.type === 'group') {
            const data = parent.data as GroupData;
            const existingChildIds = safeChildIds(data);
            const merged = [...existingChildIds];
            childIds.forEach((id) => {
              if (!merged.includes(id)) merged.push(id);
            });
            merged.sort((a, b) => {
              const aEl = tempElements.find((el) => el.id === a);
              const bEl = tempElements.find((el) => el.id === b);
              return (aEl?.zIndex ?? 0) - (bEl?.zIndex ?? 0);
            });
            updateElement(parentId, { data: { childIds: merged } });
          }
        }

        const deletedSet = new Set(uniqueDeletedIds);

        const nextHiddenSet = new Set((current.hiddenElementIds ?? []).filter((id) => !deletedSet.has(id)));
        hiddenElementIds.forEach((id) => nextHiddenSet.add(id));

        const nextLockedElementIds = (current.lockedElementIds ?? []).filter((id) => !deletedSet.has(id));

        didChangeSelection = true;

        const cleanupResults =
          uniqueDeletedIds.length > 0 ? runCleanupHooks(uniqueDeletedIds, tempElements, current) : {};

        const nextRuntime = {
          ...current.llmAssistant.runtime,
          status: 'idle' as const,
          error: null,
        };

        return {
          elements: tempElements,
          selectedIds: childIds,
          hiddenElementIds: Array.from(nextHiddenSet),
          lockedElementIds: nextLockedElementIds,
          llmAssistant: {
            ...current.llmAssistant,
            runtime: nextRuntime,
          },
          ...cleanupResults,
        } as Partial<CanvasStore>;
      });

      mergeImportedResources(pluginImports, sourceIdMap, get() as FullStore);

      if (didDelete) {
        pluginManager.executeLifecycleAction('onElementDeleted');
      }

      if (didChangeSelection && pluginManager.shouldNotifyOnSelectionChange()) {
        queueMicrotask(() => {
          pluginManager.executeLifecycleAction('onSelectionChanged');
        });
      }
    },
    clearLlmAssistantHistory: () =>
      set((state) => {
        const current = state as FullStore;
        persistHistoryToStorage([]);
        return {
          llmAssistant: {
            ...current.llmAssistant,
            runtime: {
              ...current.llmAssistant.runtime,
              history: [],
            },
          },
        } as Partial<CanvasStore>;
      }),
    deleteLlmAssistantHistoryItem: (id: string) =>
      set((state) => {
        const current = state as FullStore;
        const filtered = (current.llmAssistant.runtime.history ?? []).filter((item) => item.id !== id);
        persistHistoryToStorage(filtered);
        return {
          llmAssistant: {
            ...current.llmAssistant,
            runtime: {
              ...current.llmAssistant.runtime,
              history: filtered,
            },
          },
        } as Partial<CanvasStore>;
      }),
  } as Partial<CanvasStore>,
};
};
