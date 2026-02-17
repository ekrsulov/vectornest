export * from './types';
export * from './extraction';
export * from './finding';

/**
 * Get human-readable label for snap point type
 */
export function getSnapPointLabel(type: import('./types').SnapPointType): string {
    switch (type) {
        case 'grid':
            return 'Grid';
        case 'vertex':
        case 'anchor':
            return 'Anchor';
        case 'path':
            return 'Path';
        case 'center':
        case 'bbox-center':
            return 'Center';
        case 'bbox-corner':
            return 'Corner';
        case 'midpoint':
            return 'Midpoint';
        case 'intersection':
            return 'Intersection';
        case 'guide':
            return 'Guide';
        default:
            return 'Snap';
    }
}
