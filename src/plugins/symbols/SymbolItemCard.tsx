import React, { useMemo } from 'react';
import type { SymbolDefinition } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { commandsToString } from '../../utils/pathParserUtils';

interface SymbolItemCardProps {
    symbol: SymbolDefinition;
    isSelected?: boolean;
    onClick?: () => void;
}

export const SymbolItemCard: React.FC<SymbolItemCardProps> = ({
    symbol,
    isSelected,
    onClick
}) => {
    // Build SVG content for preview - prefer rawContent for animated symbols
    const svgContent = useMemo(() => {
        if (symbol.rawContent) {
            // Extract inner content from rawContent (strip outer svg/symbol if present)
            const match = symbol.rawContent.match(/<(?:svg|symbol)[^>]*>([\s\S]*)<\/(?:svg|symbol)>/i);
            return match ? match[1] : symbol.rawContent;
        }
        // Fallback to path from pathData
        return `<path d="${commandsToString(symbol.pathData.subPaths.flat())}" fill="currentColor" />`;
    }, [symbol.rawContent, symbol.pathData]);

    const viewBox = symbol.bounds 
        ? `${symbol.bounds.minX} ${symbol.bounds.minY} ${symbol.bounds.width} ${symbol.bounds.height}` 
        : '0 0 100 100';

    return (
        <LibraryItemCard
            name={symbol.name}
            isSelected={isSelected}
            onClick={onClick}
            preview={
                <svg
                  viewBox={viewBox}
                  width="100%"
                  height="100%"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            }
        />
    );
};
