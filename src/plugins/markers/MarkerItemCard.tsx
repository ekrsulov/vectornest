import React from 'react';
import type { MarkerDefinition } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';

interface MarkerItemCardProps {
    marker: MarkerDefinition;
    isSelected?: boolean;
    onClick?: () => void;
}

export const MarkerItemCard: React.FC<MarkerItemCardProps> = ({
    marker,
    isSelected,
    onClick
}) => {
    return (
        <LibraryItemCard
            name={marker.name}
            isSelected={isSelected}
            onClick={onClick}
            preview={
                <svg viewBox={`0 0 ${marker.markerWidth} ${marker.markerHeight}`} width="100%" height="100%">
                    <path d={marker.path} fill="currentColor" />
                </svg>
            }
        />
    );
};
