# Automated GitHub Push Script for IndicDocAI
param(
    [string]$RepoUrl = "https://github.com/siddhi7921/indic-doc-layout-ocr.git"
)

git init
git add .
git commit -m "feat: add multilingual document layout & structured OCR pipeline"
git branch -M main
git remote remove origin 2>$null
git remote add origin $RepoUrl
git push -u origin main
