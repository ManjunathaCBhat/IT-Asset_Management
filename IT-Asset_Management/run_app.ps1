# =======================================
# run_app.ps1 - Windows PowerShell Script
# =======================================

Write-Host "Starting Full Stack Application (Backend + Frontend)..."

# Step 1: Activate Python virtual environment
Write-Host "Activating Python virtual environment..."
& .\.venv\Scripts\Activate.ps1

# Step 2: Start FastAPI Backend
Write-Host "Starting FastAPI backend..."
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 5  # Wait to ensure backend starts

# Step 3: Start React Frontend
Write-Host "Starting React frontend..."
Set-Location "frontend"
npm install | Out-Null
npm start

# Step 4: Done
Write-Host "Application started successfully!"