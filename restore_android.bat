@echo off
echo Restoring Android Configuration...
"D:\Program Files\Git\cmd\git.exe" add capacitor.config.ts
"D:\Program Files\Git\cmd\git.exe" commit -m "chore: restore android appId com.toiletshare.app"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Android Config Restored.
pause
