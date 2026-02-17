import { parsePath, absolutize, normalize } from 'path-data-parser';

export function normalizeToMLCZ(pathData: string): string {
  const parsed = parsePath(pathData);
  const absolute = absolutize(parsed);
  const normalized = normalize(absolute);

  const result: string[] = [];
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;

  normalized.forEach((command) => {
    const { key, data } = command;
    switch (key) {
      case 'M':
        currentX = data[0];
        currentY = data[1];
        subpathStartX = currentX;
        subpathStartY = currentY;
        result.push(`M ${currentX} ${currentY}`);
        break;
      case 'L':
        currentX = data[0];
        currentY = data[1];
        result.push(`L ${currentX} ${currentY}`);
        break;
      case 'C':
        currentX = data[4];
        currentY = data[5];
        result.push(`C ${data[0]} ${data[1]} ${data[2]} ${data[3]} ${data[4]} ${data[5]}`);
        break;
      case 'H':
        currentX = data[0];
        result.push(`L ${currentX} ${currentY}`);
        break;
      case 'V':
        currentY = data[0];
        result.push(`L ${currentX} ${currentY}`);
        break;
      case 'Z':
        currentX = subpathStartX;
        currentY = subpathStartY;
        result.push('Z');
        break;
      default:
        break;
    }
  });

  return result.join(' ');
}
