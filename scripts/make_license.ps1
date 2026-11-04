Add-Type -AssemblyName System.Security
$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$dir = [System.IO.Path]::Combine($localAppData, "SideLink")
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
$licensePath = [System.IO.Path]::Combine($dir, "unlocked.lic")
$machineName = [Environment]::MachineName
$userName = [Environment]::UserName
$time = [DateTime]::UtcNow.ToString("O")
$info = "$machineName|$userName|$time|permanent-machine-license"
$plain = [System.Text.Encoding]::UTF8.GetBytes($info)
$entropy = [System.Text.Encoding]::UTF8.GetBytes("SideLink-Machine-Unlock-v1")
$scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
$encrypted = [System.Security.Cryptography.ProtectedData]::Protect($plain, $entropy, $scope)
[System.IO.File]::WriteAllBytes($licensePath, $encrypted)
Write-Output "SUCCESS: License created at $licensePath"

