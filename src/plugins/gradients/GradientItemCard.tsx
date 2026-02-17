import React, { useMemo } from 'react';
import type { GradientDef, GradientStop } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';

interface GradientItemCardProps {
    gradient: GradientDef;
    isSelected?: boolean;
    onClick?: () => void;
}

export const GradientItemCard: React.FC<GradientItemCardProps> = ({
    gradient,
    isSelected,
    onClick
}) => {
    const previewStyle = useMemo(() => {
        const normalizeStops = (raw: GradientStop[]) => {
            if (!raw.length) return raw;
            const sorted = raw
                .map((s) => ({ ...s, offset: Math.min(100, Math.max(0, s.offset)) }))
                .sort((a, b) => a.offset - b.offset);
            sorted[0].offset = 0;
            sorted[sorted.length - 1].offset = 100;
            return sorted;
        };

        const stops = normalizeStops(gradient.stops.slice());

        const preview = gradient.type === 'linear'
            ? `linear-gradient(${gradient.angle ?? 90}deg, ${stops.map((s) => `${s.color} ${s.offset}%`).join(',')})`
            : `radial-gradient(circle at ${gradient.cx ?? 50}% ${gradient.cy ?? 50}%, ${stops.map((s) => `${s.color} ${s.offset}%`).join(',')})`;

        return { backgroundImage: preview };
    }, [gradient]);

    return (
        <LibraryItemCard
            name={gradient.name}
            isSelected={isSelected}
            onClick={onClick}
            details={`${gradient.type === 'linear' ? `${gradient.angle}°` : 'Radial'}, ${gradient.stops.length} stops`}
            preview={
                <div style={{ width: '100%', height: '100%', ...previewStyle }} />
            }
        />
    );
};
