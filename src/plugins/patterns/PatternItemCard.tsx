import React, { useMemo } from 'react';
import type { PatternDef } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { buildPatternPreviewSvg } from './patternPreviewUtils';

interface PatternItemCardProps {
    pattern: PatternDef;
    isSelected?: boolean;
    onClick?: () => void;
}

export const PatternItemCard: React.FC<PatternItemCardProps> = ({
    pattern,
    isSelected,
    onClick
}) => {
    const previewSvg = useMemo(
        () => buildPatternPreviewSvg(pattern, 30, `preview-pattern-item-${pattern.id}`),
        [pattern]
    );

    return (
        <LibraryItemCard
            name={pattern.name}
            isSelected={isSelected}
            onClick={onClick}
            details={`${pattern.type}, ${pattern.size}px`}
            preview={
                <div
                    style={{ width: '100%', height: '100%' }}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
            }
        />
    );
};
