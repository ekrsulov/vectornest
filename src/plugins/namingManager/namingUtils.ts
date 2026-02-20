import type { CanvasElement } from '../../types';
import type { ElementLabel } from './slice';

export function generateLabels(
  elements: CanvasElement[],
  options: {
    prefix: string;
    suffix: string;
    separator: string;
    startNumber: number;
    pattern: 'prefix-number' | 'type-number' | 'custom';
    customPattern: string;
  }
): ElementLabel[] {
  const labels: ElementLabel[] = [];
  let counter = options.startNumber;

  for (const el of elements) {
    const currentName = (el.data as Record<string, unknown>).name as string || el.id.slice(0, 8);
    let newName: string;

    switch (options.pattern) {
      case 'prefix-number':
        newName = `${options.prefix}${options.separator}${counter}${options.suffix ? options.separator + options.suffix : ''}`;
        break;
      case 'type-number':
        newName = `${el.type}${options.separator}${counter}${options.suffix ? options.separator + options.suffix : ''}`;
        break;
      case 'custom':
        newName = options.customPattern
          .replace('{prefix}', options.prefix)
          .replace('{suffix}', options.suffix)
          .replace('{sep}', options.separator)
          .replace('{n}', String(counter))
          .replace('{nn}', String(counter).padStart(2, '0'))
          .replace('{nnn}', String(counter).padStart(3, '0'))
          .replace('{type}', el.type)
          .replace('{id}', el.id.slice(0, 6));
        break;
      default:
        newName = `${options.prefix}${options.separator}${counter}`;
    }

    labels.push({ id: el.id, currentName, newName, type: el.type });
    counter++;
  }

  return labels;
}

export function getElementStats(elements: CanvasElement[]): { named: number; unnamed: number; total: number } {
  let named = 0;
  let unnamed = 0;
  for (const el of elements) {
    const name = (el.data as Record<string, unknown>).name as string | undefined;
    if (name && name.length > 0) {
      named++;
    } else {
      unnamed++;
    }
  }
  return { named, unnamed, total: elements.length };
}
