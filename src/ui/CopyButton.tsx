import React, { useState, useRef, useEffect } from 'react';
import { PanelStyledButton } from './PanelStyledButton';

type CopyButtonProps = {
  text: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  label?: string;
  copiedLabel?: string;
};

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  size = 'sm',
  isDisabled = false,
  label = 'Copy',
  copiedLabel = 'Copied',
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (isDisabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore copy failures
    }
  };

  return (
    <PanelStyledButton size={size} onClick={handleCopy} isDisabled={isDisabled}>
      {copied ? copiedLabel : label}
    </PanelStyledButton>
  );
};
