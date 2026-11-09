$targetDir = "D:\Gareeb Vibe Coding\Diwali Special Claude"
Set-Location $targetDir

$env:PATH = "D:\Git\cmd;C:\Program Files\GitHub CLI;" + $env:PATH

Write-Host "Initializing git in $targetDir..."
git init
git branch -M main

Write-Host "Adding files..."
git add .

Write-Host "Git status check:"
git status --short | Select-Object -First 20

Write-Host "Committing..."
git commit -m "feat: Shubh Deepavali Story & Greeting Edition (Claude Version) with Interactive Diyas, Illustrated Story, and Animated Short Film"

Write-Host "Creating GitHub repository WebDevWithPritom/diwali-special-claude..."
gh repo create WebDevWithPritom/diwali-special-claude --public --source=. --remote=origin

Write-Host "Pushing to main branch..."
git push -u origin main

Write-Host "Enabling GitHub Pages..."
gh api --method POST /repos/WebDevWithPritom/diwali-special-claude/pages -f build_type=workflow
