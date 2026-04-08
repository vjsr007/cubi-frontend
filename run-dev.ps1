$env:PATH += ";$env:USERPROFILE\.cargo\bin;$env:APPDATA\npm"
Set-Location $PSScriptRoot
npx tauri dev
