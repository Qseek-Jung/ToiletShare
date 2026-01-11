@echo off
echo Configuring iOS Social Login URL Schemes...
"D:\Program Files\Git\cmd\git.exe" add ios/App/App/Info.plist
"D:\Program Files\Git\cmd\git.exe" commit -m "fix(ios): add missing CFBundleURLTypes for Kakao, Naver, Google login"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Social Login Config Pushed.
pause
