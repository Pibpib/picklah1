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
    main: '#FCBF49',
    tint: '#F77F00',
    mainlight: '#FEDFA4',
    accent:'#f8d99d',

    border:'#E7E7E7',
    borderbold:'#8D8D8D',
    bordertint:'#fbc684',
    filterDefault: '#EFEFEF',
    
  },
  dark: {
text: '#F8F8F8',           
    background: '#20232A',
    main: '#FCBF49',           
    tint: '#F77F00',   
    mainlight: '#FFDFA4', 
    accent: '#FFDFA4',
    border: '#3A3A3A', 
    borderbold: '#5C5C5C',  
    bordertint: '#FCBF49', 
    filterDefault: '#2E2E36',   
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
