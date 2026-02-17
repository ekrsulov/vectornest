import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Textarea, Text, useColorModeValue } from '@chakra-ui/react';
import { LibrarySectionHeader } from './LibrarySectionHeader';

/**
 * Small copy button with feedback for copying SVG content
 */
const CopyButton: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonBg = useColorModeValue('gray.100', 'gray.700');
  const buttonHoverBg = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.600', 'green.400');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [content]);

  return (
    <Text
      as="button"
      onClick={handleCopy}
      fontSize="9px"
      fontWeight="medium"
      color={copied ? successColor : textColor}
      bg={buttonBg}
      px={1.5}
      py={0.5}
      borderRadius="sm"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ bg: buttonHoverBg }}
      userSelect="none"
    >
      {copied ? 'Copied!' : 'Copy'}
    </Text>
  );
};

interface SvgPreviewProps {
  /** SVG content as a string */
  content: string;
  /** Title for the section header */
  title?: string;
  /** Height of the preview box */
  height?: string;
  /** Whether to show syntax as editable */
  editable?: boolean;
  /** Callback when content changes (only if editable) */
  onChange?: (content: string) => void;
  /** Show/hide the visual preview */
  showVisualPreview?: boolean;
  /** Show/hide the copy button (default: true) */
  showCopyButton?: boolean;
}

/**
 * Component to preview and optionally edit SVG content.
 * Displays both a visual preview and the raw SVG code.
 */
export const SvgPreview: React.FC<SvgPreviewProps> = ({
  content,
  title = 'SVG Code',
  height = '80px',
  editable = false,
  onChange,
  showVisualPreview = true,
  showCopyButton = true,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.100', 'gray.900');
  const codeColor = useColorModeValue('gray.700', 'gray.300');

  // Sanitize and prepare SVG for preview
  const previewSvg = useMemo(() => {
    if (!content) return null;
    
    // Wrap content in SVG if it's not already wrapped
    let svgContent = content.trim();
    if (!svgContent.startsWith('<svg')) {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">${svgContent}</svg>`;
    }
    
    // Sanitize: strip <script> tags and on* event attributes
    svgContent = svgContent.replace(/<script[\s\S]*?<\/script>/gi, '');
    svgContent = svgContent.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    return svgContent;
  }, [content]);

  // Format content for display (basic indentation)
  const formattedContent = useMemo(() => {
    if (!content) return '';
    return content
      .replace(/></g, '>\n<')
      .replace(/\s+/g, ' ')
      .trim();
  }, [content]);

  return (
    <Box>
      <LibrarySectionHeader 
        title={title} 
        compact 
        action={showCopyButton && content ? <CopyButton content={content} /> : undefined}
      />
      
      {/* Visual Preview */}
      {showVisualPreview && previewSvg && (
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="sm"
          p={2}
          mb={1}
          height={height}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
          sx={{
            '& svg': {
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
            },
          }}
        />
      )}

      {/* Code View / Editor */}
      {editable ? (
        <Textarea
          value={formattedContent}
          onChange={(e) => onChange?.(e.target.value)}
          bg={codeBg}
          color={codeColor}
          fontSize="10px"
          fontFamily="mono"
          borderRadius="sm"
          minH="60px"
          maxH="120px"
          resize="vertical"
          p={2}
          placeholder="<path d='...' />"
        />
      ) : (
        <Box
          bg={codeBg}
          color={codeColor}
          fontSize="9px"
          fontFamily="mono"
          borderRadius="sm"
          p={1.5}
          maxH="60px"
          overflowY="auto"
          whiteSpace="pre-wrap"
          wordBreak="break-all"
          lineHeight="1.3"
        >
          {formattedContent || '<empty>'}
        </Box>
      )}
    </Box>
  );
};

interface SvgEditorProps {
  /** Current SVG content */
  content: string;
  /** Callback when content changes */
  onChange: (content: string) => void;
  /** Title for the section */
  title?: string;
  /** Height of the preview box */
  height?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the visual preview (default: true) */
  showPreview?: boolean;
  /** Show/hide the copy button (default: true) */
  showCopyButton?: boolean;
}

/**
 * Simple SVG content editor with live preview.
 */
export const SvgEditor: React.FC<SvgEditorProps> = ({
  content,
  onChange,
  title = 'SVG Code',
  height = '60px',
  placeholder = '<path d="M0 0 L10 10" />',
  showPreview = true,
  showCopyButton = true,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('white', 'gray.900');

  // Prepare preview with wrapper SVG (sanitized)
  const previewSvg = useMemo(() => {
    if (!content) return null;
    let svgContent = content.trim();
    if (!svgContent.startsWith('<svg')) {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">${svgContent}</svg>`;
    }
    // Sanitize: strip <script> tags and on* event attributes
    svgContent = svgContent.replace(/<script[\s\S]*?<\/script>/gi, '');
    svgContent = svgContent.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    return svgContent;
  }, [content]);

  return (
    <Box>
      <LibrarySectionHeader 
        title={title} 
        compact 
        action={showCopyButton && content ? <CopyButton content={content} /> : undefined}
      />
      
      {/* Live Preview */}
      {showPreview && previewSvg && (
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="sm"
          p={2}
          mb={1}
          height={height}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
          sx={{
            '& svg': {
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
            },
          }}
        />
      )}

      {/* Editor */}
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        bg={codeBg}
        fontSize="10px"
        fontFamily="mono"
        borderRadius="sm"
        minH="50px"
        maxH="100px"
        resize="vertical"
        p={1.5}
        placeholder={placeholder}
        spellCheck={false}
      />
    </Box>
  );
};
