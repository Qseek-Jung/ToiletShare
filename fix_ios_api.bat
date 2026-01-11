@echo off
echo Configuring iOS API Settings (AdMob, etc)...
"D:\Program Files\Git\cmd\git.exe" add ios/App/App/Info.plist
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(ios): add GADApplicationIdentifier for AdMob and refine Info.plist"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! API Config Pushed.
pause
