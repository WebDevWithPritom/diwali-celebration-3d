$base = "D:\Gareeb Vibe Coding\Diwali Special Claude"
$ignored = @('tools\hf-cache', 'tools\uv', 'tools\uv-cache', 'VoiceStudio', '.hyperframes', '.thumbnails', '.waveform-cache', 'node_modules', '.git')

$eligible = Get-ChildItem $base -Recurse -File | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($ig in $ignored) {
        if ($path -like "*\$ig\*" -or $path -like "*\$ig") {
            $skip = $true
            break
        }
    }
    -not $skip
}

$totalBytes = ($eligible | Measure-Object -Property Length -Sum).Sum
Write-Host "Total eligible files: $($eligible.Count)"
Write-Host "Total eligible size: $([math]::Round($totalBytes / 1MB, 2)) MB"
