@echo off
echo Deploying to Web (Cloudflare Pages)...
"D:\Program Files\Git\cmd\git.exe" add .
"D:\Program Files\Git\cmd\git.exe" commit -m "feat(guide): add contact button for app store compliance"
"D:\Program Files\Git\cmd\git.exe" push origin mobile-app-dev
echo Done! Please check Cloudflare Dashboard for deployment status.
pause
