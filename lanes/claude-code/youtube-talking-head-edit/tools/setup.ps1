# One-time setup of the editing toolkit on Windows. Safe to run again: it returns at once when this version is
# already set up. Needs no admin rights: everything (its own Python, the packages, ffmpeg, a headless browser,
# the speech-to-text model) goes into %LOCALAPPDATA%\everygen-edit. Prints "READY <folder>" at the end.
# Run with: powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = "Stop"
$HERE = Split-Path -Parent $MyInvocation.MyCommand.Path
$BASE = Join-Path $env:LOCALAPPDATA "everygen-edit"
$VER = (Get-Content (Join-Path $HERE "VERSION") -Raw).Trim()
$PY = Join-Path $BASE "venv\Scripts\python.exe"
if ((Test-Path (Join-Path $BASE "ready-$VER")) -and (Test-Path $PY)) { Write-Output "READY $BASE"; exit 0 }
New-Item -ItemType Directory -Force -Path $BASE | Out-Null

$uv = (Get-Command uv -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $uv) {
    $uvDir = Join-Path $BASE "uv"
    $uv = Join-Path $uvDir "uv.exe"
    if (-not (Test-Path $uv)) {
        Write-Output "Installing uv (Python manager) into $uvDir ..."
        $env:UV_INSTALL_DIR = $uvDir
        $env:UV_NO_MODIFY_PATH = "1"
        powershell -NoProfile -ExecutionPolicy ByPass -Command "irm https://astral.sh/uv/install.ps1 | iex" | Out-Null
    }
    if (-not (Test-Path $uv)) { $uv = Join-Path $uvDir "bin\uv.exe" }
}

Write-Output "Creating the Python environment ..."
& $uv venv --python 3.12 --managed-python --quiet --allow-existing (Join-Path $BASE "venv")
if ($LASTEXITCODE -ne 0) { throw "uv venv failed" }
Write-Output "Installing packages ..."
& $uv pip install --python $PY --quiet numpy scipy soundfile pillow opencv-python-headless playwright imageio-ffmpeg pyloudnorm certifi faster-whisper
if ($LASTEXITCODE -ne 0) { throw "package install failed" }

Write-Output "Installing the headless browser ..."
& $PY -m playwright install --only-shell chromium | Out-Null
if ($LASTEXITCODE -ne 0) { throw "browser install failed" }

Write-Output "Downloading the speech-to-text model (about 1.5 GB, first time only) ..."
& $PY (Join-Path $HERE "ed.py") warmup
if ($LASTEXITCODE -ne 0) { throw "speech model download failed" }

New-Item -ItemType File -Force -Path (Join-Path $BASE "ready-$VER") | Out-Null
Write-Output "READY $BASE"
