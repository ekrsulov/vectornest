
import type { PathData } from '../types';
import { performPathUnion } from './pathOperationsUtils';
import { measurePath } from './measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from './sharedTransformUtils';
import type { ImportedArtboardMetadata, ImportedElement } from './svgImportUtils';
import { importSVGWithDimensions, flattenImportedElements } from './svgImportUtils';
import { mapImportedElements } from './importHelpers';
import { logger } from './logger';

export interface ProcessedSvg {
    elements: ImportedElement[];
    pathDataArray: PathData[];
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        width: number;
        height: number;
    };
    dimensions: {
        width: number;
        height: number;
    };
    pluginImports: Record<string, unknown[]>;
    artboardMetadata: ImportedArtboardMetadata | null;
}

export interface ProcessingOptions {
    resizeImport?: boolean;
    resizeWidth?: number;
    resizeHeight?: number;
    applyUnion?: boolean;
}

type ImportBounds = { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };

type Matrix6 = [number, number, number, number, number, number];
type Bounds4 = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Transform axis-aligned bounds through a 2×3 matrix and accumulate into mutable min/max accumulators.
 */
function accumulateBoundsViaMatrix(
    baseBounds: Bounds4,
    matrix: Matrix6 | undefined,
    acc: { minX: number; maxX: number; minY: number; maxY: number }
): void {
    if (matrix) {
        const corners = [
            { x: baseBounds.minX, y: baseBounds.minY },
            { x: baseBounds.maxX, y: baseBounds.minY },
            { x: baseBounds.maxX, y: baseBounds.maxY },
            { x: baseBounds.minX, y: baseBounds.maxY },
        ];
        for (const pt of corners) {
            const tx = matrix[0] * pt.x + matrix[2] * pt.y + matrix[4];
            const ty = matrix[1] * pt.x + matrix[3] * pt.y + matrix[5];
            acc.minX = Math.min(acc.minX, tx);
            acc.maxX = Math.max(acc.maxX, tx);
            acc.minY = Math.min(acc.minY, ty);
            acc.maxY = Math.max(acc.maxY, ty);
        }
    } else {
        acc.minX = Math.min(acc.minX, baseBounds.minX);
        acc.maxX = Math.max(acc.maxX, baseBounds.maxX);
        acc.minY = Math.min(acc.minY, baseBounds.minY);
        acc.maxY = Math.max(acc.maxY, baseBounds.maxY);
    }
}

const calculateImportBounds = (elements: ImportedElement[], paths: PathData[]): ImportBounds => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Consider paths
    paths.forEach(pathData => {
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
    });

    // Consider plugin-provided elements
    elements.forEach((el) => {
        if (el.type === 'nativeShape') {
            const data = el.data as {
                kind: string;
                x: number;
                y: number;
                width: number;
                height: number;
                points?: { x: number; y: number }[];
                transformMatrix?: [number, number, number, number, number, number];
            };
            const baseBounds = (() => {
                if (data.kind === 'circle') {
                    const r = Math.min(data.width, data.height) / 2;
                    const cx = data.x + data.width / 2;
                    const cy = data.y + data.height / 2;
                    return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
                }
                if (data.kind === 'ellipse') {
                    const cx = data.x + data.width / 2;
                    const cy = data.y + data.height / 2;
                    return { minX: cx - data.width / 2, minY: cy - data.height / 2, maxX: cx + data.width / 2, maxY: cy + data.height / 2 };
                }
                if (data.kind === 'line') {
                    return {
                        minX: Math.min(data.x, data.x + data.width),
                        minY: Math.min(data.y, data.y + data.height),
                        maxX: Math.max(data.x, data.x + data.width),
                        maxY: Math.max(data.y, data.y + data.height),
                    };
                }
                if (data.kind === 'polygon' || data.kind === 'polyline') {
                    const pts = data.points ?? [];
                    if (!pts.length) return null;
                    return pts.reduce(
                        (b, p) => ({
                            minX: Math.min(b.minX, p.x),
                            minY: Math.min(b.minY, p.y),
                            maxX: Math.max(b.maxX, p.x),
                            maxY: Math.max(b.maxY, p.y),
                        }),
                        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
                    );
                }
                return { minX: data.x, minY: data.y, maxX: data.x + data.width, maxY: data.y + data.height };
            })();
            if (baseBounds) {
                const acc = { minX, maxX, minY, maxY };
                accumulateBoundsViaMatrix(baseBounds, data.transformMatrix, acc);
                minX = acc.minX; maxX = acc.maxX; minY = acc.minY; maxY = acc.maxY;
            }
        }
        if (el.type === 'nativeText') {
            const data = el.data as {
                x: number;
                y: number;
                fontSize?: number;
                fontFamily?: string;
                text?: string;
                lineHeight?: number;
                writingMode?: string;
                transformMatrix?: [number, number, number, number, number, number];
            };
            const fontSize = data.fontSize ?? 16;
            const lineHeight = (data.lineHeight ?? 1.2) * fontSize;
            const lines = (data.text ?? '').split(/\r?\n/);
            const lineCount = Math.max(lines.length, 1);
            const longestLine = Math.max(...lines.map((line) => line.length), 1);
            const writingMode = data.writingMode ?? '';
            const isVertical = /^(vertical|sideways|tb)/.test(writingMode);
            const widthApprox = isVertical
                ? lineCount * lineHeight
                : longestLine * fontSize * 0.6;
            const heightApprox = isVertical
                ? longestLine * lineHeight
                : lineCount * lineHeight;
            const baseBounds = {
                minX: data.x,
                minY: data.y - (isVertical ? fontSize * 0.2 : heightApprox),
                maxX: data.x + widthApprox,
                maxY: data.y + (isVertical ? heightApprox : fontSize * 0.2),
            };
            const acc = { minX, maxX, minY, maxY };
            accumulateBoundsViaMatrix(baseBounds, data.transformMatrix, acc);
            minX = acc.minX; maxX = acc.maxX; minY = acc.minY; maxY = acc.maxY;
        }
        if (el.type === 'image') {
            const data = el.data as {
                x: number;
                y: number;
                width: number;
                height: number;
                transformMatrix?: [number, number, number, number, number, number];
            };
            const baseBounds = {
                minX: data.x,
                minY: data.y,
                maxX: data.x + data.width,
                maxY: data.y + data.height,
            };
            const acc = { minX, maxX, minY, maxY };
            accumulateBoundsViaMatrix(baseBounds, data.transformMatrix, acc);
            minX = acc.minX; maxX = acc.maxX; minY = acc.minY; maxY = acc.maxY;
        }
        if (el.type === 'embeddedSvg') {
            const data = el.data as {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                viewBox?: string;
                transformMatrix?: [number, number, number, number, number, number];
            };
            const viewBoxParts = data.viewBox ? data.viewBox.split(/\s+/).map(parseFloat) : undefined;
            const width = data.width ?? (viewBoxParts && viewBoxParts.length === 4 ? viewBoxParts[2] : 0);
            const height = data.height ?? (viewBoxParts && viewBoxParts.length === 4 ? viewBoxParts[3] : 0);
            const baseBounds = {
                minX: data.x ?? 0,
                minY: data.y ?? 0,
                maxX: (data.x ?? 0) + width,
                maxY: (data.y ?? 0) + height,
            };
            const acc = { minX, maxX, minY, maxY };
            accumulateBoundsViaMatrix(baseBounds, data.transformMatrix, acc);
            minX = acc.minX; maxX = acc.maxX; minY = acc.minY; maxY = acc.maxY;
        }
        if (el.type === 'foreignObject') {
            const data = el.data as {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                transformMatrix?: [number, number, number, number, number, number];
            };
            const baseBounds = {
                minX: data.x ?? 0,
                minY: data.y ?? 0,
                maxX: (data.x ?? 0) + (data.width ?? 0),
                maxY: (data.y ?? 0) + (data.height ?? 0),
            };
            const acc = { minX, maxX, minY, maxY };
            accumulateBoundsViaMatrix(baseBounds, data.transformMatrix, acc);
            minX = acc.minX; maxX = acc.maxX; minY = acc.minY; maxY = acc.maxY;
        }
    });

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
};

export const processSvgFile = async (
    file: File,
    options: ProcessingOptions
): Promise<ProcessedSvg | null> => {
    const { resizeImport, resizeWidth = 0, resizeHeight = 0, applyUnion } = options;


    const {
        dimensions,
        elements: importedElements,
        pluginImports,
        artboardMetadata,
    } = await importSVGWithDimensions(file);

    if ((!importedElements || importedElements.length === 0) && !artboardMetadata) {
        logger.warn('No elements found in SVG file', { fileName: file.name });
        return null;
    }

    let workingElements = importedElements;
    let pathDataArray = flattenImportedElements(workingElements);

    // We allow empty paths if plugins handle native elements

    // Apply resize if requested
    if (resizeImport && dimensions.width > 0 && dimensions.height > 0) {
        const scaleX = resizeWidth / dimensions.width;
        const scaleY = resizeHeight / dimensions.height;

        workingElements = mapImportedElements(workingElements, (pathData) => {
            const scaledSubPaths = pathData.subPaths.map(subPath =>
                transformCommands(subPath, {
                    scaleX,
                    scaleY,
                    originX: 0,
                    originY: 0,
                    rotation: 0,
                    rotationCenterX: 0,
                    rotationCenterY: 0,
                })
            );

            return {
                ...pathData,
                subPaths: scaledSubPaths,
                strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
            };
        });

        pathDataArray = flattenImportedElements(workingElements);
    } else if (resizeImport) {
        logger.warn('Resize requested but SVG dimensions are missing or zero', { fileName: file.name });
    }

    // Apply union if requested
    if (applyUnion) {
        const unionSource = flattenImportedElements(workingElements);
        if (unionSource.length > 1) {
            const unionResult = performPathUnion(unionSource);
            if (unionResult) {
                workingElements = [{ type: 'path', data: unionResult }];
                pathDataArray = flattenImportedElements(workingElements);
            }
        }
    }

    // Recalculate bounds
    const boundsResult = calculateImportBounds(workingElements, pathDataArray);

    return {
        elements: workingElements,
        pathDataArray,
        bounds: boundsResult,
        dimensions,
        pluginImports,
        artboardMetadata,
    };
};

export const createFrame = (width: number, height: number, strokeColor: string): PathData => {
    return {
        subPaths: [[
            { type: 'M', position: { x: 0, y: 0 } },
            { type: 'L', position: { x: width, y: 0 } },
            { type: 'L', position: { x: width, y: height } },
            { type: 'L', position: { x: 0, y: height } },
            { type: 'Z' }
        ]],
        strokeWidth: 1,
        strokeColor,
        strokeOpacity: 1,
        fillColor: 'none',
        fillOpacity: 1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
    };
};
