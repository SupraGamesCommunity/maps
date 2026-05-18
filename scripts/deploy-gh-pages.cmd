@echo off
setlocal enabledelayedexpansion

:: Assume we're going to do the deploy
set "DO_DEPLOY=Y"

:: Fetch latest remote changes
git fetch origin >nul 2>&1

:: Get the current Git branch name
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%i"

:: Check for modified, staged or deleted
set IS_DIRTY=
for /F "delims=" %%i in ('git status --porcelain -uno 2^>nul') do (
    set "IS_DIRTY=1"
)
if defined IS_DIRTY (
    set "DO_DEPLOY=N"
    echo Error: You have modfied, staged or deleted files
)

:: Get count of any unpushed commits
set "UNPUSHED_COUNT=0"
for /F "delims=" %%i in ('git rev-list @{u}..HEAD --count 2^>nul') do (
    set "UNPUSHED_COUNT=%%i"
)
if not "%UNPUSHED_COUNT%"=="0" (
    echo Error: You have %unpushed_count% unpushed commits
    set DO_DEPLOY=N
)

:: Exit if unpushed commits or uncommitted modified files
if "%DO_DEPLOY%"=="N" goto error_exit

:: Confirm they really mean it
CHOICE /M "Are you sure you want to deploy ^"%BRANCH%^" to GitHub Pages / github.io"
if %ERRORLEVEL% EQU 2 goto error_exit

echo.
echo Deploying branch "%BRANCH%"

:: Run the deployment
gh workflow run "deploy.yml" --ref "%BRANCH%"

:: Give the job time to start
timeout 5 > nul

:: Get the latest GitHub Action run ID for that branch
for /f "delims=" %%i in ('gh run list --workflow "deploy.yml" --branch "%BRANCH%" --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN_ID=%%i"

:: Report result of run or watch until it completes
gh run watch %RUN_ID%

endlocal
exit /b

:error_exit
echo Exiting without deploying

endlocal
exit /b -1
