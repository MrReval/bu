$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "Starting PHP server on http://127.0.0.1:8080"
php -S 127.0.0.1:8080 router.php
