@echo off
echo See BACKEND_DEVELOPMENT.md for dependencies
echo Expects: node.js, UV, imagemagick, voidtools everything and python

@echo.
@echo running 'uv --quiet sync'
call uv --quiet sync

@echo.
@echo running 'npm --silent install'
call npm --silent install

@echo.
@echo To run web server use command: 'npm run dev'
@echo.
@echo To run export scripts:
@echo   cd scripts       - Scripts are designed to run from 'scripts' sub-directory
@echo   findslpaks       - Set up environment variables required by scripts
@echo   export {options} - To run export script (leave blank for help)

