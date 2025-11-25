# run_etl.ps1
# Runs the full ETL pipeline (Extract -> Transform -> Load script generation)

Set-Location $PSScriptRoot

Write-Host "🔹 Activating virtual environment..." -ForegroundColor Cyan
.\.venv\Scripts\Activate.ps1

Write-Host "🔹 Running ETL pipeline (extract -> transform -> generate SQL)..." -ForegroundColor Cyan
python .\ETL\Scripts\pipeline.py

Write-Host "✅ ETL pipeline complete. Check ETL/Raw, ETL/Processed, and DB/load_data.sql" -ForegroundColor Green
