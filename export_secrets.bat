@echo off
set "EXPORT_DIR=mobile_secrets"
set "ZIP_NAME=mobile_secrets.zip"

echo [1/5] Cleaning up old files...
if exist "%EXPORT_DIR%" rmdir /s /q "%EXPORT_DIR%"
if exist "%ZIP_NAME%" del "%ZIP_NAME%"

echo [2/5] Creating directory structure...
mkdir "%EXPORT_DIR%"

echo [3/5] Copying secret files...
copy ".env" "%EXPORT_DIR%\.env"
copy "ios\App\App\GoogleService-Info.plist" "%EXPORT_DIR%\GoogleService-Info.plist"

echo [4/5] Creating install script for Mac (LF line endings)...
powershell -Command "$script = \"#!/bin/bash`necho 'Restoring secrets...'`ncp .env ../.env`nmkdir -p ../ios/App/App`ncp GoogleService-Info.plist ../ios/App/App/GoogleService-Info.plist`necho 'Secrets restored successfully!'`n\"; [System.IO.File]::WriteAllText('%EXPORT_DIR%\install_secrets.sh', $script)"

echo [5/5] Zipping files...
powershell -Command "Compress-Archive -Path '%EXPORT_DIR%\*' -DestinationPath '%ZIP_NAME%'"

echo.
echo ========================================================
echo  SUCCESS! Secret package created: %ZIP_NAME%
echo ========================================================
echo.
echo [Instructions for Mac]
echo 1. Send %ZIP_NAME% to your Mac.
echo 2. Unzip it inside the project root folder.
echo 3. Run: chmod +x install_secrets.sh
echo 4. Run: ./install_secrets.sh
echo ========================================================
pause
