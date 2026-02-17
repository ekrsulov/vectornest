import { canvasStoreApi } from '../store/canvasStore';
import { logger } from './logger';
import { generateShortId, isSyntheticAnimationTargetId } from './idGenerator';

type MinimalAnimation = {
    id?: string;
    targetElementId?: string;
    gradientTargetId?: string;
    patternTargetId?: string;
    clipPathTargetId?: string;
    filterTargetId?: string;
    maskTargetId?: string;
    markerTargetId?: string;
    symbolTargetId?: string;
    attributeName?: string;
    begin?: string;
    mpath?: string;
    previewElementId?: string;
    [key: string]: unknown;
};

export type ImportedAnimationPayload = {
    sourceElementId: string;
    animation: MinimalAnimation;
    clipPathId?: string;
    clipPathChildIndex?: number;
    gradientId?: string;
    patternId?: string;
    patternChildIndex?: number;
    filterId?: string;
    maskId?: string;
    maskChildIndex?: number;
    markerId?: string;
    markerChildIndex?: number;
    symbolId?: string;
    symbolChildIndex?: number;
    stopIndex?: number;
    filterPrimitiveIndex?: number;
};

export const parseBeginToSeconds = (begin?: string): number | null => {
    if (!begin) return 0;
    const token = begin.split(';')[0]?.trim();
    if (!token) return 0;
    const msMatch = token.match(/^(-?\d*\.?\d+)\s*ms$/i);
    if (msMatch) return parseFloat(msMatch[1]) / 1000;
    const sMatch = token.match(/^(-?\d*\.?\d+)\s*s$/i);
    if (sMatch) return parseFloat(sMatch[1]);
    const plainMatch = token.match(/^(-?\d*\.?\d+)$/);
    if (plainMatch) return parseFloat(plainMatch[1]);
    return null;
};

export const mergeImportedAnimations = (defs: ImportedAnimationPayload[] | undefined, sourceIdMap: Map<string, string>) => {
    if (!defs || defs.length === 0) return;
    const animState = canvasStoreApi.getState() as {
        animations?: MinimalAnimation[];
        animationSync?: { chains?: Array<{ animations: Array<{ animationId: string }> }>; events?: Array<unknown> };
        animationState?: Record<string, unknown>;
        calculateChainDelays?: () => Map<string, number>;
    };
    if (animState.animations === undefined) return;

    logger.info('Animation import: merging started', { count: defs.length });

    // Create animations with remapped element IDs
    // Fetch elements once — state doesn't change during synchronous .map()
    const stateElements = canvasStoreApi.getState().elements ?? [];
    const newAnimations: MinimalAnimation[] = defs
        .map((imported) => {
            let targetElementId = sourceIdMap.get(imported.sourceElementId);

            // For mask animations, the sourceElementId is the ID of an element inside the mask
            // (e.g., a path). This ID was generated during import and stored in the mask content.
            // Use it directly as the targetElementId.
            if (!targetElementId && imported.maskId && imported.sourceElementId) {
                targetElementId = imported.sourceElementId;
            }

            // For clipPath animations, the sourceElementId is the ID of an element inside the clipPath
            // (e.g., a rect, circle, or path). This ID was generated during import and stored in the clipPath content.
            // Use it directly as the targetElementId, similar to mask handling.
            // This normalizes clipPath animation handling to match mask animation handling.
            if (!targetElementId && imported.clipPathId && imported.sourceElementId) {
                targetElementId = imported.sourceElementId;
            }

            // For symbol animations, the sourceElementId is the ID of an element inside the symbol
            // (e.g., a circle, rect, or path). This ID was generated during import and stored in the symbol content.
            // Use it directly as the targetElementId, similar to mask/clipPath handling.
            if (!targetElementId && imported.symbolId && imported.sourceElementId) {
                targetElementId = imported.sourceElementId;
            }

            // For gradient/pattern/filter animations, we do NOT want to assign them 
            // to the element that uses the def. They belong to the def itself.
            if (!targetElementId && (imported.gradientId || imported.patternId || imported.filterId || imported.markerId)) {
                const defId = imported.gradientId ?? imported.patternId ?? imported.filterId ?? imported.markerId;
                targetElementId = defId;
            }

            if (!targetElementId && imported.markerId) {
                targetElementId = imported.markerId;
            }

            // Fallback: some SVGs generate synthetic IDs for animation targets (e.g., paths without explicit IDs).
            // If the synthetic ID wasn't mapped, try to attach to the only path without a sourceId to preserve the animation.
            if (!targetElementId && isSyntheticAnimationTargetId(imported.sourceElementId)) {
                const pathCandidates = stateElements.filter(
                    (el) => el.type === 'path' && !(el.data as Record<string, unknown> | undefined)?.sourceId
                );
                if (pathCandidates.length === 1) {
                    targetElementId = pathCandidates[0].id;
                    logger.info('Animation import: mapped synthetic target to single path without sourceId', {
                        syntheticId: imported.sourceElementId,
                        targetElementId,
                    });
                } else if (!pathCandidates.length) {
                    const noSourceCandidates = stateElements.filter(
                        (el) => !(el.data as Record<string, unknown> | undefined)?.sourceId
                    );
                    if (noSourceCandidates.length === 1) {
                        targetElementId = noSourceCandidates[0].id;
                        logger.info('Animation import: mapped synthetic target to single element without sourceId', {
                            syntheticId: imported.sourceElementId,
                            targetElementId,
                        });
                    }
                }
            }

            // Fallback 2: match by original sourceId on persisted elements (in case the sourceIdMap missed it).
            if (!targetElementId) {
                const match = stateElements.find(
                    (el) => (el.data as Record<string, unknown> | undefined)?.sourceId === imported.sourceElementId
                );
                if (match) {
                    targetElementId = match.id;
                    logger.info('Animation import: matched target by sourceId on element', {
                        sourceElementId: imported.sourceElementId,
                        targetElementId,
                    });
                }
            }

            if (!targetElementId) {
                logger.warn('Animation target element not found', {
                    sourceElementId: imported.sourceElementId,
                    clipPathId: imported.clipPathId,
                    gradientId: imported.gradientId,
                    patternId: imported.patternId,
                    filterId: imported.filterId,
                    markerId: imported.markerId,
                });
                return null;
            }
            const mpathSourceId = imported.animation.mpath as string | undefined;
            const remappedMPath = mpathSourceId
                ? sourceIdMap.get(mpathSourceId) ?? null
                : undefined;

            // Try to find an element that uses this mask (for preview context)
            let previewElementId = imported.animation.previewElementId as string | undefined;
            if (!previewElementId && imported.maskId) {
                const consumer = stateElements.find((el) => (el.data as Record<string, unknown> | undefined)?.maskId === imported.maskId);
                previewElementId = consumer?.id;
            }

            // Try to find an element that uses this clipPath (for preview context)
            if (!previewElementId && imported.clipPathId) {
                const consumer = stateElements.find((el) => {
                    const data = el.data as Record<string, unknown> | undefined;
                    return data?.clipPathId === imported.clipPathId || data?.clipPathTemplateId === imported.clipPathId;
                });
                previewElementId = consumer?.id;
            }

            if (!previewElementId && imported.markerId) {
                const consumer = stateElements.find((el) => {
                    const data = el.data as Record<string, unknown> | undefined;
                    return data?.markerStart === imported.markerId || data?.markerMid === imported.markerId || data?.markerEnd === imported.markerId;
                });
                previewElementId = consumer?.id;
            }

            // Try to find an element that uses this symbol (for preview context)
            if (!previewElementId && imported.symbolId) {
                const consumer = stateElements.find((el) => {
                    const data = el.data as Record<string, unknown> | undefined;
                    return data?.symbolId === imported.symbolId;
                });
                previewElementId = consumer?.id;
            }

            return {
                ...imported.animation,
                id: generateShortId('anm'),
                targetElementId,
                clipPathTargetId: imported.clipPathId,
                clipPathChildIndex: imported.clipPathChildIndex,
                gradientTargetId: imported.gradientId,
                patternTargetId: imported.patternId,
                patternChildIndex: imported.patternChildIndex,
                filterTargetId: imported.filterId,
                maskTargetId: imported.maskId,
                maskChildIndex: imported.maskChildIndex,
                markerTargetId: imported.markerId,
                markerChildIndex: imported.markerChildIndex,
                symbolTargetId: imported.symbolId,
                symbolChildIndex: imported.symbolChildIndex,
                stopIndex: imported.stopIndex,
                filterPrimitiveIndex: imported.filterPrimitiveIndex,
                previewElementId,
                ...(remappedMPath ? { mpath: remappedMPath, path: undefined } : {}),
            } as MinimalAnimation;
        })
        .filter((anim): anim is MinimalAnimation => anim !== null);

    if (newAnimations.length === 0) return;

    // Create a key for deduplication based on animation characteristics
    const createAnimKey = (anim: MinimalAnimation): string => {
        const parts = [
            anim.targetElementId ?? '',
            anim.maskTargetId ?? '',
            String((anim as Record<string, unknown>).maskChildIndex ?? ''),
            anim.clipPathTargetId ?? '',
            String((anim as Record<string, unknown>).clipPathChildIndex ?? ''),
            anim.gradientTargetId ?? '',
            anim.patternTargetId ?? '',
            String((anim as Record<string, unknown>).patternChildIndex ?? ''),
            anim.filterTargetId ?? '',
            anim.markerTargetId ?? '',
            String((anim as Record<string, unknown>).markerChildIndex ?? ''),
            String((anim as Record<string, unknown>).symbolTargetId ?? ''),
            String((anim as Record<string, unknown>).symbolChildIndex ?? ''),
            String(anim.type ?? ''),
            anim.attributeName ?? '',
            String((anim as Record<string, unknown>).transformType ?? ''),
            anim.values ?? '',
            String((anim as Record<string, unknown>).from ?? ''),
            String((anim as Record<string, unknown>).to ?? ''),
            String(anim.stopIndex ?? ''),
            String(anim.filterPrimitiveIndex ?? ''),
        ];
        return parts.join('|');
    };

    // Build a map of existing animations by key for quick lookup
    const existingAnimations = animState.animations ?? [];
    const existingByKey = new Map<string, MinimalAnimation>();
    existingAnimations.forEach((anim) => {
        existingByKey.set(createAnimKey(anim), anim);
    });

    // Track animations that need previewElementId updates
    const animationsToUpdate: MinimalAnimation[] = [];

    // Deduplicate: don't add animations that match existing ones, but update previewElementId if needed
    const existingKeys = new Set(existingAnimations.map(createAnimKey));
    const deduplicatedAnimations = newAnimations.filter((anim) => {
        const key = createAnimKey(anim);
        if (existingKeys.has(key)) {
            // Check if we should update the existing animation's previewElementId
            const existingAnim = existingByKey.get(key);
            if (existingAnim && !existingAnim.previewElementId && anim.previewElementId) {
                logger.info('Animation import: updating existing animation with previewElementId', {
                    animId: existingAnim.id,
                    previewElementId: anim.previewElementId
                });
                animationsToUpdate.push({ ...existingAnim, previewElementId: anim.previewElementId });
            } else {
                logger.info('Animation import: skipping duplicate', { key });
            }
            return false;
        }
        existingKeys.add(key); // Also prevent duplicates within newAnimations
        return true;
    });

    // Apply previewElementId updates to existing animations
    if (animationsToUpdate.length > 0) {
        const updatedAnimations = existingAnimations.map((anim) => {
            const update = animationsToUpdate.find((u) => u.id === anim.id);
            return update ?? anim;
        });
        canvasStoreApi.setState({
            animations: updatedAnimations,
        } as Partial<{ animations: MinimalAnimation[] }>);
        logger.info('Animation import: updated previewElementIds', { count: animationsToUpdate.length });
    }

    if (deduplicatedAnimations.length === 0) {
        // Even if no new animations, we may have updated existing ones - trigger restart
        if (animationsToUpdate.length > 0) {
            const stateAfterUpdate = canvasStoreApi.getState() as {
                animationState?: { restartKey?: number; isPlaying?: boolean; hasPlayed?: boolean; currentTime?: number; startTime?: number };
            };
            const animationState = stateAfterUpdate.animationState;
            if (animationState) {
                const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                canvasStoreApi.setState({
                    animationState: {
                        ...animationState,
                        isPlaying: true,
                        hasPlayed: true,
                        currentTime: 0,
                        startTime: now,
                        restartKey: (animationState.restartKey ?? 0) + 1,
                    },
                } as Partial<{ animationState: unknown }>);
            }
        }
        logger.info('Animation import: all animations were duplicates, skipping merge');
        return;
    }

    const chainEntries = deduplicatedAnimations
        .map((anim) => {
            const delaySeconds = parseBeginToSeconds(anim.begin);
            if (delaySeconds === null) return null;
            return {
                animationId: anim.id,
                delay: Math.max(0, delaySeconds),
                trigger: 'start' as const,
            };
        })
        .filter((entry): entry is { animationId: string; delay: number; trigger: 'start' } => entry !== null);

    const existingChains = animState.animationSync?.chains ?? [];
    const updatedChains = chainEntries.length
        ? [
            ...existingChains,
            {
                id: generateShortId('chn'),
                name: 'Imported chain',
                animations: chainEntries,
            },
        ]
        : existingChains;

    canvasStoreApi.setState({
        animations: [...(animState.animations ?? []), ...deduplicatedAnimations],
        animationSync: {
            ...animState.animationSync,
            chains: updatedChains,
        },
    } as Partial<{ animations: MinimalAnimation[]; animationSync: unknown }>);

    const stateAfterMerge = canvasStoreApi.getState() as {
        animations?: MinimalAnimation[];
        animationSync?: unknown;
        animationState?: { chainDelays?: Map<string, number> | Record<string, number>; restartKey?: number; isPlaying?: boolean; hasPlayed?: boolean; currentTime?: number; startTime?: number };
        calculateChainDelays?: () => Map<string, number>;
    };
    const newDelays = stateAfterMerge.calculateChainDelays?.();
    const nextAnimationState = stateAfterMerge.animationState;
    if (nextAnimationState) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        canvasStoreApi.setState({
            animationState: {
                ...nextAnimationState,
                chainDelays: newDelays ?? nextAnimationState.chainDelays ?? new Map(),
                // Auto-start imported animations so defs (gradients, markers, masks) render immediately
                isPlaying: true,
                hasPlayed: true,
                currentTime: 0,
                startTime: now,
                restartKey: (nextAnimationState.restartKey ?? 0) + 1,
            },
        } as Partial<{ animations: MinimalAnimation[] }>);
    }

    logger.info('Imported animations', { count: newAnimations.length });
};
