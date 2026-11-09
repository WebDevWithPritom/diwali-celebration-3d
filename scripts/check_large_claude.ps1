$base = "D:\Gareeb Vibe Coding\Diwali Special Claude"
$ignored = @('tools\hf-cache', 'tools\uv', 'tools\uv-cache', 'VoiceStudio', '.hyperframes', '.thumbnails', '.waveform-cache', 'node_modules', '.git')

Get-ChildItem $base -Recurse -File | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($ig in $ignored) {
        if ($path -like "*\$ig\*" -or $path -like "*\$ig") {
            $skip = $true
            break
        }
    }
    -not $skip
} | ForEach-Object {
    if ($_.Length -gt 10MB) {
        Write-Host "LARGE: $($_.FullName) - $([math]::Round($_.Length/1MB, 2)) MB"
    }
}
