@echo off
echo Committing fix for iOS Bundle ID...
"D:\Program Files\Git\cmd\git.exe" add capacitor.config.ts
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(config): revert appId to com.toilet.korea for iOS app store build"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Please trigger a new build in Ionic Appflow.
pause
