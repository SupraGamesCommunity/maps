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
@echo running 'findslpaks'
call findslpaks.cmd

@echo.
@echo To run web server use command: 'npm run dev'
@echo.
@echo To run export process use 'export {options}'

