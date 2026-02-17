import type { PathData } from '../../types';
import type { ImportedElement, SVGDimensions } from './importTypes';

export function flattenImportedElements(elements: ImportedElement[]): PathData[] {
  const paths: PathData[] = [];

  elements.forEach((element) => {
    if (element.type === 'path') {
      paths.push(element.data);
    } else if (element.type === 'group') {
      paths.push(...flattenImportedElements(element.children));
    }
  });

  return paths;
}

export function extractSVGDimensions(svgElement: Element): SVGDimensions {
  const width = parseFloat(svgElement.getAttribute('width') || '0');
  const height = parseFloat(svgElement.getAttribute('height') || '0');

  let viewBox: SVGDimensions['viewBox'] | undefined;
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      viewBox = {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3],
      };
    }
  }

  return {
    width: width || (viewBox ? viewBox.width : 0),
    height: height || (viewBox ? viewBox.height : 0),
    viewBox,
  };
}
