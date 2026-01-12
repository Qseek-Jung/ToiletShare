@echo off
echo Committing final plist fixes for Bundle ID and Version...
"D:\Program Files\Git\cmd\git.exe" add ios/App/App/Info.plist
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(ios): hardcode bundle id and bump build version to 20"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Please trigger the FINAL build now.
pause
