import { describe, expect, it } from 'vitest';
import {
  collectExplicitPresentationAttributes,
  shouldSerializeDefinitionPresentationAttribute,
} from './sourcePresentationAttributes';

describe('sourcePresentationAttributes', () => {
  it('collects explicitly declared presentation attributes from attributes and inline styles', () => {
    const attributes = new Map([
      ['fill', '#f00'],
      ['style', 'stroke:#0f0; fill-opacity:0.5'],
    ]);
    const rect = {
      hasAttribute: (name: string) => attributes.has(name),
      getAttribute: (name: string) => attributes.get(name) ?? null,
    } as unknown as Element;

    expect(collectExplicitPresentationAttributes(rect)).toEqual(
      expect.arrayContaining(['fill', 'stroke', 'fill-opacity']),
    );
  });

  it('omits default presentation attributes for imported definitions when they were not explicit in source', () => {
    const definitionData = {
      isDefinition: true,
      sourceExplicitAttributes: [],
    };

    expect(shouldSerializeDefinitionPresentationAttribute(definitionData, 'fill', '#000000')).toBe(false);
    expect(shouldSerializeDefinitionPresentationAttribute(definitionData, 'stroke', 'none')).toBe(false);
    expect(shouldSerializeDefinitionPresentationAttribute(definitionData, 'fill-opacity', 1)).toBe(false);
    expect(shouldSerializeDefinitionPresentationAttribute(definitionData, 'stroke-width', 1)).toBe(false);
    expect(shouldSerializeDefinitionPresentationAttribute(definitionData, 'stroke-opacity', 1)).toBe(false);
  });

  it('keeps non-default or explicit source attributes on imported definitions', () => {
    const implicitDefinitionData = {
      isDefinition: true,
      sourceExplicitAttributes: [],
    };
    const explicitDefinitionData = {
      isDefinition: true,
      sourceExplicitAttributes: ['fill'],
    };

    expect(shouldSerializeDefinitionPresentationAttribute(implicitDefinitionData, 'fill', '#ff595e')).toBe(true);
    expect(shouldSerializeDefinitionPresentationAttribute(explicitDefinitionData, 'fill', '#000000')).toBe(true);
    expect(shouldSerializeDefinitionPresentationAttribute(undefined, 'fill', '#000000')).toBe(true);
  });
});
