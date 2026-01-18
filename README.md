# PesaLog

<p align="center">
  <img src="assets/images/icon.png" alt="PesaLog Logo" width="120" height="120">
</p>

<p align="center">
  <strong>Personal Finance Tracker for Mobile Money Users</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#contributing">Contributing</a>
</p>

---

PesaLog is an open-source Android app that automatically tracks your income, expenses, and debts by parsing financial SMS messages from M-Pesa, banks, and card transactions. All data is stored locally on your device using SQLite — your financial data never leaves your phone.

## Features

- **Automatic SMS Parsing** — Reads and parses M-Pesa, bank, and card transaction messages
- **Transaction Categorization** — Smart auto-classification with learning capabilities
- **Expense Tracking** — Monitor your spending patterns over time
- **Income Tracking** — Keep track of money received
- **Debt Management** — Track money you owe and money owed to you
- **Merchant Recognition** — Identifies and remembers merchants from your transactions
- **Background Sync** — Automatically captures new transactions in the background
- **Local-First** — All data stored securely on your device with SQLite
- **Dark Mode** — Supports light and dark themes

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Expo SDK 54](https://expo.dev) | React Native framework with New Architecture |
| [React Native 0.81](https://reactnative.dev) | Cross-platform mobile development |
| [React 19](https://react.dev) | UI library |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Expo Router v6](https://docs.expo.dev/router/introduction/) | File-based routing with typed routes |
| [Drizzle ORM](https://orm.drizzle.team) | TypeScript ORM for SQLite |
| [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Local SQLite database |
| [React Navigation 7](https://reactnavigation.org) | Navigation library |
| [Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Animations |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher)
- [npm](https://www.npmjs.com) or [yarn](https://yarnpkg.com)
- [Android Studio](https://developer.android.com/studio) (for Android development)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lawlens11/PesaLog.git
   cd PesaLog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on Android**
   ```bash
   npm run android
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run web` | Start web version |
| `npm run lint` | Run ESLint |

## Project Structure

```
PesaLog/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab-based navigation
│   ├── categories/        # Category management
│   ├── debts/             # Debt tracking
│   ├── import/            # SMS import flow
│   ├── merchants/         # Merchant management
│   ├── onboarding/        # First-time setup
│   ├── transaction/       # Transaction details
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── constants/             # Theme, colors, fonts
├── contexts/              # React contexts
├── db/                    # Database schema & migrations
│   ├── schema.ts          # Drizzle ORM schema
│   ├── migrations/        # Database migrations
│   └── seed/              # Seed data
├── hooks/                 # Custom React hooks
├── services/              # Business logic
│   ├── sms/              # SMS parsing & processing
│   ├── debt.service.ts   # Debt management
│   ├── notification.service.ts
│   └── ...
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── plugins/               # Expo config plugins
```

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Device/OS information

### Suggesting Features

Have an idea? Open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Use TypeScript for all new code
- Add types for all function parameters and return values
- Keep components small and focused
- Use meaningful commit messages

## Permissions

PesaLog requires the following Android permissions:
- **READ_SMS** — To read financial transaction messages
- **RECEIVE_SMS** — To capture new transactions in real-time

All SMS data is processed locally and never sent to any server.

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

**Lawrence Njoroge**

- GitHub: [@lawlens11](https://github.com/lawlens11)
- X: [@lawlens11](https://x.com/lawlens11)

---

<p align="center">
  Made with ❤️ in Kenya
</p>
