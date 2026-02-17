import type { CanvasElement, PathElement } from '../types';
import { buildElementMap } from './';

const collectPathsFromElement = (
  elementId: string,
  elementMap: Map<string, CanvasElement>,
  visited: Set<string>,
  paths: PathElement[]
): boolean => {
  if (visited.has(elementId)) return true;
  visited.add(elementId);

  const element = elementMap.get(elementId);
  if (!element) return false;

  if (element.type === 'path') {
    paths.push(element as PathElement);
    return true;
  }

  if (element.type === 'group') {
    const childIds = (element.data as { childIds?: string[] }).childIds ?? [];
    return childIds.every((childId) => collectPathsFromElement(childId, elementMap, visited, paths));
  }

  return false;
};

export const selectionHasOnlyPaths = (
  selectedIds: string[],
  elements: CanvasElement[],
  prebuiltMap?: Map<string, CanvasElement>
): boolean => {
  if (!selectedIds.length) return false;
  const elementMap = prebuiltMap ?? buildElementMap(elements);
  const visited = new Set<string>();
  const paths: PathElement[] = [];

  const allValid = selectedIds.every((id) => collectPathsFromElement(id, elementMap, visited, paths));
  return allValid && paths.length > 0;
};

export const getPathsFromSelection = (
  selectedIds: string[],
  elements: CanvasElement[],
  prebuiltMap?: Map<string, CanvasElement>
): PathElement[] => {
  const elementMap = prebuiltMap ?? buildElementMap(elements);
  const visited = new Set<string>();
  const paths: PathElement[] = [];

  selectedIds.forEach((id) => {
    collectPathsFromElement(id, elementMap, visited, paths);
  });

  return paths;
};
