import React from 'react';
import type { FilterDefinition, FilterPrimitive } from './types';

/**
 * Render filter to SVG element
 */
export const renderFilterNode = (filter: FilterDefinition) => (
    <filter
        key={filter.id}
        id={filter.id}
        x={filter.filterAttributes?.x ?? '-20%'}
        y={filter.filterAttributes?.y ?? '-20%'}
        width={filter.filterAttributes?.width ?? '140%'}
        height={filter.filterAttributes?.height ?? '140%'}
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
    >
        {filter.primitives.map((primitive, idx) => {
            const { type, ...attrs } = primitive;

            // Handle special cases with nested elements
            if (type === 'feMerge' && Array.isArray((primitive as FilterPrimitive & { feMergeNodes?: Array<{ in?: string }> }).feMergeNodes)) {
                return (
                    <feMerge key={idx}>
                        {((primitive as FilterPrimitive & { feMergeNodes: Array<{ in?: string }> }).feMergeNodes).map((node: { in?: string }, nodeIdx: number) => (
                            <feMergeNode key={nodeIdx} in={node.in || 'SourceGraphic'} />
                        ))}
                    </feMerge>
                );
            }

            // Handle lighting filters with light sources
            if ((type === 'feDiffuseLighting' || type === 'feSpecularLighting') && (primitive as FilterPrimitive & { lightSource?: Record<string, unknown> }).lightSource) {
                const lightSource = (primitive as FilterPrimitive & { lightSource: Record<string, unknown> }).lightSource;
                const LightSourceTag = lightSource.type === 'fePointLight' ? 'fePointLight' :
                    lightSource.type === 'feSpotLight' ? 'feSpotLight' :
                        'feDistantLight';
                const FilterTag = type as 'feDiffuseLighting' | 'feSpecularLighting';
                const { lightSource: _, ...filterAttrs } = attrs as Record<string, unknown>;
                const { type: __, ...lightAttrs } = lightSource as Record<string, unknown>;

                return React.createElement(
                    FilterTag,
                    { key: idx, ...filterAttrs },
                    React.createElement(LightSourceTag, lightAttrs)
                );
            }

            // Normalize attribute names that conflict with the primitive "type" discriminator
            // e.g. feColorMatrix uses the attribute "type" (matrix/saturate/hueRotate),
            // but our primitive objects use "colorMatrixType" or "matrixType" to avoid a name clash.
            // Likewise, feTurbulence uses "turbulenceType" in our definitions.
            const normalizedAttrs = { ...(attrs as Record<string, unknown>) } as Record<string, unknown>;

            if (type === 'feColorMatrix') {
                const cmType = normalizedAttrs['colorMatrixType'] ?? normalizedAttrs['matrixType'];
                if (cmType !== undefined) {
                    normalizedAttrs['type'] = cmType;
                    delete normalizedAttrs['colorMatrixType'];
                    delete normalizedAttrs['matrixType'];
                }
            }

            if (type === 'feTurbulence') {
                const tType = normalizedAttrs['turbulenceType'];
                if (tType !== undefined) {
                    normalizedAttrs['type'] = tType;
                    delete normalizedAttrs['turbulenceType'];
                }
            }

            // Handle feComponentTransfer children (feFuncR/feFuncG/feFuncB/feFuncA)
            if (type === 'feComponentTransfer') {
                const transferAttrs = { ...normalizedAttrs } as Record<string, unknown>;
                const funcEntries: Array<[string, string]> = [
                    ['funcR', 'feFuncR'],
                    ['funcG', 'feFuncG'],
                    ['funcB', 'feFuncB'],
                    ['funcA', 'feFuncA'],
                    ['feFuncR', 'feFuncR'],
                    ['feFuncG', 'feFuncG'],
                    ['feFuncB', 'feFuncB'],
                    ['feFuncA', 'feFuncA'],
                ];
                const renderedTags = new Set<string>();
                const children = funcEntries
                    .map(([sourceKey, tag]) => {
                        const func = transferAttrs[sourceKey] as Record<string, unknown> | undefined;
                        if (!func) return null;
                        if (renderedTags.has(tag)) return null;
                        renderedTags.add(tag);
                        const funcAttrs: Record<string, unknown> = { ...func };
                        // Some definitions use "funcType" to avoid a name clash — map it to the SVG attribute "type"
                        if (funcAttrs['funcType'] !== undefined) {
                            funcAttrs['type'] = funcAttrs['funcType'];
                            delete funcAttrs['funcType'];
                        }
                        // remove the parent-level func key so it doesn't become an attribute
                        delete transferAttrs[sourceKey];
                        return React.createElement(tag, { key: sourceKey, ...funcAttrs });
                    })
                    .filter(Boolean) as React.ReactNode[];

                return React.createElement(type, { key: idx, ...transferAttrs }, ...children);
            }

            // Collect animate/animateTransform children if present
            const animChildren = Array.isArray((primitive as FilterPrimitive & { animateChildren?: Array<Record<string, unknown>> }).animateChildren)
                ? ((primitive as FilterPrimitive & { animateChildren: Array<Record<string, unknown>> }).animateChildren).map(
                    (anim: Record<string, unknown>, animIdx: number) => {
                        const { element: animTag, ...animAttrs } = anim;
                        return React.createElement(
                            (animTag as string) || 'animate',
                            { key: `anim-${animIdx}`, ...animAttrs },
                        );
                    },
                )
                : [];

            // Standard primitive (with optional animate children)
            return React.createElement(type, { key: idx, ...normalizedAttrs }, ...animChildren);
        })}
    </filter>
);
