import React from 'react';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type IconLibrary = 'ionicons' | 'material' | 'fontawesome';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  library?: IconLibrary;
}

// Common icon mappings for the app
export const AppIcons = {
  // Navigation
  home: { library: 'ionicons' as const, name: 'home' },
  homeOutline: { library: 'ionicons' as const, name: 'home-outline' },
  transactions: { library: 'ionicons' as const, name: 'swap-horizontal' },
  transactionsOutline: { library: 'ionicons' as const, name: 'swap-horizontal-outline' },
  insights: { library: 'ionicons' as const, name: 'stats-chart' },
  insightsOutline: { library: 'ionicons' as const, name: 'stats-chart-outline' },
  settings: { library: 'ionicons' as const, name: 'settings' },
  settingsOutline: { library: 'ionicons' as const, name: 'settings-outline' },

  // Transaction types
  income: { library: 'ionicons' as const, name: 'arrow-down-circle' },
  expense: { library: 'ionicons' as const, name: 'arrow-up-circle' },
  transfer: { library: 'ionicons' as const, name: 'swap-horizontal-circle' },

  // Sources
  mpesa: { library: 'ionicons' as const, name: 'phone-portrait' },
  bank: { library: 'ionicons' as const, name: 'business' },
  card: { library: 'ionicons' as const, name: 'card' },
  cash: { library: 'ionicons' as const, name: 'cash' },

  // Debt
  debt: { library: 'ionicons' as const, name: 'alert-circle' },
  debtOwed: { library: 'material' as const, name: 'account-arrow-right' },
  debtBorrowed: { library: 'material' as const, name: 'account-arrow-left' },
  fuliza: { library: 'ionicons' as const, name: 'flash' },
  loan: { library: 'ionicons' as const, name: 'document-text' },

  // Categories
  salary: { library: 'ionicons' as const, name: 'briefcase' },
  food: { library: 'ionicons' as const, name: 'restaurant' },
  transport: { library: 'ionicons' as const, name: 'car' },
  shopping: { library: 'ionicons' as const, name: 'bag-handle' },
  entertainment: { library: 'ionicons' as const, name: 'game-controller' },
  bills: { library: 'ionicons' as const, name: 'receipt' },
  health: { library: 'ionicons' as const, name: 'medkit' },
  education: { library: 'ionicons' as const, name: 'school' },
  groceries: { library: 'ionicons' as const, name: 'cart' },
  utilities: { library: 'ionicons' as const, name: 'flash' },
  rent: { library: 'ionicons' as const, name: 'home' },
  airtime: { library: 'ionicons' as const, name: 'phone-portrait' },
  data: { library: 'ionicons' as const, name: 'wifi' },
  gift: { library: 'ionicons' as const, name: 'gift' },
  investment: { library: 'ionicons' as const, name: 'trending-up' },
  savings: { library: 'ionicons' as const, name: 'wallet' },
  other: { library: 'ionicons' as const, name: 'ellipsis-horizontal-circle' },

  // Actions
  add: { library: 'ionicons' as const, name: 'add-circle' },
  addOutline: { library: 'ionicons' as const, name: 'add-circle-outline' },
  edit: { library: 'ionicons' as const, name: 'create' },
  delete: { library: 'ionicons' as const, name: 'trash' },
  check: { library: 'ionicons' as const, name: 'checkmark-circle' },
  close: { library: 'ionicons' as const, name: 'close-circle' },
  chevronRight: { library: 'ionicons' as const, name: 'chevron-forward' },
  chevronDown: { library: 'ionicons' as const, name: 'chevron-down' },
  back: { library: 'ionicons' as const, name: 'arrow-back' },

  // Features
  sms: { library: 'ionicons' as const, name: 'chatbubble-ellipses' },
  notification: { library: 'ionicons' as const, name: 'notifications' },
  notificationOutline: { library: 'ionicons' as const, name: 'notifications-outline' },
  privacy: { library: 'ionicons' as const, name: 'lock-closed' },
  category: { library: 'ionicons' as const, name: 'folder' },
  calendar: { library: 'ionicons' as const, name: 'calendar' },
  clock: { library: 'ionicons' as const, name: 'time' },
  person: { library: 'ionicons' as const, name: 'person' },
  people: { library: 'ionicons' as const, name: 'people' },
  export: { library: 'ionicons' as const, name: 'download' },
  import: { library: 'ionicons' as const, name: 'cloud-download' },
  search: { library: 'ionicons' as const, name: 'search' },
  filter: { library: 'ionicons' as const, name: 'filter' },
  info: { library: 'ionicons' as const, name: 'information-circle' },
  warning: { library: 'ionicons' as const, name: 'warning' },
  help: { library: 'ionicons' as const, name: 'help-circle' },
};

export function Icon({ name, size = 24, color, library = 'ionicons' }: IconProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const iconColor = color || colors.text;

  switch (library) {
    case 'material':
      return (
        <MaterialCommunityIcons
          name={name as keyof typeof MaterialCommunityIcons.glyphMap}
          size={size}
          color={iconColor}
        />
      );
    case 'fontawesome':
      return (
        <FontAwesome5
          name={name as keyof typeof FontAwesome5.glyphMap}
          size={size}
          color={iconColor}
        />
      );
    case 'ionicons':
    default:
      return (
        <Ionicons
          name={name as keyof typeof Ionicons.glyphMap}
          size={size}
          color={iconColor}
        />
      );
  }
}

// Helper component for app-specific icons
export function AppIcon({
  icon,
  size = 24,
  color,
}: {
  icon: keyof typeof AppIcons;
  size?: number;
  color?: string;
}) {
  const iconConfig = AppIcons[icon];
  return <Icon name={iconConfig.name} library={iconConfig.library} size={size} color={color} />;
}
