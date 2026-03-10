import type { NativeTextElement } from './types';
import { measureNativeTextBounds } from '../../utils/measurementUtils';

export const computeNativeTextTransformAttr = (data: NativeTextElement['data']) => {
  if (data.transformMatrix) {
    return `matrix(${data.transformMatrix.join(' ')})`;
  }
  if (data.transform) {
    const cx = data.x;
    const cy = data.y;
    return `translate(${data.transform.translateX ?? 0} ${data.transform.translateY ?? 0}) rotate(${data.transform.rotation ?? 0} ${cx} ${cy}) scale(${data.transform.scaleX ?? 1} ${data.transform.scaleY ?? 1})`;
  }
  return undefined;
};

export const getNativeTextAlign = (
  textAnchor?: NativeTextElement['data']['textAnchor']
): 'left' | 'center' | 'right' => {
  switch (textAnchor) {
    case 'middle':
      return 'center';
    case 'end':
      return 'right';
    default:
      return 'left';
  }
};

export const isVerticalWritingMode = (writingMode?: NativeTextElement['data']['writingMode']) =>
  Boolean(writingMode && writingMode !== 'horizontal-tb');

export const getNativeTextEditorBox = (data: NativeTextElement['data']) => {
  const bounds = measureNativeTextBounds(data);
  const baseWidth = Math.max(bounds.maxX - bounds.minX, data.fontSize * 0.75);
  const baseHeight = Math.max(bounds.maxY - bounds.minY, data.fontSize * (data.lineHeight ?? 1.2));
  const strokePadding = (data.strokeWidth ?? 0) / 2;
  const paddingX = Math.max(4, data.fontSize * 0.14 + strokePadding);
  const paddingY = Math.max(3, data.fontSize * 0.1 + strokePadding + 1);
  const widthSlack = Math.max(
    3,
    data.fontSize * 0.18 + Math.max(0, data.letterSpacing ?? 0)
  );
  const width = baseWidth + paddingX * 2 + widthSlack;
  const height = baseHeight + paddingY * 2;
  const vertical = isVerticalWritingMode(data.writingMode);
  const x = bounds.minX - paddingX;

  return {
    bounds,
    x,
    y: bounds.minY - paddingY,
    width,
    height,
    paddingX,
    paddingY,
    textAlign: vertical ? 'left' : getNativeTextAlign(data.textAnchor),
  };
};