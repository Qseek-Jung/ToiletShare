#!/bin/bash
echo 'Restoring secrets...'
cp .env ../.env
mkdir -p ../ios/App/App
cp GoogleService-Info.plist ../ios/App/App/GoogleService-Info.plist
echo 'Secrets restored successfully!'
