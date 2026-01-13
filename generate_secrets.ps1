$certPath = "d:\Ai-APP\Antigravity\Share_toilet_1224\cert\app_store_cert.p12"
$profilePath = "d:\Ai-APP\Antigravity\Share_toilet_1224\cert\ShareToilet_App_Store.mobileprovision"

$certBytes = [System.IO.File]::ReadAllBytes($certPath)
$certBase64 = [System.Convert]::ToBase64String($certBytes)

$profileBytes = [System.IO.File]::ReadAllBytes($profilePath)
$profileBase64 = [System.Convert]::ToBase64String($profileBytes)

Write-Host "============= BUILD_CERTIFICATE_BASE64 (Copy Below) ============="
Write-Host $certBase64
Write-Host "================================================================"
Write-Host ""
Write-Host "============= BUILD_PROVISION_PROFILE_BASE64 (Copy Below) ======"
Write-Host $profileBase64
Write-Host "================================================================"
