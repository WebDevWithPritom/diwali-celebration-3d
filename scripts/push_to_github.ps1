$env:PATH = "D:\Git\cmd;C:\Program Files\GitHub CLI;" + $env:PATH
Write-Host "Checking git version..."
git --version
Write-Host "Creating GitHub repo WebDevWithPritom/diwali-celebration-3d..."
gh repo create WebDevWithPritom/diwali-celebration-3d --public --source=. --remote=origin
Write-Host "Pushing main branch..."
git push -u origin main

