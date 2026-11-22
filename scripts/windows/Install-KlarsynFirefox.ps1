<#
.SYNOPSIS
  Tvangsinstallerer Klarsyn permanent i Firefox på denne computer (fx en prøve-pc).

.DESCRIPTION
  1. Kopierer den SIGNEREDE .xpi til C:\ProgramData\Klarsyn\klarsyn.xpi
  2. Skriver/udvider Firefox' policies.json i "<Firefox-mappe>\distribution\"
     - ExtensionSettings: force_installed (eleven kan ikke fjerne eller slå den fra)
     - 3rdparty: Klarsyns egne indstillinger (låst)
  En eksisterende policies.json gemmes først som sikkerhedskopi.

  Kør i PowerShell som administrator:
    .\Install-KlarsynFirefox.ps1 -Xpi "C:\Users\dig\Downloads\klarsyn-1.2.0.xpi"

  Med blokering af AI-chattjenester og egne domæner:
    .\Install-KlarsynFirefox.ps1 -Xpi ".\klarsyn.xpi" -BlockAiChatServices -BlockDomains "eksempel-ai.dk","andet-ai.com"

  Fjern igen:
    .\Install-KlarsynFirefox.ps1 -Uninstall

.NOTES
  Kræver en .xpi signeret af Mozilla. En usigneret fil installeres ikke i almindelig Firefox.
  Genstart Firefox bagefter, og kontrollér på about:policies.
#>
#Requires -RunAsAdministrator
[CmdletBinding(DefaultParameterSetName = "Install")]
param(
  [Parameter(ParameterSetName = "Install", Mandatory = $true)]
  [string]$Xpi,

  [string]$FirefoxDir = (Join-Path $env:ProgramFiles "Mozilla Firefox"),

  [Parameter(ParameterSetName = "Install")]
  [switch]$BlockAiChatServices,

  [Parameter(ParameterSetName = "Install")]
  [string[]]$BlockDomains = @(),

  [Parameter(ParameterSetName = "Install")]
  [switch]$AllowSettingsChanges,

  [Parameter(ParameterSetName = "Uninstall", Mandatory = $true)]
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ExtensionId = "klarsyn@klarsyn.extension"
$TargetDir = Join-Path $env:ProgramData "Klarsyn"
$TargetXpi = Join-Path $TargetDir "klarsyn.xpi"

if (-not (Test-Path (Join-Path $FirefoxDir "firefox.exe"))) {
  throw "Firefox blev ikke fundet i '$FirefoxDir'. Angiv mappen med -FirefoxDir."
}
$DistDir = Join-Path $FirefoxDir "distribution"
$PolicyFile = Join-Path $DistDir "policies.json"

function Set-Prop($obj, [string]$name, $value) {
  if ($obj.PSObject.Properties.Name -contains $name) { $obj.$name = $value }
  else { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value }
}

function Get-OrCreate($obj, [string]$name) {
  if (-not ($obj.PSObject.Properties.Name -contains $name) -or $null -eq $obj.$name) {
    Set-Prop $obj $name ([pscustomobject]@{})
  }
  return $obj.$name
}

# Indlæs eksisterende politik, eller start forfra.
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
if (Test-Path $PolicyFile) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $PolicyFile "$PolicyFile.bak-$stamp"
  Write-Host "Sikkerhedskopi: $PolicyFile.bak-$stamp"
  $root = Get-Content $PolicyFile -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
  $root = [pscustomobject]@{}
}
$policies = Get-OrCreate $root "policies"
$extSettings = Get-OrCreate $policies "ExtensionSettings"
$third = Get-OrCreate $policies "3rdparty"
$thirdExt = Get-OrCreate $third "Extensions"

if ($Uninstall) {
  $extSettings.PSObject.Properties.Remove($ExtensionId)
  $thirdExt.PSObject.Properties.Remove($ExtensionId)
  # "blocked" fjerner udvidelsen ved næste start. Slet linjen igen senere, hvis den skal kunne installeres.
  Set-Prop $extSettings $ExtensionId ([pscustomobject]@{ installation_mode = "blocked" })
  Write-Host "Klarsyn sættes til 'blocked' og fjernes ved næste start af Firefox."
} else {
  if (-not (Test-Path $Xpi)) { throw "Filen '$Xpi' findes ikke." }
  if ([IO.Path]::GetExtension($Xpi) -ne ".xpi") { throw "Brug den signerede .xpi-fil fra Mozilla, ikke en .zip." }
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
  Copy-Item $Xpi $TargetXpi -Force
  Write-Host "Kopieret til $TargetXpi"

  $fileUrl = "file:///" + ($TargetXpi -replace "\\", "/")
  Set-Prop $extSettings $ExtensionId ([pscustomobject]@{
      installation_mode = "force_installed"
      install_url       = $fileUrl
    })

  $config = [ordered]@{
    enabled      = $true
    lockSettings = (-not $AllowSettingsChanges)
  }
  if ($BlockAiChatServices) { $config.categories = [ordered]@{ "general.chat" = $true } }
  if ($BlockDomains.Count -gt 0) { $config.customBlockedDomains = @($BlockDomains) }
  Set-Prop $thirdExt $ExtensionId ([pscustomobject]$config)
}

# UTF-8 uden BOM, så Firefox kan læse filen.
$json = $root | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($PolicyFile, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Skrevet: $PolicyFile"
Write-Host "Genstart Firefox og kontrollér på about:policies og about:addons."
