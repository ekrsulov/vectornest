import type { PathData } from '../../types';
import { logger } from '../logger';
import { normalizeMarkerId } from '../markerUtils';
import { pluginManager } from '../pluginManager';
import {
  parseFontShorthand,
  parseFontSize,
  resolveInheritedFontSize,
} from '../import/textStyleUtils';
import { parseColorOpacity, parseStyleRules } from './parser';

const applyStyleDeclarationsToElement = (
  element: Element,
  declarations: Record<string, string>
): void => {
  const baseFontSize = resolveInheritedFontSize(element.parentElement, undefined);
  const setIfMissing = (attr: string, value: string) => {
    if (!element.hasAttribute(attr)) {
      element.setAttribute(attr, value);
    }
  };

  Object.entries(declarations).forEach(([prop, val]) => {
    switch (prop) {
      case 'fill': {
        const { color, opacity } = parseColorOpacity(val);
        if (color) setIfMissing('fill', color);
        if (opacity !== null) setIfMissing('fill-opacity', String(opacity));
        break;
      }
      case 'stroke': {
        const { color, opacity } = parseColorOpacity(val);
        if (color) setIfMissing('stroke', color);
        if (opacity !== null) setIfMissing('stroke-opacity', String(opacity));
        break;
      }
      case 'stroke-width': {
        const num = parseFloat(val);
        if (Number.isFinite(num)) setIfMissing('stroke-width', String(num));
        break;
      }
      case 'stroke-linecap':
      case 'stroke-linejoin':
      case 'stroke-dasharray': {
        setIfMissing(prop, val);
        break;
      }
      case 'stroke-opacity':
      case 'fill-opacity':
      case 'opacity': {
        const num = parseFloat(val);
        if (Number.isFinite(num)) setIfMissing(prop, String(num));
        break;
      }
      case 'font': {
        const parsed = parseFontShorthand(val, baseFontSize);
        if (parsed.fontSize !== undefined) setIfMissing('font-size', String(parsed.fontSize));
        if (parsed.fontFamily) setIfMissing('font-family', parsed.fontFamily);
        if (parsed.fontWeight) setIfMissing('font-weight', parsed.fontWeight);
        if (parsed.fontStyle) setIfMissing('font-style', parsed.fontStyle);
        break;
      }
      case 'font-family':
      case 'font-weight':
      case 'font-style': {
        setIfMissing(prop, val);
        break;
      }
      case 'font-size': {
        const num = parseFontSize(val, baseFontSize);
        if (num !== undefined) setIfMissing('font-size', String(num));
        break;
      }
      case 'letter-spacing': {
        const num = parseFloat(val);
        if (Number.isFinite(num)) setIfMissing('letter-spacing', String(num));
        break;
      }
      case 'rx':
      case 'ry': {
        const num = parseFloat(val);
        if (Number.isFinite(num)) setIfMissing(prop, String(num));
        break;
      }
      default:
        break;
    }
  });
};

export const applyEmbeddedClassStyles = (doc: Document): void => {
  const styleNodes = Array.from(doc.querySelectorAll('style'));
  if (!styleNodes.length) {
    return;
  }

  const classRules: Record<string, Record<string, string>> = {};
  styleNodes.forEach((node) => {
    const text = node.textContent ?? '';
    const rules = parseStyleRules(text);
    Object.entries(rules).forEach(([selector, declarations]) => {
      classRules[selector] = { ...(classRules[selector] ?? {}), ...declarations };
    });
  });

  if (Object.keys(classRules).length === 0) {
    return;
  }

  const elementsWithClass = Array.from(doc.querySelectorAll('[class]'));
  elementsWithClass.forEach((element) => {
    const classAttr = element.getAttribute('class') ?? '';
    const classList = classAttr.split(/\s+/).filter(Boolean);
    classList.forEach((className) => {
      const declarations = classRules[`.${className}`];
      if (declarations) {
        applyStyleDeclarationsToElement(element, declarations);
      }
    });
  });
};

export function extractStyleAttributes(
  element: Element,
  inherited: Partial<PathData> = {}
): Partial<PathData> {
  const {
    clipPathId: _clipPathId,
    clipPathTemplateId: _clipPathTemplateId,
    filterId: _filterId,
    opacity: _opacity,
    mixBlendMode: _mixBlendMode,
    isolation: _isolation,
    ...inheritable
  } = inherited as Record<string, unknown>;
  const style: Partial<PathData> = { ...(inheritable as Partial<PathData>) };

  const getAttr = (name: string): string | null => element.getAttribute(name) || null;

  const styleAttr = element.getAttribute('style');
  const styleProps: Record<string, string> = {};
  if (styleAttr) {
    styleAttr.split(';').forEach((prop) => {
      const [key, value] = prop.split(':').map((token) => token.trim());
      if (key && value) {
        styleProps[key] = value;
      }
    });
  }

  const getValue = (attrName: string, styleName?: string): string | null => {
    return styleProps[styleName || attrName] || getAttr(attrName);
  };

  const stroke = getValue('stroke');
  if (stroke && stroke !== 'none') {
    style.strokeColor = stroke;
  } else if (stroke === 'none') {
    style.strokeColor = 'none';
  }
  if (style.strokeColor === undefined) {
    const inheritedStroke = (inheritable as Partial<PathData>).strokeColor;
    style.strokeColor = inheritedStroke ?? 'none';
  }

  const strokeWidth = getValue('stroke-width', 'stroke-width');
  if (strokeWidth) {
    style.strokeWidth = parseFloat(strokeWidth);
  }

  const strokeOpacity = getValue('stroke-opacity', 'stroke-opacity');
  if (strokeOpacity) {
    style.strokeOpacity = parseFloat(strokeOpacity);
  }

  const fill = getValue('fill');
  if (fill && fill !== 'none') {
    style.fillColor = fill;
  } else if (fill === 'none') {
    style.fillColor = 'none';
  }
  if (!style.fillColor || style.fillColor === 'none') {
    const fillAnim = element.querySelector('animate[attributeName="fill"]');
    if (fillAnim) {
      const values = fillAnim.getAttribute('values');
      const from = fillAnim.getAttribute('from');
      const to = fillAnim.getAttribute('to');
      const candidate = values?.split(';').map((value) => value.trim()).filter(Boolean)[0] || from || to;
      if (candidate) {
        style.fillColor = candidate;
      }
    }
  }

  const fillOpacity = getValue('fill-opacity', 'fill-opacity');
  if (fillOpacity) {
    style.fillOpacity = parseFloat(fillOpacity);
  }

  const opacity = getValue('opacity', 'opacity');
  if (opacity) {
    (style as { opacity?: number }).opacity = parseFloat(opacity);
  }

  const strokeLinecap = getValue('stroke-linecap', 'stroke-linecap');
  if (strokeLinecap && (strokeLinecap === 'butt' || strokeLinecap === 'round' || strokeLinecap === 'square')) {
    style.strokeLinecap = strokeLinecap as 'butt' | 'round' | 'square';
  }

  const strokeLinejoin = getValue('stroke-linejoin', 'stroke-linejoin');
  if (strokeLinejoin && (strokeLinejoin === 'miter' || strokeLinejoin === 'round' || strokeLinejoin === 'bevel')) {
    style.strokeLinejoin = strokeLinejoin as 'miter' | 'round' | 'bevel';
  }

  const fillRule = getValue('fill-rule', 'fill-rule');
  if (fillRule && (fillRule === 'nonzero' || fillRule === 'evenodd')) {
    style.fillRule = fillRule as 'nonzero' | 'evenodd';
  }

  const strokeDasharray = getValue('stroke-dasharray', 'stroke-dasharray');
  if (strokeDasharray && strokeDasharray !== 'none') {
    style.strokeDasharray = strokeDasharray;
  }

  const strokeDashoffset = getValue('stroke-dashoffset', 'stroke-dashoffset');
  if (strokeDashoffset) {
    const dashoffsetValue = parseFloat(strokeDashoffset);
    if (Number.isFinite(dashoffsetValue)) {
      style.strokeDashoffset = dashoffsetValue;
    }
  }

  const strokeMiterlimit = getValue('stroke-miterlimit', 'stroke-miterlimit');
  if (strokeMiterlimit) {
    const miterlimitValue = parseFloat(strokeMiterlimit);
    if (Number.isFinite(miterlimitValue) && miterlimitValue >= 1) {
      style.strokeMiterlimit = miterlimitValue;
    }
  }

  const visibility = getValue('visibility', 'visibility');
  if (visibility && (visibility === 'visible' || visibility === 'hidden' || visibility === 'collapse')) {
    style.visibility = visibility as 'visible' | 'hidden' | 'collapse';
  }

  const display = getValue('display', 'display');
  if (display && (display === 'inline' || display === 'block' || display === 'none')) {
    style.display = display as 'inline' | 'block' | 'none';
  }

  const vectorEffect = getValue('vector-effect', 'vector-effect');
  if (vectorEffect && (vectorEffect === 'none' || vectorEffect === 'non-scaling-stroke')) {
    style.vectorEffect = vectorEffect as 'none' | 'non-scaling-stroke';
  }

  const shapeRendering = getValue('shape-rendering', 'shape-rendering');
  if (
    shapeRendering &&
    (shapeRendering === 'auto' ||
      shapeRendering === 'optimizeSpeed' ||
      shapeRendering === 'crispEdges' ||
      shapeRendering === 'geometricPrecision')
  ) {
    style.shapeRendering = shapeRendering as
      | 'auto'
      | 'optimizeSpeed'
      | 'crispEdges'
      | 'geometricPrecision';
  }

  const mixBlendMode = getValue('mix-blend-mode', 'mix-blend-mode');
  if (mixBlendMode) {
    (style as { mixBlendMode?: string }).mixBlendMode = mixBlendMode;
  }

  const isolation = getValue('isolation', 'isolation');
  if (isolation === 'auto' || isolation === 'isolate') {
    (style as { isolation?: 'auto' | 'isolate' }).isolation = isolation;
  }

  const extractors = pluginManager.getStyleAttributeExtractors();
  for (const extractor of extractors) {
    try {
      const extra = extractor(element);
      Object.assign(style, extra);
    } catch (error) {
      logger.error('Error in style attribute extractor:', error);
    }
  }

  const markerStartAttr = normalizeMarkerId(element.getAttribute('marker-start'));
  const markerMidAttr = normalizeMarkerId(element.getAttribute('marker-mid'));
  const markerEndAttr = normalizeMarkerId(element.getAttribute('marker-end'));

  if (markerStartAttr && !(style as { markerStart?: string }).markerStart) {
    (style as { markerStart?: string }).markerStart = markerStartAttr;
  }
  if (markerMidAttr && !(style as { markerMid?: string }).markerMid) {
    (style as { markerMid?: string }).markerMid = markerMidAttr;
  }
  if (markerEndAttr && !(style as { markerEnd?: string }).markerEnd) {
    (style as { markerEnd?: string }).markerEnd = markerEndAttr;
  }

  return style;
}

export const applyInheritedStyleAttributes = (
  element: Element,
  inherited?: Partial<PathData>
): void => {
  if (!inherited) {
    return;
  }

  const setIfMissing = (attr: string, value: string | number | undefined): void => {
    if (value === undefined || value === null) return;
    if (!element.hasAttribute(attr)) {
      element.setAttribute(attr, String(value));
    }
  };

  setIfMissing('stroke', inherited.strokeColor);
  setIfMissing('stroke-width', inherited.strokeWidth);
  setIfMissing('stroke-opacity', inherited.strokeOpacity);
  setIfMissing('stroke-linecap', inherited.strokeLinecap);
  setIfMissing('stroke-linejoin', inherited.strokeLinejoin);
  setIfMissing('stroke-dasharray', inherited.strokeDasharray);
  setIfMissing('fill', inherited.fillColor);
  setIfMissing('fill-opacity', inherited.fillOpacity);
  setIfMissing('fill-rule', inherited.fillRule);
};
