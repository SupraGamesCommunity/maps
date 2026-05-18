@echo off

:: Get the current Git branch name
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%i"

:: Run the deployment
gh workflow run "deploy.yml" --ref "%BRANCH%"

:: Give the job time to start
timeout 5 > nul

:: Get the latest GitHub Action run ID for that branch
for /f "delims=" %%i in ('gh run list --workflow "deploy.yml" --branch "%BRANCH%" --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN_ID=%%i"

:: Report result of run or watch until it completes
gh run watch %RUN_ID%
