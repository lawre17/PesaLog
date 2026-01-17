# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PesaLog is a personal finance Android app built with Expo/React Native that tracks income, expenses, and debts by parsing financial SMS messages (M-Pesa, banks, card transactions). Data is stored locally in SQLite.

## Commands

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server (alias: npx expo start)
npm run android      # Start on Android emulator/device
npm run ios          # Start on iOS simulator
npm run web          # Start web version
npm run lint         # Run ESLint (expo lint)
npm run reset-project # Move starter code to app-example, create blank app
```

## Architecture

**Expo Router file-based routing** - Routes defined in `app/` directory:
- `app/_layout.tsx` - Root layout with ThemeProvider and Stack navigator
- `app/(tabs)/` - Tab-based navigation group
- `app/modal.tsx` - Modal screen

**Path alias**: `@/*` maps to project root (configured in tsconfig.json)

**Theme system**: `constants/theme.ts` exports `Colors` (light/dark) and `Fonts` (platform-specific)

**Hooks**: Platform-specific color scheme hooks in `hooks/` with `.web.ts` suffix pattern for web overrides

**Components**: Reusable UI in `components/` with platform-specific variants using `.ios.tsx` suffix

## Tech Stack

- Expo SDK 54 with New Architecture enabled
- React 19.1, React Native 0.81
- TypeScript with strict mode
- expo-router v6 with typed routes
- React Navigation 7 (bottom tabs)
- react-native-reanimated for animations
