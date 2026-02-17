import { JoinedButtonGroup } from './JoinedButtonGroup';

interface FillRuleSelectorProps {
  value: 'nonzero' | 'evenodd';
  onChange: (value: 'nonzero' | 'evenodd') => void;
  title?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const FillRuleSelector: React.FC<FillRuleSelectorProps> = ({
  value,
  onChange,
  title = "Fill Rule",
  size,
  fullWidth
}) => {
  const fillRuleOptions: Array<{
    value: 'nonzero' | 'evenodd';
    label: string;
    description: string;
  }> = [
      { value: 'evenodd', label: 'Even-Odd', description: 'Even-Odd Rule' },
      { value: 'nonzero', label: 'Non-Zero', description: 'Non-Zero Winding Rule' }
    ];

  return (
    <JoinedButtonGroup
      options={fillRuleOptions}
      value={value}
      onChange={onChange}
      title={title}
      size={size}
      fullWidth={fullWidth}
    />
  );
};
