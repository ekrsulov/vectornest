import React from 'react';
import { Input } from '@chakra-ui/react';
import { Minus } from 'lucide-react';
import { ToggleButton } from './ToggleButton';
import { DASH_PRESETS } from '../utils/dashPresets';
import type { DashPreset } from '../utils/dashPresets';
import { useThemeColors } from '../hooks';

const PRESET_CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  width: 'auto',
  flexWrap: 'nowrap',
  alignItems: 'center',
};

const DASH_PREVIEW_SVG_STYLE: React.CSSProperties = { overflow: 'visible' };

interface DashArrayCustomInputProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export const DashArrayCustomInput: React.FC<DashArrayCustomInputProps> = ({
  value,
  onChange,
  title = "Custom dash array"
}) => {
  const { input: { bg, borderColor, textColor, placeholderColor } } = useThemeColors();

  return (
    <Input
      type="text"
      value={value === 'none' ? '' : value}
      onChange={(e) => onChange(e.target.value || 'none')}
      size="xs"
      fontSize="11px"
      minWidth="90px"
      h="20px"
      bg={bg}
      borderColor={borderColor}
      borderRadius="0"
      color={textColor}
      _placeholder={{ color: placeholderColor }}
      _focus={{
        borderColor: 'gray.600',
        boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
      }}
      title={title}
    />
  );
};

interface DashArrayPresetsProps {
  value: string;
  onChange: (value: string) => void;
}

export const DashArrayPresets: React.FC<DashArrayPresetsProps> = ({
  value,
  onChange
}) => {
  // Quick-access presets
  const presetMap = React.useMemo(
    () => new Map(DASH_PRESETS.map((preset) => [preset.id, preset] as const)),
    []
  );
  const commonPresetIds: Array<DashPreset['id']> = ['dashed', 'dash-wide-gap', 'solid'];
  const commonPresets = commonPresetIds
    .map((id) => presetMap.get(id))
    .filter((preset): preset is DashPreset => Boolean(preset));

  return (
    <div style={PRESET_CONTAINER_STYLE}>
      {commonPresets.map(preset => (
        <ToggleButton
          key={preset.id}
          isActive={value === preset.dashArray}
          onClick={() => onChange(preset.dashArray)}
          aria-label={`${preset.name}: ${preset.description}`}
          variant="icon"
          icon={<DashPreview dashArray={preset.dashArray} />}
          sx={{ borderRadius: 'full' }}
        />
      ))}
    </div>
  );
};

// Simple dash preview component
const DashPreview: React.FC<{ dashArray: string }> = ({ dashArray }) => {
  if (dashArray === 'none') {
    return <Minus size={12} />;
  }

  return (
    <svg width="16" height="2" style={DASH_PREVIEW_SVG_STYLE}>
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray={dashArray}
      />
    </svg>
  );
};
