import { createAuthStyles } from '../../src/components/shared/authStyles';
import type { ThemeColors } from '../../src/contexts/ThemeContext';

const colors = {
  background: '#101010',
  foreground: '#fafafa',
  mutedForeground: '#999999',
  border: '#333333',
} as ThemeColors;

describe('createAuthStyles', () => {
  it('derives themed values from the palette', () => {
    const styles = createAuthStyles(colors);

    expect(styles.container.backgroundColor).toBe(colors.background);
    expect(styles.logoText.color).toBe(colors.foreground);
    expect(styles.separatorLine.backgroundColor).toBe(colors.border);
  });

  it('recomputes when the theme changes', () => {
    const light = createAuthStyles({ ...colors, background: '#ffffff' });
    const dark = createAuthStyles(colors);

    expect(light.container.backgroundColor).not.toBe(dark.container.backgroundColor);
  });
});
