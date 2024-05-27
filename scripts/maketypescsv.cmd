@echo off

where /q py.exe
if ERRORLEVEL 1 ( 
set PYTHON=python.exe
) else (
set PYTHON=py.exe
)

%PYTHON% maketypescsv.py
