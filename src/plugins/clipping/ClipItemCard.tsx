import React, { useMemo } from 'react';
import type { ClipDefinition } from './slice';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { commandsToString } from '../../utils/pathParserUtils';
import { useColorModeValue } from '@chakra-ui/react';

interface ClipItemCardProps {
    clip: ClipDefinition;
    isSelected?: boolean;
    onClick?: () => void;
}

const normalizeClipContent = (raw: string, id: string): string => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('<clipPath')) {
        return `<clipPath id="${id}">${trimmed}</clipPath>`;
    }

    // Replace or add id on existing clipPath
    if (trimmed.match(/\sid\s*=\s*["'][^"']+["']/)) {
        return trimmed.replace(/\sid\s*=\s*["'][^"']+["']/, ` id="${id}"`);
    }
    return trimmed.replace('<clipPath', `<clipPath id="${id}"`);
};

export const ClipItemCard: React.FC<ClipItemCardProps> = ({
    clip,
    isSelected,
    onClick
}) => {
    // Align with marker/symbol preview contrast: light subtle grays, dark fixed tone
    const checkerLight = useColorModeValue('#f8f9fa', '#3c4247');
    const checkerDark = useColorModeValue('#cbd5e1', '#3c4247');

    const preview = useMemo(() => {
        const viewWidth = clip.bounds?.width || 100;
        const viewHeight = clip.bounds?.height || 100;
        const clipId = `clip-preview-${clip.id}`;
        const checkerId = `${clipId}-checker`;

        let clipContent: string;
        if (clip.rawContent?.trim()) {
            clipContent = normalizeClipContent(clip.rawContent, clipId);
        } else {
            const d = commandsToString(clip.pathData.subPaths.flat());
            clipContent = `<clipPath id="${clipId}" clipPathUnits="${clip.clipPathUnits ?? 'userSpaceOnUse'}"><path d="${d}" /></clipPath>`;
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}">
  <defs>
    <pattern id="${checkerId}" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="${checkerLight}" />
      <rect width="4" height="4" fill="${checkerDark}" />
      <rect x="4" y="4" width="4" height="4" fill="${checkerDark}" />
    </pattern>
    ${clipContent}
  </defs>
  <rect width="${viewWidth}" height="${viewHeight}" fill="url(#${checkerId})" />
  <rect width="${viewWidth}" height="${viewHeight}" fill="currentColor" clip-path="url(#${clipId})" />
</svg>`;

        return svg;
    }, [clip, checkerDark, checkerLight]);

    return (
        <LibraryItemCard
            name={clip.name}
            isSelected={isSelected}
            onClick={onClick}
            preview={
                <div
                    style={{ width: '100%', height: '100%' }}
                    dangerouslySetInnerHTML={{ __html: preview }}
                />
            }
        />
    );
};
