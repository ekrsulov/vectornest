export type ThemeColorMode = 'light' | 'dark';

export const isMonoColor = (color?: string | null): color is string => {
  return color === '#000000' || color === '#ffffff';
};

export const transformMonoColor = (color: string, _targetMode: ThemeColorMode): string => {
  if (!isMonoColor(color)) return color;

  // Mono colors always swap: black↔white during any color mode transition
  return color === '#000000' ? '#ffffff' : '#000000';
};

export const detectThemeColorMode = (): ThemeColorMode => {
  if (typeof document === 'undefined') return 'light';

  const attrTheme = document.documentElement.getAttribute('data-theme');
  if (attrTheme === 'dark') return 'dark';
  if (attrTheme === 'light') return 'light';

  const stored = (() => {
    try {
      return localStorage.getItem('chakra-ui-color-mode');
    } catch {
      return null;
    }
  })();

  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return 'light';
};
