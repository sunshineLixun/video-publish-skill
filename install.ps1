$ErrorActionPreference = "Stop"

$repository = if ($env:VIDEO_PUBLISH_REPOSITORY) { $env:VIDEO_PUBLISH_REPOSITORY } else { "sunshineLixun/video-publish-skill" }
$ref = if ($env:VIDEO_PUBLISH_REF) { $env:VIDEO_PUBLISH_REF } else { "main" }
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$destination = Join-Path $codexHome "skills/prepare-video-publish"
$archiveUrl = if ($env:VIDEO_PUBLISH_ARCHIVE_URL) {
  $env:VIDEO_PUBLISH_ARCHIVE_URL
} else {
  "https://codeload.github.com/$repository/zip/$ref"
}
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "video-publish-install-$([guid]::NewGuid())"
$stagedDirectory = $null
$backupDirectory = $null

New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  $archivePath = Join-Path $temporaryDirectory "source.zip"
  Write-Host "Downloading Video Publish Skill ($ref)..."
  Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath
  Expand-Archive -Path $archivePath -DestinationPath $temporaryDirectory

  $sourceDirectory = Get-ChildItem -Path $temporaryDirectory -Directory |
    ForEach-Object { Join-Path $_.FullName "skills/prepare-video-publish" } |
    Where-Object { Test-Path $_ -PathType Container } |
    Select-Object -First 1

  if (-not $sourceDirectory) {
    throw "The downloaded archive does not contain prepare-video-publish."
  }

  $requiredFiles = @(
    "SKILL.md",
    "scripts/video-publish.mjs",
    "scripts/transcribe.py",
    "scripts/ego-publisher/LICENSE.upstream"
  )
  foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path (Join-Path $sourceDirectory $requiredFile) -PathType Leaf)) {
      throw "The downloaded Skill is incomplete: $requiredFile is missing."
    }
  }

  $destinationParent = Split-Path $destination -Parent
  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  $identifier = [guid]::NewGuid().ToString("N")
  $stagedDirectory = Join-Path $destinationParent ".prepare-video-publish.install.$identifier"
  $backupDirectory = Join-Path $destinationParent ".prepare-video-publish.backup.$identifier"

  Copy-Item -Path $sourceDirectory -Destination $stagedDirectory -Recurse
  if (Test-Path $destination) {
    Move-Item -Path $destination -Destination $backupDirectory
  }

  Move-Item -Path $stagedDirectory -Destination $destination
  $stagedDirectory = $null
  if (Test-Path $backupDirectory) {
    Remove-Item -Path $backupDirectory -Recurse -Force
  }
  $backupDirectory = $null

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Installed successfully, but Node.js 20+ was not found in PATH."
  } else {
    Write-Host "Installed successfully."
  }
  Write-Host "Location: $destination"
} catch {
  if ($backupDirectory -and (Test-Path $backupDirectory) -and -not (Test-Path $destination)) {
    Move-Item -Path $backupDirectory -Destination $destination
    $backupDirectory = $null
  }
  throw
} finally {
  if ($stagedDirectory -and (Test-Path $stagedDirectory)) {
    Remove-Item -Path $stagedDirectory -Recurse -Force
  }
  if (Test-Path $temporaryDirectory) {
    Remove-Item -Path $temporaryDirectory -Recurse -Force
  }
}
