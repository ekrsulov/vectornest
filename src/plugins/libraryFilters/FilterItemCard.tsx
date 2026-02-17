import React from 'react';
import type { FilterDefinition } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { renderFilterNode } from './renderer';

interface FilterItemCardProps {
    filter: FilterDefinition;
    isSelected?: boolean;
    onClick?: () => void;
}

// A colorful geometric figure to demonstrate filters
const FilterPreviewFigure: React.FC<{ filter: FilterDefinition }> = ({ filter }) => {
    // specific ID for preview to avoid conflict with globalDefs
    const previewId = `${filter.id}-preview`;
    const previewFilter = { ...filter, id: previewId };

    return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `url(#${previewId})` }}>
            <defs>
                {renderFilterNode(previewFilter)}
            </defs>
            <g>
                {/* Background Circle */}
                <circle cx="50" cy="50" r="45" fill="#e2e8f0" />

                {/* Colorful Shapes */}
                <rect x="25" y="25" width="25" height="25" fill="#ef4444" rx="4" />
                <circle cx="70" cy="35" r="15" fill="#3b82f6" />
                <path d="M 25 75 L 50 40 L 75 75 Z" fill="#22c55e" />
                <rect x="60" y="60" width="20" height="20" fill="#eab308" transform="rotate(45 70 70)" />

                {/* Strokes */}
                <path d="M 10 50 Q 50 10 90 50" stroke="#8b5cf6" strokeWidth="4" fill="none" />
                <circle cx="50" cy="50" r="30" stroke="#ec4899" strokeWidth="2" fill="none" strokeDasharray="4 4" />
            </g>
        </svg>
    );
};

export const FilterItemCard: React.FC<FilterItemCardProps> = ({
    filter,
    isSelected,
    onClick
}) => {
    return (
        <LibraryItemCard
            name={filter.name}
            isSelected={isSelected}
            onClick={onClick}
            details={`${filter.primitives.length} effects`}
            preview={
                <FilterPreviewFigure filter={filter} />
            }
        />
    );
};
