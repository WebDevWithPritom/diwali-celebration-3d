$base = "D:\Gareeb Vibe Coding\Diwali Special Claude"
Get-ChildItem $base | ForEach-Object {
    if ($_.PSIsContainer) {
        $files = Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue
        $bytes = ($files | Measure-Object -Property Length -Sum).Sum
        $mb = [math]::Round($bytes / 1MB, 2)
        Write-Host "$($_.Name) [DIR] : $mb MB ($($files.Count) files)"
    } else {
        $mb = [math]::Round($_.Length / 1MB, 2)
        Write-Host "$($_.Name) [FILE] : $mb MB"
    }
}
