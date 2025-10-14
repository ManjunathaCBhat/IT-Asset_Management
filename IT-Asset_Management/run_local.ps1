<#
run_local.ps1

Single-command local runner for the project (Windows PowerShell).
What it does:
- Creates a Python virtualenv in .venv if missing
- Activates the venv for the script session
- Installs Python requirements if needed
- Starts the FastAPI backend (uvicorn) in a background job using the venv python
- Installs frontend npm deps if needed and starts React dev server (npm start)

Usage (PowerShell):
  # allow script for this session if execution is restricted
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
  .\run_local.ps1

Note: Ensure Node.js and Python are installed and available in PATH.
#>

param(
    [string]$VenvPath = ".venv",
    [int]$BackendPort = 8000
)

function Write-Info($m) { Write-Host "[info] $m" -ForegroundColor Cyan }
function Write-ErrorMsg($m) { Write-Host "[error] $m" -ForegroundColor Red }

try {
    Push-Location -ErrorAction Stop (Split-Path -Parent $MyInvocation.MyCommand.Path)
} catch {
    Write-ErrorMsg "Failed to set working directory. Run the script from the repo root.";
    exit 1
}

Write-Info "Running from: $(Get-Location)"

# 1) Create venv if missing
if (-not (Test-Path $VenvPath)) {
    Write-Info "Creating virtualenv at $VenvPath..."
    python -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Failed to create virtualenv. Ensure Python is installed and on PATH."; exit 1 }
}

$pythonExe = Join-Path $VenvPath 'Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
    Write-ErrorMsg "Python executable not found in venv: $pythonExe"; exit 1
}

# 2) Activate venv for this session
Write-Info "Activating virtualenv..."
. "$VenvPath\Scripts\Activate.ps1"

# 3) Install Python requirements if fastapi not available (use venv python)
try {
    & $pythonExe -c "import fastapi" 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'missing' }
    Write-Info "Python requirements appear present (fastapi detected)."
} catch {
    Write-Info "Installing Python requirements from requirements.txt..."
    & $pythonExe -m pip install --upgrade pip
    & $pythonExe -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "Failed to install Python requirements."; exit 1 }
}

# 4) Start backend using venv python as a background job
Write-Info "Starting backend (uvicorn) on port $BackendPort as a background job..."

# Build argument array so we don't rely on a single string
$uvicornArgs = @('-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', [string]$BackendPort)

# Make logs directory
$logsDir = Join-Path (Get-Location) 'logs'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
$backendLog = Join-Path $logsDir 'backend.log'

# Use Start-Job; inside the job expand the argument array and redirect stdout/stderr to a log file
$backendLogFull = $backendLog
# Ensure log file exists and is empty
New-Item -Path $backendLogFull -ItemType File -Force | Out-Null


# Diagnostic: record venv python info to log before starting backend
Write-Info "Writing python diagnostics to log: $backendLogFull"
try {
    & $pythonExe -c "import sys, pkgutil; print('python:', sys.executable); print('version:', sys.version); print('pip:'); import pip; print(pip.__version__ if hasattr(pip,'__version__') else 'pip module ok'); print('fastapi loader:', pkgutil.find_loader('fastapi'))" | Out-File -FilePath $backendLogFull -Append -Encoding utf8
} catch {
    "$($_)" | Out-File -FilePath $backendLogFull -Append -Encoding utf8
}

# Start backend using Start-Process so we can redirect output reliably and stop the process later
$workingDir = (Get-Location).Path
$proc = Start-Process -FilePath $pythonExe -ArgumentList $uvicornArgs -WorkingDirectory $workingDir -RedirectStandardOutput $backendLogFull -RedirectStandardError $backendLogFull -NoNewWindow -PassThru

Start-Sleep -Seconds 2
if ($proc -and -not $proc.HasExited) {
    Write-Info "Backend started (pid: $($proc.Id), logs: $backendLogFull). If you see problems, open that file to inspect the traceback."
} else {
    Write-ErrorMsg "Backend process failed to start. Check the log file: $backendLogFull"
}

# Show the last lines of the backend log to surface errors quickly
try {
    Write-Info "---- Backend log tail (last 80 lines) ----"
    Get-Content -Path $backendLogFull -Tail 80 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
    Write-Info "---- End log tail ----"
} catch {
    Write-ErrorMsg "Could not read backend log: $_"
}

# 5) Start frontend (npm install if needed), run in foreground so you can see logs
if (-not (Test-Path "frontend")) {
    Write-ErrorMsg "frontend folder not found. Make sure you are at the project root."; exit 1
}

Push-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Info "Installing frontend npm dependencies (frontend)..."
    npm install
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "npm install failed in frontend"; Pop-Location; exit 1 }
}

Write-Info "Starting frontend dev server (npm start)..."
npm start

# When frontend stops, bring user back to repo root and stop backend job
Pop-Location

Write-Info "Frontend stopped; stopping backend process..."
if ($proc -and -not $proc.HasExited) {
    try {
        Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        Write-Info "Stopped backend (pid: $($proc.Id))."
    } catch {
        Write-ErrorMsg "Failed to stop backend process: $_"
    }
} else {
    Write-Info "Backend process is not running."
}

Write-Info "All done."
