import type { CanvasElement, CanvasElementInput, PathData, GroupData, PresentationAttributes } from '../types';
import type { ImportedElement, ImportedGroupElement } from './svgImportUtils';
import { translateCommands } from './transformationUtils';
import { normalizeMarkerId } from './markerUtils';

const isGroup = (element: ImportedElement): element is ImportedGroupElement =>
    element.type === 'group';

export type AddElementFn = (element: CanvasElementInput, explicitZIndex?: number) => string;
export type UpdateElementFn = (id: string, updates: Partial<CanvasElement>) => void;

type TransformMatrix = [number, number, number, number, number, number];

/** Translate a transform matrix by the given delta. */
const translateMatrix = (
    tm: TransformMatrix,
    deltaX: number,
    deltaY: number,
): TransformMatrix => [tm[0], tm[1], tm[2], tm[3], tm[4] + deltaX, tm[5] + deltaY];

/**
 * Generic helper: translates an element that has x/y coordinates and an optional
 * transformMatrix. When a transformMatrix is present, only the matrix is updated
 * (preserving the local coordinate system). Otherwise x/y are offset directly.
 */
const translateElementWithXY = (
    element: ImportedElement,
    deltaX: number,
    deltaY: number,
): ImportedElement => {
    const data = element.data as {
        x?: number;
        y?: number;
        transformMatrix?: TransformMatrix;
    };
    if (data.transformMatrix) {
        return {
            ...element,
            data: { ...element.data, transformMatrix: translateMatrix(data.transformMatrix, deltaX, deltaY) },
        } as ImportedElement;
    }
    return {
        ...element,
        data: {
            ...element.data,
            x: (data.x ?? 0) + deltaX,
            y: (data.y ?? 0) + deltaY,
        },
    } as ImportedElement;
};

export const mapImportedElements = (
    elements: ImportedElement[],
    mapFn: (pathData: PathData) => PathData,
): ImportedElement[] => {
    return elements.map(element => {
        if (element.type === 'path') {
            return {
                ...element,
                data: mapFn(element.data),
            };
        }

        if (isGroup(element)) {
            return {
                ...element,
                children: mapImportedElements(element.children, mapFn),
            };
        }

        return element;
    });
};

export const translateImportedElements = (
    elements: ImportedElement[],
    deltaX: number,
    deltaY: number,
): ImportedElement[] => {
    if (deltaX === 0 && deltaY === 0) {
        return elements;
    }

    return elements.map((element) => {
        if (isGroup(element)) {
            const group = element;
            const groupData = group.data as { 
                hasAnimatedTransform?: boolean;
                transformMatrix?: TransformMatrix;
            } | undefined;
            
            // If group has animateTransform, translate the group's transformMatrix instead of children's coordinates
            // This preserves the animation's coordinate system (children stay centered at group origin)
            if (groupData?.hasAnimatedTransform) {
                const tm = groupData.transformMatrix ?? [1, 0, 0, 1, 0, 0] as TransformMatrix;
                return {
                    ...group,
                    data: {
                        ...group.data,
                        transformMatrix: translateMatrix(tm, deltaX, deltaY),
                    },
                    // Don't translate children - they should stay relative to group origin for animations
                    children: group.children,
                };
            }
            
            return {
                ...group,
                children: translateImportedElements(group.children, deltaX, deltaY),
            };
        }
        if (element.type === 'path') {
            const pathData = element.data;
            if (pathData.transformMatrix) {
                return {
                    ...element,
                    data: {
                        ...pathData,
                        transformMatrix: translateMatrix(pathData.transformMatrix, deltaX, deltaY),
                    },
                };
            }
            
            return {
                ...element,
                data: {
                    ...pathData,
                    subPaths: pathData.subPaths.map((subPath) =>
                        translateCommands(subPath, deltaX, deltaY)
                    ),
                },
            };
        }
        if (element.type === 'nativeShape') {
            // nativeShape also has optional `points` to translate
            const data = element.data as {
                x: number;
                y: number;
                points?: { x: number; y: number }[];
                transformMatrix?: TransformMatrix;
            };
            if (data.transformMatrix) {
                return {
                    ...element,
                    data: { ...element.data, transformMatrix: translateMatrix(data.transformMatrix, deltaX, deltaY) },
                };
            }
            return {
                ...element,
                data: {
                    ...element.data,
                    x: data.x + deltaX,
                    y: data.y + deltaY,
                    ...(data.points ? { points: data.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY })) } : {}),
                },
            };
        }
        // All remaining element types with x/y + optional transformMatrix
        if (element.type === 'nativeText' || element.type === 'image' ||
            element.type === 'symbolInstance' || element.type === 'embeddedSvg' ||
            element.type === 'foreignObject') {
            return translateElementWithXY(element, deltaX, deltaY);
        }
        return element;
    });
};

export const addImportedElementsToCanvas = (
    elements: ImportedElement[],
    addElement: AddElementFn,
    updateElement: UpdateElementFn,
    getNextGroupName: () => string,
    parentId: string | null = null,
    globalZIndexCounter: { value: number } = { value: 0 },
): { createdIds: string[]; childIds: string[]; sourceIdMap: Map<string, string>; hiddenElementIds: string[] } => {
    const createdIds: string[] = [];
    const childIds: string[] = [];
    const sourceIdMap = new Map<string, string>();
    const hiddenElementIds: string[] = [];

    elements.forEach(element => {
        if (element.type === 'group') {
            const groupName = element.name?.trim().length ? element.name : getNextGroupName();
            const groupZIndex = globalZIndexCounter.value++;
            const groupData = element.data ?? {};
            const groupDisplayNone = (groupData as { display?: string }).display === 'none';
            const groupIsHidden = (groupData as Partial<GroupData>)?.isHidden ?? false;
            const sanitizedGroupData = groupDisplayNone ? { ...groupData } : groupData;
            if (groupDisplayNone) {
                delete (sanitizedGroupData as { display?: string }).display;
            }
            const groupId = addElement({
                type: 'group',
                parentId,
                data: {
                    ...sanitizedGroupData,
                    childIds: [],
                    name: groupName,
                    isLocked: (groupData as Partial<GroupData>)?.isLocked ?? false,
                    isHidden: groupIsHidden || groupDisplayNone,
                    isExpanded: (groupData as Partial<GroupData>)?.isExpanded ?? true,
                    transform: (groupData as Partial<GroupData>)?.transform ?? {
                        translateX: 0,
                        translateY: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                    },
                },
            }, groupZIndex);

            // Track source ID for mapping
            const groupSourceId = (element.data as { sourceId?: string })?.sourceId;
            if (groupSourceId) {
                sourceIdMap.set(groupSourceId, groupId);
            }

            const {
                createdIds: nestedCreatedIds,
                childIds: nestedChildIds,
                sourceIdMap: nestedSourceIdMap,
                hiddenElementIds: nestedHiddenElementIds,
            } = addImportedElementsToCanvas(
                element.children,
                addElement,
                updateElement,
                getNextGroupName,
                groupId,
                globalZIndexCounter,
            );

            // Merge nested source ID mappings
            nestedSourceIdMap.forEach((newId, sourceId) => {
                sourceIdMap.set(sourceId, newId);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateElement(groupId, { data: { childIds: nestedChildIds } } as any);

            createdIds.push(groupId, ...nestedCreatedIds);
            childIds.push(groupId);
            hiddenElementIds.push(...nestedHiddenElementIds);
            return;
        }

        let elementZIndex = globalZIndexCounter.value++;
        const isTextPathRef = element.type === 'path' && (element.data as PathData | undefined)?.isTextPathRef;
        if (isTextPathRef) {
            // Ensure textPath carrier paths render last so their text sits above backgrounds
            elementZIndex = Number.MAX_SAFE_INTEGER - 1000;
        }
        const normalizeMarkerFields = <T extends PresentationAttributes>(data: T): T => {
            const normalize = (v?: string) => normalizeMarkerId(v);
            const markerStart = normalize(data.markerStart);
            const markerMid = normalize(data.markerMid);
            const markerEnd = normalize(data.markerEnd);
            const next = { ...data };
            if (markerStart) next.markerStart = markerStart;
            if (markerMid) next.markerMid = markerMid;
            if (markerEnd) next.markerEnd = markerEnd;
            return next;
        };

        const normalizedData = (() => {
            if (element.type === 'path') {
                return normalizeMarkerFields(element.data as PathData);
            }
            if (element.type === 'nativeShape') {
                return normalizeMarkerFields(element.data as PresentationAttributes);
            }
            if (element.type === 'use') {
                const data = element.data as Record<string, unknown> & { href?: string };
                const remappedHref = data.href ? sourceIdMap.get(data.href) ?? data.href : undefined;
                return {
                    ...data,
                    ...(remappedHref ? { href: remappedHref } : {}),
                };
            }
            return element.data;
        })();

        const importedHidden = Boolean((normalizedData as { importedHidden?: boolean }).importedHidden);
        const displayNone = (normalizedData as { display?: string }).display === 'none';
        const isDefinitionElement = Boolean(
            (normalizedData as { isDefinition?: boolean }).isDefinition
            || (normalizedData as { isTextPathRef?: boolean }).isTextPathRef
        );
        const shouldStripDisplay = displayNone && !isDefinitionElement;
        const shouldTrackHidden = importedHidden || (displayNone && !isDefinitionElement);
        const cleanedData = { ...normalizedData };
        if ((cleanedData as { importedHidden?: boolean }).importedHidden !== undefined) {
            delete (cleanedData as { importedHidden?: boolean }).importedHidden;
        }
        if (shouldStripDisplay && (cleanedData as { display?: string }).display === 'none') {
            delete (cleanedData as { display?: string }).display;
        }

        const createdId = addElement({
            type: element.type,
            parentId,
            data: cleanedData,
        }, elementZIndex);

        // Track source ID to new ID mapping
        const sourceId = (element.data as { sourceId?: string })?.sourceId;
        if (sourceId) {
            sourceIdMap.set(sourceId, createdId);
        }

        createdIds.push(createdId);
        childIds.push(createdId);
        if (shouldTrackHidden) {
            hiddenElementIds.push(createdId);
        }
    });

    return { createdIds, childIds, sourceIdMap, hiddenElementIds };
};
