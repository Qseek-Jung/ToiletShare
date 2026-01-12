@echo off
echo Committing Privacy Usage Descriptions to Info.plist...
"D:\Program Files\Git\cmd\git.exe" add ios/App/App/Info.plist
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(ios): add missing privacy usage descriptions"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Please trigger a new build in Ionic Appflow.
pause
