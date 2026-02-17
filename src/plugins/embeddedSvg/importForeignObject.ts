import type { ImportedElement, Matrix } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';

type AffineMatrix = [number, number, number, number, number, number];

const sanitizeForeignObjectContent = (element: Element): string => {
  const clone = element.cloneNode(true) as Element;

  // Remove script tags inside the foreignObject content
  clone.querySelectorAll('script').forEach(node => node.remove());

  // Remove potentially dangerous attributes
  const cleanAttributes = (node: Element): void => {
    Array.from(node.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((name === 'href' || name === 'xlink:href' || name === 'src') && value.startsWith('javascript:')) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === 'style' && /expression\s*\(|javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });

    Array.from(node.children).forEach(child => cleanAttributes(child as Element));
  };

  cleanAttributes(clone);

  // Serialize children with XMLSerializer to preserve namespaces (e.g., XHTML)
  const serializer = new XMLSerializer();
  const serializedChildren = Array.from(clone.childNodes).map((node) => serializer.serializeToString(node)).join('');

  // Ensure there is an XHTML namespace on the first HTML child for better browser support
  if (!/xmlns=['"]http:\/\/www\.w3\.org\/1999\/xhtml['"]/.test(serializedChildren)) {
    return `<div xmlns="http://www.w3.org/1999/xhtml">${serializedChildren}</div>`;
  }

  return serializedChildren;
};

/**
 * Import handler for SVG <foreignObject> elements.
 */
export function importForeignObject(
  element: Element,
  transform: Matrix
): ImportedElement | null {
  if (element.tagName.toLowerCase() !== 'foreignobject') return null;

  const xAttr = parseFloat(element.getAttribute('x') || '0');
  const yAttr = parseFloat(element.getAttribute('y') || '0');
  const widthAttr = parseFloat(element.getAttribute('width') || '0');
  const heightAttr = parseFloat(element.getAttribute('height') || '0');

  const x = Number.isFinite(xAttr) ? xAttr : 0;
  const y = Number.isFinite(yAttr) ? yAttr : 0;
  const width = Number.isFinite(widthAttr) ? widthAttr : 0;
  const height = Number.isFinite(heightAttr) ? heightAttr : 0;

  const style = extractStyleAttributes(element);

  const matrixArr: AffineMatrix = [
    transform.a,
    transform.b,
    transform.c,
    transform.d,
    transform.e,
    transform.f,
  ];

  const innerHtml = sanitizeForeignObjectContent(element);

  return {
    type: 'foreignObject',
    data: {
      x,
      y,
      width,
      height,
      innerHtml,
      overflow: element.getAttribute('overflow') || undefined,
      requiredExtensions: element.getAttribute('requiredExtensions') || undefined,
      transformMatrix: matrixArr,
      filterId: (style as { filterId?: string }).filterId,
      clipPathId: (style as { clipPathId?: string }).clipPathId,
      clipPathTemplateId: (style as { clipPathTemplateId?: string }).clipPathTemplateId,
      maskId: (style as { maskId?: string }).maskId,
      mixBlendMode: (style as { mixBlendMode?: string }).mixBlendMode,
      isolation: (style as { isolation?: 'auto' | 'isolate' }).isolation,
      opacity: (style as { opacity?: number }).opacity,
      sourceId: element.getAttribute('id') ?? undefined,
    },
  };
}
