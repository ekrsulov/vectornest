import type { ReactNode } from 'react';
import { canvasRendererRegistry, type CanvasElementRenderer } from '../canvas/renderers';
import type {
  CanvasElement,
  ElementType,
  PathData,
  PathElement,
  Viewport,
} from '../types';
import type { Bounds } from './boundsUtils';
import { boundsFromCorners } from './boundsUtils';
import { measurePath } from './measurementUtils';
import { translatePathData, scalePathData } from './transformationUtils';
import { commandsToString } from './pathParserUtils';
import type { Command, PresentationAttributes } from '../types';
import {
  applyToPoint,
  type Matrix,
  IDENTITY_MATRIX,
  multiplyMatrices,
  createTranslateMatrix,
  createScaleMatrix,
  createRotateMatrix,
} from './matrixUtils';
import { getAccumulatedTransformMatrix } from './elementTransformUtils';
import { getEffectiveStrokeColor } from './pathDataBehaviors';
import { formatToPrecision } from './numberUtils';
import { mapCommandPoints } from './commandPointMapper';

const ensureMatrix = (data: Record<string, unknown>): Matrix => {
  if (Array.isArray((data as { transformMatrix?: unknown }).transformMatrix)) {
    return (data as { transformMatrix: Matrix }).transformMatrix;
  }
  if ((data as { transform?: unknown }).transform) {
    const t = (data as { transform: { translateX?: number; translateY?: number; rotation?: number; scaleX?: number; scaleY?: number } }).transform;
    const tx = t.translateX ?? 0;
    const ty = t.translateY ?? 0;
    const sx = t.scaleX ?? 1;
    const sy = t.scaleY ?? 1;
    const rot = t.rotation ?? 0;
    let m: Matrix = [...IDENTITY_MATRIX];
    m = multiplyMatrices(m, createTranslateMatrix(tx, ty));
    m = multiplyMatrices(m, [sx, 0, 0, sy, 0, 0]);
    if (rot !== 0) {
      m = multiplyMatrices(m, createRotateMatrix(rot, 0, 0));
    }
    return m;
  }
  return [...IDENTITY_MATRIX] as Matrix;
};

export interface ElementContributionContext {
  viewport: Viewport;
  elementMap?: Map<string, CanvasElement>;
}

export interface ElementContribution<T extends CanvasElement = CanvasElement> {
  type: ElementType;
  canvasRenderer?: CanvasElementRenderer<T>;
  getBounds?: (element: T, context: ElementContributionContext) => Bounds | null;
  translate?: (element: T, deltaX: number, deltaY: number, precision: number) => T;
  scale?: (element: T, scaleX: number, scaleY: number, centerX: number, centerY: number, precision: number) => T;
  rotate?: (element: T, angleDegrees: number, centerX: number, centerY: number, precision: number) => T;
  applyAffine?: (element: T, matrix: [number, number, number, number, number, number], precision: number) => T;
  clone?: (element: T) => CanvasElement;
  serialize?: (element: T) => string | null;
  renderThumbnail?: (element: T, context: ElementContributionContext) => ReactNode;
}

interface RegisteredContribution {
  pluginId: string;
  contribution: ElementContribution;
}

class ElementContributionRegistry {
  private contributions = new Map<ElementType, RegisteredContribution>();

  register(pluginId: string, contribution: ElementContribution): void {
    this.contributions.set(contribution.type, { pluginId, contribution });

    if (contribution.canvasRenderer) {
      canvasRendererRegistry.registerRenderer(contribution.type, contribution.canvasRenderer);
    }
  }

  unregisterPlugin(pluginId: string): void {
    Array.from(this.contributions.entries()).forEach(([type, registered]) => {
      if (registered.pluginId === pluginId) {
        this.contributions.delete(type);
        canvasRendererRegistry.unregisterRenderer(type);
      }
    });
  }

  getContribution(type: ElementType): ElementContribution | undefined {
    return this.contributions.get(type)?.contribution;
  }

  translateElement<T extends CanvasElement>(
    element: T,
    deltaX: number,
    deltaY: number,
    precision: number
  ): T | null {
    const contribution = this.getContribution(element.type);
    if (contribution?.translate) {
      return contribution.translate(element, deltaX, deltaY, precision) as T;
    }

    if (element.type === 'path') {
      const pathData = (element as PathElement).data as PathData;
      return {
        ...(element as PathElement),
        data: translatePathData(pathData, deltaX, deltaY, {
          precision,
          roundToIntegers: precision === 0
        })
      } as T;
    }

    return null;
  }

  cloneElement<T extends CanvasElement>(element: T): CanvasElement {
    const contribution = this.getContribution(element.type);
    if (contribution?.clone) {
      return contribution.clone(element);
    }

    if (element.type === 'path') {
      const pathElement = element as PathElement;
      return {
        ...pathElement,
        data: structuredClone(pathElement.data)
      };
    }

    return { ...element };
  }

  scaleElement<T extends CanvasElement>(
    element: T,
    scaleX: number,
    scaleY: number,
    centerX: number,
    centerY: number,
    precision: number
  ): T | null {
    const contribution = this.getContribution(element.type);
    if (contribution?.scale) {
      return contribution.scale(element, scaleX, scaleY, centerX, centerY, precision) as T;
    }

    // Generic matrix-based scaling for elements with transformMatrix/transform
    if ((element.data as { transformMatrix?: Matrix }).transformMatrix || (element.data as { transform?: unknown }).transform) {
      const current = ensureMatrix(element.data as Record<string, unknown>);
      const scaledMatrix = multiplyMatrices(createScaleMatrix(scaleX, scaleY, centerX, centerY), current);
      return {
        ...element,
        data: {
          ...(element.data as Record<string, unknown>),
          transformMatrix: scaledMatrix.map((v) => parseFloat(v.toFixed(precision))) as Matrix,
        },
      } as T;
    }

    if (element.type === 'path') {
      const pathElement = element as PathElement;
      return {
        ...pathElement,
        data: scalePathData(pathElement.data as PathData, scaleX, scaleY, centerX, centerY),
      } as T;
    }

    return null;
  }

  rotateElement<T extends CanvasElement>(
    element: T,
    angleDegrees: number,
    centerX: number,
    centerY: number,
    precision: number
  ): T | null {
    const contribution = this.getContribution(element.type);
    if (contribution?.rotate) {
      return contribution.rotate(element, angleDegrees, centerX, centerY, precision) as T;
    }

    if ((element.data as { transformMatrix?: Matrix }).transformMatrix || (element.data as { transform?: unknown }).transform) {
      const current = ensureMatrix(element.data as Record<string, unknown>);
      const rotatedMatrix = multiplyMatrices(createRotateMatrix(angleDegrees, centerX, centerY), current);
      return {
        ...element,
        data: {
          ...(element.data as Record<string, unknown>),
          transformMatrix: rotatedMatrix.map((v) => parseFloat(v.toFixed(precision))) as Matrix,
        },
      } as T;
    }

    if (element.type === 'path') {
      const pathElement = element as PathElement;
      return {
        ...pathElement,
        data: {
          ...(pathElement.data as PathData),
          subPaths: (pathElement.data as PathData).subPaths.map((subPath) =>
            rotateCommands(subPath, angleDegrees, centerX, centerY, precision)
          ),
        },
      } as T;
    }

    return null;
  }

  applyAffineTransform<T extends CanvasElement>(
    element: T,
    matrix: [number, number, number, number, number, number],
    precision: number
  ): T | null {
    const contribution = this.getContribution(element.type);
    if (contribution?.applyAffine) {
      return contribution.applyAffine(element, matrix, precision) as T;
    }

    // Compose with existing matrix for generic elements
    if ((element.data as { transformMatrix?: Matrix }).transformMatrix || (element.data as { transform?: unknown }).transform) {
      const current = ensureMatrix(element.data as Record<string, unknown>);
      const composed = multiplyMatrices(matrix, current);
      return {
        ...element,
        data: {
          ...(element.data as Record<string, unknown>),
          transformMatrix: composed.map((v) => parseFloat(v.toFixed(precision))) as Matrix,
        },
      } as T;
    }

    if (element.type === 'path') {
      const pathElement = element as PathElement;
      return {
        ...pathElement,
        data: {
          ...(pathElement.data as PathData),
          subPaths: (pathElement.data as PathData).subPaths.map((subPath) =>
            applyAffineToPath(subPath, matrix, precision)
          ),
        },
      } as T;
    }

    return null;
  }

  getBounds(
    element: CanvasElement,
    context: ElementContributionContext
  ): Bounds | null {
    const isDefinition = Boolean((element.data as PresentationAttributes | undefined)?.isDefinition);
    if (isDefinition) return null;

    const contribution = this.getContribution(element.type);
    let bounds: Bounds | null = null;

    if (contribution?.getBounds) {
      bounds = contribution.getBounds(element, context);
    } else if (element.type === 'path') {
      const pathData = (element as PathElement).data as PathData;
      const isDefRef = pathData.isTextPathRef;
      const hasTextPath = Boolean(pathData.textPath?.text);
      if (isDefRef && !hasTextPath) {
        return null;
      }
      bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, context.viewport.zoom);
    }

    if (!bounds) {
      return null;
    }

    // Apply ancestor group translations if elementMap is available
    if (context.elementMap) {
      // Calculate the cumulative transform of the element (including itself and parents)
      const matrix = getAccumulatedTransformMatrix(element.id, Array.from(context.elementMap.values()));

      // Transform the 4 corners of the local bounds
      const corners = [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
        { x: bounds.minX, y: bounds.maxY }
      ].map(p => applyToPoint(matrix, p));

      // Calculate new AABB from transformed corners
      bounds = boundsFromCorners(corners);
    }

    return bounds;
  }

  serializeElement(element: CanvasElement): string | null {
    const contribution = this.getContribution(element.type);
    if (contribution?.serialize) {
      return contribution.serialize(element);
    }

    if (element.type === 'path') {
      const pathData = (element as PathElement).data as PathData;
      const pathD = commandsToString(pathData.subPaths.flat());

      // Use centralized behavior handler for effective stroke color
      const effectiveStrokeColor = getEffectiveStrokeColor(pathData);

      let result = `<path id="${element.id}" d="${pathD}" stroke="${effectiveStrokeColor}" stroke-width="${pathData.strokeWidth}" fill="${pathData.fillColor}" fill-opacity="${pathData.fillOpacity}" stroke-opacity="${pathData.strokeOpacity}"`;

      if (pathData.strokeLinecap) {
        result += ` stroke-linecap="${pathData.strokeLinecap}"`;
      }
      if (pathData.strokeLinejoin) {
        result += ` stroke-linejoin="${pathData.strokeLinejoin}"`;
      }
      if (pathData.fillRule) {
        result += ` fill-rule="${pathData.fillRule}"`;
      }
      if (pathData.strokeDasharray && pathData.strokeDasharray !== 'none') {
        result += ` stroke-dasharray="${pathData.strokeDasharray}"`;
      }
      if (pathData.opacity !== undefined) {
        result += ` opacity="${pathData.opacity}"`;
      }

      result += ' />';
      return result;
    }

    return null;
  }
}

export const elementContributionRegistry = new ElementContributionRegistry();

function rotateCommands(
  commands: Command[],
  angleDegrees: number,
  centerX: number,
  centerY: number,
  precision: number
): Command[] {
  const cos = Math.cos((angleDegrees * Math.PI) / 180);
  const sin = Math.sin((angleDegrees * Math.PI) / 180);

  return mapCommandPoints(commands, (pt) => {
    const x = pt.x - centerX;
    const y = pt.y - centerY;
    return {
      x: formatToPrecision(x * cos - y * sin + centerX, precision),
      y: formatToPrecision(x * sin + y * cos + centerY, precision),
    };
  });
}

function applyAffineToPath(
  commands: Command[],
  matrix: [number, number, number, number, number, number],
  precision: number
): Command[] {
  const [a, b, c, d, e, f] = matrix;

  return mapCommandPoints(commands, (pt) => ({
    x: formatToPrecision(a * pt.x + c * pt.y + e, precision),
    y: formatToPrecision(b * pt.x + d * pt.y + f, precision),
  }));
}
