# Paperwork — Mobile App (React Native)

**Receipt-scanning companion for Paperwork — Dutch bookkeeping for small businesses and the self-employed.** Snap a receipt, and OCR extracts the date, total and BTW (VAT) automatically.

[paper-work.nl](https://paper-work.nl)

**Built with:** React 19 · TypeScript · Expo (managed workflow + prebuild) · React Native · expo-router

> **Note:** This is a React Native port of the original [paperwork-app](https://github.com/HenryCordes/paperwork-app) (Ionic + Capacitor). I'm currently porting the app to React Native because I got enthusiastic about the framework. The port is in progress — see the [specs](specs) folder for migration plans and phase documentation.

<!-- Add 1–2 screenshots or a short screen recording here — for a mobile app, visuals matter even more than for web. Don't show real customer data. -->

## Overview

This mobile application is part of the [Paper-work](https://paper-work.nl/) ecosystem, a complete bookkeeping solution for small businesses and self-employed professionals in the Netherlands. The app specializes in scanning receipts and automatically extracting critical information such as dates, total amounts, and tax values.

### Key Features

- **Receipt Scanning**: Quickly capture receipts using your device's camera
- **Automatic Information Extraction**: Advanced OCR technology identifies and extracts:
  - Date of transaction
  - Total amount
  - BTW (VAT) amounts (both 9% and 21% rates)
- **Data Synchronization**: All captured receipts and their information are stored in the Paper-work database via the API
- **Support for Dutch Receipts**: Optimized for various Dutch receipt formats from different establishments
- **Biometric Authentication**: Secure login using facial recognition or fingerprint scanning (based on device capabilities)

## How it Fits in the Paper-work Ecosystem

Paper-work helps small businesses with:

- Creating professional invoices
- Managing tax obligations and preparing tax returns
- Tracking business expenses with this receipt scanning app
- Saving valuable time on administrative tasks

As Paper-work states: "Steek de kostbare tijd die je hebt in datgene waar je goed in bent" (Invest your valuable time in what you're good at).

## Installation

```bash
npm install
```

## Running the Application

```bash
# Start development server
npx expo start

# iOS (requires development build)
npx expo run:ios

# Android (requires development build)
npx expo run:android
```

See the [Expo documentation](https://docs.expo.dev/develop/development-builds/introduction/) for setting up development builds.

## Biometric Authentication Flow

The app features a comprehensive biometric authentication system:

- **Opt-in Process**: After first login with username/password, users are prompted to enable biometric authentication
- **Available Biometrics**: Automatically detects and offers the appropriate biometric method (Face ID or fingerprint) based on device capabilities
- **Secure Credential Storage**: Credentials are securely stored and only accessible through biometric verification
- **Login Scenarios**:
  - **App Startup**: Biometric authentication triggers automatically when app starts if enabled
  - **After Logout**: Biometric login is available via a manual button but never triggers automatically after logout
  - **After Session Timeout**: Authentication is required after app has been inactive for a set period
  - **App Resume**: Authentication is required when returning to the app after it's been in the background
- **Security Measures**:
  - Biometric credentials are cleared when biometrics are disabled
  - Session timeout ensures security during periods of inactivity
  - Manual login is always available as a fallback

## Technology Stack

- Expo (managed workflow with prebuild/dev client) for React Native development
- expo-router for file-based routing (Drawer + nested Tabs)
- React Native for cross-platform mobile development
- expo-secure-store for secure credential storage
- expo-local-authentication for biometric authentication
- TanStack Query 5 for data fetching and caching
- TypeScript for type safety

## Future Developments

In upcoming versions, the app will provide users with more insights into their finances, mirroring the comprehensive analytics available in the web application. This includes expense categorization, trend analysis, and business performance metrics.

## About Paper-work

Paper-work is a Dutch bookkeeping solution designed specifically for small businesses and self-employed professionals. It provides user-friendly interfaces for managing finances, creating professional invoices with proper branding, and simplifying tax reporting requirements.

For more information, visit [paper-work.nl](https://paper-work.nl/).

## Development Guidelines

### Setup Requirements

- Node.js (v18+)
- npm (v9+)
- iOS development requires a Mac with Xcode 15+
- Android development requires Android Studio with SDK 34+
- Expo development build setup (see [Expo docs](https://docs.expo.dev/develop/development-builds/introduction/))

### Development Best Practices

#### Architecture

- Follow the architecture documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Use the service + hook pattern for API integrations (see [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md))
- File-based routing with expo-router: screens live in `app/` directory
- TypeScript strict mode enabled — declare types for all variables, parameters, and return values

#### Biometric Authentication

- The app uses `expo-local-authentication` for biometric authentication
- Biometric authentication is opt-in and presented to users after their first successful login
- A loosely coupled architecture (service + hook) allows for easy replacement of the biometric plugin if needed
- Credentials are securely stored in `expo-secure-store`
- Users can fallback to password authentication if biometrics fail or are unavailable

#### Receipt Processing

- When modifying the receipt extraction logic, ensure you test with various receipt formats
- Support for multiple Dutch receipt layouts is essential (currently supported: McDonald's, Kwalitaria, Het Brummens Friethuis, Expert)
- The extraction algorithm should prioritize:
  - Date detection (both ISO and European DD-MM-YYYY formats)
  - Total amount detection (keywords: "totaal", "total", etc.)
  - Tax amount detection (9% and 21% BTW values)

#### UI Development

- Follow the styling conventions in [docs/FRONTEND.md](docs/FRONTEND.md)
- Use RN `StyleSheet` + theme tokens from `src/constants/theme.ts`
- Design for both iOS and Android with platform-specific adjustments
- Keep the interface simple and task-focused
- User-facing language is Dutch
- Show money in Dutch format (two decimals, comma decimal separator, period thousands separator)

#### Native Functionality

- See [docs/NATIVE.md](docs/NATIVE.md) for camera, scanner, OCR, secure storage, biometric, push, and badge integration patterns
- Always request the minimum native permissions and degrade gracefully
- No secrets in client code

### Testing

- Unit tests with Jest (`jest-expo` preset) + React Native Testing Library
- Test OCR functionality with real receipt images
- Verify extraction accuracy across different receipt formats
- Test on both iOS and Android devices (not just simulators/emulators)
- Test biometric authentication on physical devices with biometric capabilities (Face ID, Touch ID, fingerprint scanners)
- E2E tests with Detox or Maestro (to be added in testing phase)

### Deployment

- Use EAS Build for production builds
- Update version numbers in `app.json` before building production versions
- iOS builds can be distributed via TestFlight or App Store
- Android builds can be distributed via Google Play or internal testing channels

### Migration Documentation

The port from Ionic/Capacitor to React Native is documented in the [specs](specs) folder:

- Phase 0: Bootstrap (current phase)
- Subsequent phases will be added as the port progresses
- See the original [paperwork-app](https://github.com/HenryCordes/paperwork-app) for the reference implementation
