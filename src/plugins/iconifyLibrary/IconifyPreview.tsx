import React, { useEffect, useMemo, useState } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import { sanitizeSvgContent } from '../../utils/sanitizeSvgContent';
import { logger } from '../../utils/logger';
import { buildIconSvgUrl, prepareIconifySvgForPreview } from './iconifyApi';

interface IconifyPreviewProps {
  prefix: string;
  iconName: string;
  label: string;
  size: number;
}

const previewSvgCache = new Map<string, string>();

export const IconifyPreview: React.FC<IconifyPreviewProps> = ({
  prefix,
  iconName,
  label,
  size,
}) => {
  const { colorMode } = useColorMode();
  const iconId = `${prefix}:${iconName}`;
  const [rawSvg, setRawSvg] = useState<string | null>(() => previewSvgCache.get(iconId) ?? null);

  useEffect(() => {
    const cachedSvg = previewSvgCache.get(iconId);
    if (cachedSvg) {
      setRawSvg(cachedSvg);
      return;
    }

    const controller = new AbortController();

    const loadPreviewSvg = async () => {
      try {
        const response = await fetch(buildIconSvgUrl(prefix, iconName), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Icon preview request failed with ${response.status}`);
        }

        const svg = sanitizeSvgContent(await response.text(), { allowExternalUrls: false });
        previewSvgCache.set(iconId, svg);
        if (!controller.signal.aborted) {
          setRawSvg(svg);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Failed to load Iconify preview SVG', error, { iconId });
        setRawSvg('');
      }
    };

    void loadPreviewSvg();

    return () => controller.abort();
  }, [iconId, iconName, prefix]);

  const previewSvg = useMemo(() => {
    if (!rawSvg) {
      return null;
    }

    return prepareIconifySvgForPreview(rawSvg, { colorMode });
  }, [colorMode, rawSvg]);

  return (
    <Box
      role="img"
      aria-label={label}
      width={`${size}px`}
      height={`${size}px`}
      color={colorMode === 'dark' ? 'white' : 'black'}
      sx={{
        '& > svg': {
          width: '100%',
          height: '100%',
          display: 'block',
        },
      }}
      dangerouslySetInnerHTML={previewSvg ? { __html: previewSvg } : undefined}
    />
  );
};
