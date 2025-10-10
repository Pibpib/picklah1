/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#F77F00';
const tintColorDark = '#F77F00';

export const Colors = {
  light: {
    text: '#003049',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconSelected: '#FEDFA4',
    accent:'#f8d99d',

    borderlight:'#E7E7E7',
    borderbold:'#8D8D8D',
    borderaccent:'#fbc684',
    filterDefault: '#EFEFEF',
    filterSelected: '#FCBF49',
  },
  dark: {
    text: '#EAE2B7',
    background: '#003049',
    tint: tintColorDark,
    icon: '#EAE2B7',
    tabIconDefault: '#EAE2B7',
    tabIconSelected: tintColorDark,

    filterDefault: '#fcbf49',
    filterSelected: '#F77F00',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
