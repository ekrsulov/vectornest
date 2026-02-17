import type { Command } from '../types';

/**
 * Helper to group selected subpaths by element ID
 * Returns a map of elementId -> array of subpath indices
 */
export const groupSubpathsByElement = (
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>
): Record<string, number[]> => {
  return selectedSubpaths.reduce((acc, subpath) => {
    if (!acc[subpath.elementId]) {
      acc[subpath.elementId] = [];
    }
    acc[subpath.elementId].push(subpath.subpathIndex);
    return acc;
  }, {} as Record<string, number[]>);
};

/**
 * Helper to move subpaths within their element's subPaths array
 * Used for reordering operations (bring to front, send to back, etc.)
 */
export const moveSubpathsWithinElement = (
  subPaths: Command[][],
  indices: number[],
  operation: 'toFront' | 'toBack' | 'forward' | 'backward'
): { newSubPaths: Command[][]; newIndices: number[] } => {
  const newSubPaths = [...subPaths];
  const newIndices: number[] = [];

  switch (operation) {
    case 'toFront': {
      // Sort indices in descending order to handle correctly
      const sortedIndices = [...indices].sort((a, b) => b - a);
      const subpathsToMove: Command[][] = [];

      // Extract subpaths to move (from back to front to preserve indices)
      sortedIndices.forEach(index => {
        if (index < newSubPaths.length) {
          subpathsToMove.unshift(newSubPaths.splice(index, 1)[0]);
        }
      });

      // Add them at the end (front in rendering order)
      const startIndex = newSubPaths.length;
      newSubPaths.push(...subpathsToMove);

      // Calculate new indices
      subpathsToMove.forEach((_, i) => {
        newIndices.push(startIndex + i);
      });
      break;
    }

    case 'toBack': {
      // Sort indices in descending order so splice doesn't shift remaining indices
      const sortedIndices = [...indices].sort((a, b) => b - a);
      const subpathsToMove: Command[][] = [];

      // Extract subpaths to move (from back to front to preserve indices)
      sortedIndices.forEach(index => {
        if (index < newSubPaths.length) {
          subpathsToMove.unshift(newSubPaths.splice(index, 1)[0]);
        }
      });

      // Add them at the beginning (back in rendering order)
      newSubPaths.unshift(...subpathsToMove);

      // Calculate new indices (they're now at the beginning)
      subpathsToMove.forEach((_, i) => {
        newIndices.push(i);
      });
      break;
    }

    case 'forward': {
      // Sort indices in descending order to avoid index shifting
      const sortedIndices = [...indices].sort((a, b) => b - a);

      sortedIndices.forEach(index => {
        if (index < newSubPaths.length - 1) {
          // Swap with the next subpath (move forward one position)
          [newSubPaths[index], newSubPaths[index + 1]] = [newSubPaths[index + 1], newSubPaths[index]];
          newIndices.push(index + 1);
        } else {
          // Can't move forward, keep current position
          newIndices.push(index);
        }
      });
      break;
    }

    case 'backward': {
      // Sort indices in ascending order to avoid index shifting
      const sortedIndices = [...indices].sort((a, b) => a - b);

      sortedIndices.forEach(index => {
        if (index > 0) {
          // Swap with the previous subpath (move backward one position)
          [newSubPaths[index], newSubPaths[index - 1]] = [newSubPaths[index - 1], newSubPaths[index]];
          newIndices.push(index - 1);
        } else {
          // Can't move backward, keep current position
          newIndices.push(index);
        }
      });
      break;
    }
  }

  return { newSubPaths, newIndices };
};

/**
 * Helper to delete subpaths from an element's subPaths array
 * Returns the updated subPaths array with the specified indices removed
 */
export const deleteSubpathsFromElement = (
  subPaths: Command[][],
  indicesToDelete: number[]
): Command[][] => {
  const newSubPaths = [...subPaths];
  // Sort indices in descending order to avoid index shifting issues
  const sortedIndices = [...indicesToDelete].sort((a, b) => b - a);

  // Remove subpaths from highest index to lowest
  sortedIndices.forEach(index => {
    if (index < newSubPaths.length) {
      newSubPaths.splice(index, 1);
    }
  });

  return newSubPaths;
};
