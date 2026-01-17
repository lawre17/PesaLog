/**
 * PesaLog Theme Configuration
 * Primary: Cyan | Secondary: Teal
 */

import { Platform } from 'react-native';

// Primary brand colors - Cyan & Teal
const primary = {
  cyan: '#00BCD4',
  cyanLight: '#4DD0E1',
  cyanDark: '#0097A7',
  teal: '#009688',
  tealLight: '#4DB6AC',
  tealDark: '#00796B',
};

// Financial status colors
const finance = {
  income: '#34C759', // Green - money in
  expense: '#FF3B30', // Red - money out
  debt: '#FF6961', // Soft red - outstanding debt
  transfer: '#5AC8FA', // Blue - neutral transfers
  pending: '#FF9500', // Orange - needs attention
  balance: '#007AFF', // Blue - balance display
};

// Semantic colors
const semantic = {
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
};

export const Colors = {
  light: {
    // Base colors
    text: '#11181C',
    textSecondary: '#687076',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    card: '#FFFFFF',
    border: '#E5E5E5',

    // Brand
    tint: primary.cyan,
    primary: primary.cyan,
    primaryLight: primary.cyanLight,
    secondary: primary.teal,
    secondaryLight: primary.tealLight,

    // Navigation
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primary.cyan,

    // Financial
    income: finance.income,
    expense: finance.expense,
    debt: finance.debt,
    transfer: finance.transfer,
    pending: finance.pending,
    balance: finance.balance,

    // Semantic
    success: semantic.success,
    warning: semantic.warning,
    error: semantic.error,
    info: semantic.info,
  },
  dark: {
    // Base colors
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    backgroundSecondary: '#1C1E1F',
    card: '#1C1E1F',
    border: '#2C2F30',

    // Brand
    tint: primary.cyanLight,
    primary: primary.cyanLight,
    primaryLight: primary.cyan,
    secondary: primary.tealLight,
    secondaryLight: primary.teal,

    // Navigation
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primary.cyanLight,

    // Financial
    income: '#32D74B', // Brighter green for dark mode
    expense: '#FF453A', // Brighter red for dark mode
    debt: '#FF6961',
    transfer: '#64D2FF',
    pending: '#FFD60A',
    balance: '#64D2FF',

    // Semantic
    success: '#32D74B',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#64D2FF',
  },

  // Static colors (same in both modes)
  primary,
  finance,
  semantic,

  // Category colors
  category: {
    salary: '#34C759',
    business: '#30D158',
    freelance: '#32D74B',
    food: '#FF9500',
    transport: '#5856D6',
    utilities: '#FFCC00',
    entertainment: '#FF2D55',
    shopping: '#AF52DE',
    healthcare: '#FF3B30',
    education: '#007AFF',
    subscriptions: '#5AC8FA',
    bills: '#8E8E93',
    airtime: '#00BCD4',
    rent: '#795548',
    transfer: '#64D2FF',
    family: '#BF5AF2',
    lending: '#FFD60A',
    loan: '#FF453A',
    fuliza: '#FF6961',
    other: '#636366',
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
