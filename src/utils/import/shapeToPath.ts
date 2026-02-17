import { BEZIER_CIRCLE_KAPPA } from '../bezierCircle';

/**
 * Convert basic SVG shapes to path data string
 */
export function shapeToPath(element: Element): string | null {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'rect': {
      const x = parseFloat(element.getAttribute('x') || '0');
      const y = parseFloat(element.getAttribute('y') || '0');
      const width = parseFloat(element.getAttribute('width') || '0');
      const height = parseFloat(element.getAttribute('height') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || element.getAttribute('rx') || '0');

      if (rx > 0 || ry > 0) {
        const rxClamped = Math.min(rx, width / 2);
        const ryClamped = Math.min(ry, height / 2);

        return (
          `M ${x + rxClamped} ${y} ` +
          `L ${x + width - rxClamped} ${y} ` +
          `Q ${x + width} ${y} ${x + width} ${y + ryClamped} ` +
          `L ${x + width} ${y + height - ryClamped} ` +
          `Q ${x + width} ${y + height} ${x + width - rxClamped} ${y + height} ` +
          `L ${x + rxClamped} ${y + height} ` +
          `Q ${x} ${y + height} ${x} ${y + height - ryClamped} ` +
          `L ${x} ${y + ryClamped} ` +
          `Q ${x} ${y} ${x + rxClamped} ${y} Z`
        );
      }

      return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
    }

    case 'circle': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const r = parseFloat(element.getAttribute('r') || '0');

      const k = BEZIER_CIRCLE_KAPPA;
      const kr = k * r;

      return (
        `M ${cx} ${cy - r} ` +
        `C ${cx + kr} ${cy - r} ${cx + r} ${cy - kr} ${cx + r} ${cy} ` +
        `C ${cx + r} ${cy + kr} ${cx + kr} ${cy + r} ${cx} ${cy + r} ` +
        `C ${cx - kr} ${cy + r} ${cx - r} ${cy + kr} ${cx - r} ${cy} ` +
        `C ${cx - r} ${cy - kr} ${cx - kr} ${cy - r} ${cx} ${cy - r} Z`
      );
    }

    case 'ellipse': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');

      const k = BEZIER_CIRCLE_KAPPA;
      const krx = k * rx;
      const kry = k * ry;

      return (
        `M ${cx} ${cy - ry} ` +
        `C ${cx + krx} ${cy - ry} ${cx + rx} ${cy - kry} ${cx + rx} ${cy} ` +
        `C ${cx + rx} ${cy + kry} ${cx + krx} ${cy + ry} ${cx} ${cy + ry} ` +
        `C ${cx - krx} ${cy + ry} ${cx - rx} ${cy + kry} ${cx - rx} ${cy} ` +
        `C ${cx - rx} ${cy - kry} ${cx - krx} ${cy - ry} ${cx} ${cy - ry} Z`
      );
    }

    case 'line': {
      const x1 = parseFloat(element.getAttribute('x1') || '0');
      const y1 = parseFloat(element.getAttribute('y1') || '0');
      const x2 = parseFloat(element.getAttribute('x2') || '0');
      const y2 = parseFloat(element.getAttribute('y2') || '0');

      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    case 'polyline':
    case 'polygon': {
      const points = element.getAttribute('points');
      if (!points) return null;

      const coords = points.trim().split(/[\s,]+/).map(parseFloat);
      if (coords.length < 2) return null;

      // Ensure even number of coordinates (each point needs x,y pair)
      const coordCount = coords.length & ~1;

      let path = `M ${coords[0]} ${coords[1]}`;
      for (let i = 2; i < coordCount; i += 2) {
        path += ` L ${coords[i]} ${coords[i + 1]}`;
      }

      if (tagName === 'polygon') {
        path += ' Z';
      }

      return path;
    }

    default:
      return null;
  }
}
