param(
    [int]$Port = 8000
)

Write-Host "Activating virtual environment..."
& .\.venv\Scripts\Activate.ps1

Write-Host "Starting API on port $Port..."
cd API
uvicorn app.main:app --reload --port $Port
