# =======================================
# run_app.ps1 - Windows PowerShell Script
# =======================================

Write-Host "Starting Full Stack Application (Backend + Frontend)..."

# Step 1: Activate Python virtual environment
Write-Host "Activating Python virtual environment..."
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
	& .\.venv\Scripts\Activate.ps1
} else {
	Write-Host "Virtual environment activation script not found at .\.venv\Scripts\Activate.ps1. Make sure .venv exists and is created."
}

# Step 2: Start FastAPI Backend
Write-Host "Starting FastAPI backend..."
# Set local development environment variables (adjust as needed)
$env:PORT = '8000'
$env:API_BASE_URL = 'http://localhost:8000'

# Frontend dev server needs REACT_APP_API_BASE_URL at start time
$env:REACT_APP_API_BASE_URL = 'http://localhost:8000'

# Start backend in a new process (background)
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn main:app --reload --host 0.0.0.0 --port $env:PORT"

Start-Sleep -Seconds 5  # Wait to ensure backend starts

# Step 3: Start React Frontend
Write-Host "Starting React frontend..."
Set-Location "frontend"
# Ensure dependencies are installed (safe to run repeatedly)
if (-Not (Test-Path "node_modules")) {
	npm install
}

# Start the dev server (uses $env:REACT_APP_API_BASE_URL set above)
npm start

# Step 4: Done
Write-Host "Application started successfully!"
