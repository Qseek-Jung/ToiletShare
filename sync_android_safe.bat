@echo off
echo [Android Build Isolation] Starting Safe Build Process...

REM 1. Backup existing config
echo [1/4] Backing up current capacitor.config.ts...
copy capacitor.config.ts capacitor.config.ts.bak

REM 2. Apply Android-specific config
echo [2/4] Applying Android-exclusive configuration...
copy /Y capacitor.config.android.ts capacitor.config.ts

REM 3. Sync Android Project
echo [3/4] Syncing Android project with isolated config...
call npx cap sync android

REM 4. Restore original config
echo [4/4] Restoring original configuration...
copy /Y capacitor.config.ts.bak capacitor.config.ts
del capacitor.config.ts.bak

echo.
echo [Success] Android project synced safely.
echo You can now run "npx cap open android" or build the APK.
pause
