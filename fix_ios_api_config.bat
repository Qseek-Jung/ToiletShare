@echo off
echo Committing iOS API Config Changes...
"D:\Program Files\Git\cmd\git.exe" add ios/App/App/Info.plist capacitor.config.ts
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(ios): update google login client id"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! The next build will have working Google Login.
pause
