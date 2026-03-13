import { describe, expect, it } from 'vitest';
import { masksPlugin } from '../../plugins/masks';
import { extractStyleAttributes } from './styleAttributes';

type FakeElement = Pick<Element, 'getAttribute' | 'hasAttribute' | 'querySelector' | 'parentElement'>;

const createFakeElement = (attributes: Record<string, string> = {}): Element => {
  const element: FakeElement = {
    parentElement: null,
    getAttribute: (name: string) => attributes[name] ?? null,
    hasAttribute: (name: string) => Object.prototype.hasOwnProperty.call(attributes, name),
    querySelector: () => null,
  };

  return element as Element;
};

describe('extractStyleAttributes', () => {
  it('does not inherit mask ids into descendants', () => {
    const element = createFakeElement();

    const style = extractStyleAttributes(element, {
      strokeColor: '#fff',
      maskId: 'fade',
    });

    expect(style.strokeColor).toBe('#fff');
    expect((style as { maskId?: string }).maskId).toBeUndefined();
  });

  it('still reads a mask id from the element itself', () => {
    const element = createFakeElement({ mask: 'url(#fade)' });
    const extracted = masksPlugin.styleAttributeExtractor?.(element);

    expect((extracted as { maskId?: string } | undefined)?.maskId).toBe('fade');
  });
});