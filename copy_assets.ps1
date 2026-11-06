param(
    [string]$Source = "D:\Andri\RUL-XGboost-LSTM",
    [string]$Destination = "D:\Andri\RUL-Platform\backend"
)

$datasets = @("FD001", "FD002", "FD003", "FD004")

New-Item -ItemType Directory -Force -Path "$Destination\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$Destination\models" | Out-Null

foreach ($fd in $datasets) {
    foreach ($prefix in @("train", "test", "RUL")) {
        $file = Join-Path $Source "data\$($prefix)_$fd.txt"
        if (-not (Test-Path $file)) {
            throw "File tidak ditemukan: $file"
        }
        Copy-Item $file "$Destination\data\" -Force
    }

    $modelFiles = @(
        "xgb_$fd.json",
        "bilstm_${fd}_retrained.keras"
    )

    foreach ($name in $modelFiles) {
        $file = Join-Path $Source "models\$name"
        if (-not (Test-Path $file)) {
            throw "Model tidak ditemukan: $file"
        }
        Copy-Item $file "$Destination\models\" -Force
    }
}

Write-Host "Asset FD001-FD004 berhasil disalin ke $Destination" -ForegroundColor Green
