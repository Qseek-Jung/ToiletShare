# iOS Build & Release Checklist (for Mac)

This guide helps you build and release **대똥단결 v1.0.6 (Build 55)** on your Mac.

## 1. System Setup (First Time Only)
- [ ] **Homebrew**: `bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- [ ] **Node.js**: `brew install node`
- [ ] **CocoaPods**: `sudo gem install cocoapods` or `brew install cocoapods`

## 2. Project Preparation
- [ ] **Copy Code**: Transfer the entire project folder to your Mac (including `ios/`, `android/`, `src/`, etc.).
- [ ] **Install Deps**: Run `npm install` in the project root.
- [ ] **Build Web**: Run `npm run build`.
- [ ] **Sync iOS**: Run `npx cap sync ios`.

## 3. iOS Native Setup
- [ ] **Install Pods**: 
  ```bash
  cd ios/App
  pod install
  cd ../..
  ```
- [ ] **Open Xcode**: `npx cap open ios` (This opens `App.xcworkspace`).

## 4. Xcode Configuration
- [ ] **Signing & Capabilities**:
  - Select 'App' target -> 'Signing & Capabilities'.
  - [ ] **Team**: Select your Apple Developer account.
  - [ ] **Bundle ID**: Ensure it is `com.toilet.korea`.
  - [ ] **Capabilities**: Ensure 'Push Notifications', 'Background Modes (Remote notifications)' are added.
- [ ] **Info.plist Verification**:
  - [ ] Version: `1.0.6`
  - [ ] Build: `55`
- [ ] **GoogleService-Info.plist**:
  - Ensure it is correctly added to the 'App' group in Xcode.

## 5. Build and Archive
- [ ] **Hardware**: Connect your iPhone or select 'Any iOS Device (arm64)'.
- [ ] **Archive**: Product -> Archive.
- [ ] **Distribute**: Follow the wizard to upload to 'TestFlight' or 'App Store Connect'.

## Troubleshooting
- **Error: SDK not found**: Run `xcode-select --install`.
- **Pod Error**: If `pod install` fails, try `arch -x86_64 pod install` (on M1/M2 Macs).
- **Firebase/Google Auth Error**: Double check `GoogleService-Info.plist` and URL Schemes in Xcode.
