import React, { memo } from 'react';
import type { GroupElement, CanvasElement } from '../../types';
import type {
    CanvasElementRenderer,
    CanvasRenderContext,
} from './CanvasRendererRegistry';
import { canvasRendererRegistry } from './CanvasRendererRegistry';
import { collectExtensionAttributes, collectExtensionChildren } from './rendererExtensionRegistry';
import { areViewportsEqual } from './renderingUtils';
import { getClipRuntimeId, getMaskRuntimeId } from '../../utils/maskUtils';

interface GroupElementRendererProps {
    element: GroupElement;
    context: CanvasRenderContext;
}

const haveSameGroupChildren = (
    previous: GroupElementRendererProps,
    next: GroupElementRendererProps
): boolean => {
    const childIds = Array.isArray(next.element.data.childIds) ? next.element.data.childIds : [];

    for (const childId of childIds) {
        const previousChild = previous.context.elementMap.get(childId);
        const nextChild = next.context.elementMap.get(childId);

        if (previousChild !== nextChild) {
            return false;
        }

        const wasHidden = previous.context.isElementHidden?.(childId) ?? false;
        const isHidden = next.context.isElementHidden?.(childId) ?? false;
        if (wasHidden !== isHidden) {
            return false;
        }

        const wasSelected = previous.context.isElementSelected?.(childId) ?? false;
        const isSelected = next.context.isElementSelected?.(childId) ?? false;
        if (wasSelected !== isSelected) {
            return false;
        }

        const wasLocked = previous.context.isElementLocked?.(childId) ?? false;
        const isLocked = next.context.isElementLocked?.(childId) ?? false;
        if (wasLocked !== isLocked) {
            return false;
        }
    }

    return true;
};

const areGroupRendererPropsEqual = (
    previous: GroupElementRendererProps,
    next: GroupElementRendererProps
): boolean => {
    if (previous.element !== next.element) {
        return false;
    }

    if (!areViewportsEqual(previous.context.viewport, next.context.viewport)) {
        return false;
    }

    if (
        previous.context.activePlugin !== next.context.activePlugin ||
        previous.context.colorMode !== next.context.colorMode ||
        previous.context.extensionsContext !== next.context.extensionsContext ||
        previous.context.rendererOverrides !== next.context.rendererOverrides ||
        previous.context.scaleStrokeWithZoom !== next.context.scaleStrokeWithZoom ||
        previous.context.isPathInteractionDisabled !== next.context.isPathInteractionDisabled ||
        previous.context.pathCursorMode !== next.context.pathCursorMode
    ) {
        return false;
    }

    const groupId = previous.element.id;
    const wasHidden = previous.context.isElementHidden?.(groupId) ?? false;
    const isHidden = next.context.isElementHidden?.(groupId) ?? false;
    if (wasHidden !== isHidden) {
        return false;
    }

    return haveSameGroupChildren(previous, next);
};

const GroupElementRendererView = ({
    element,
    context
}: GroupElementRendererProps) => {
    const { elementMap, isElementHidden } = context;
    const data = element.data;

    // Filter out hidden elements
    if (isElementHidden?.(element.id)) {
        return null;
    }

    // Resolve children from elementMap
    const childIds = data.childIds || [];
    const children = childIds
        .map((id) => elementMap.get(id))
        .filter((el): el is CanvasElement => !!el);

    // Group transformation
    let transform: string | undefined;
    if (data.transformMatrix) {
        transform = `matrix(${data.transformMatrix.join(',')})`;
    } else {
        const t = data.transform || { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        transform = `translate(${t.translateX},${t.translateY}) rotate(${t.rotation}) scale(${t.scaleX},${t.scaleY})`;
    }

    // Group filters and clip paths
    const filter = data.filterId ? `url(#${data.filterId})` : undefined;
    // Get versioned mask/clip IDs for cache invalidation when position changes
    const maskVersions = context.extensionsContext?.maskVersions as Map<string, number> | undefined;
    const maskRuntimeId = getMaskRuntimeId(data.maskId, maskVersions);
    const clipVersions = context.extensionsContext?.clipVersions as Map<string, number> | undefined;
    const clipRuntimeId = getClipRuntimeId(data.clipPathId, (data as unknown as Record<string, unknown>).clipPathTemplateId as string | undefined, clipVersions);
    const clipPathUrl = clipRuntimeId ? `url(#${clipRuntimeId})` : undefined;
    const maskUrl = maskRuntimeId ? `url(#${maskRuntimeId})` : undefined;

    const extensionAttributes = collectExtensionAttributes(element, context);
    const extensionChildren = collectExtensionChildren(element, context);
    const blendStyle: React.CSSProperties = {};
    if (data.mixBlendMode) blendStyle.mixBlendMode = data.mixBlendMode as React.CSSProperties['mixBlendMode'];
    if (data.isolation) blendStyle.isolation = data.isolation;

    return (
        <g
            id={element.id}
            key={element.id}
            data-element-id={element.id}
            transform={transform}
            filter={filter}
            clipPath={clipPathUrl}
            mask={maskUrl}
            opacity={data.opacity as number | undefined}
            style={Object.keys(blendStyle).length ? blendStyle : undefined}
            {...extensionAttributes}
        >
            {extensionChildren}
            {children.map((child) => (
                <React.Fragment key={child.id}>
                    {canvasRendererRegistry.render(child, context)}
                </React.Fragment>
            ))}
        </g>
    );
};

const MemoizedGroupElementRendererView = memo(GroupElementRendererView, areGroupRendererPropsEqual);

export const GroupElementRenderer: CanvasElementRenderer<GroupElement> = (
    element,
    context
) => (
    <MemoizedGroupElementRendererView element={element} context={context} />
);
