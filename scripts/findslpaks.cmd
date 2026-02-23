@echo off

:: Sets up a bunch of environment variables with the locations of key Supraland game files
::
:: SLROOT, SIUROOT and SWROOT set to root directory of corresponding game install
:: SLDIR, SIUDIR and SWDIR set to the directory where the main PAK file is
::
:: Option to add a list of paths to the search if using dir method (don't include trailing \)
:: Example:
::  findslpaks "C:\Program Files (X86)\Steam"
::
:: These paths are used if VoidTools everything is not installed
:: "C:\Program Files (X86)\Steam" is default path to search if nothing specified

set _FINDPATH=esfindpath

:: Check that ES.exe is installed
where /q es.exe
if errorlevel 1 ( 
    echo Error: es.exe not found on path
    echo. 
    echo findslpaks.bat requires VoidTools Everything tool to be installed and running
    echo and the CLI tool es.exe to be on the path
    echo See: https://www.voidtools.com/downloads/
    echo and: https://www.voidtools.com/support/everything/command_line_interface/

    set _FINDPATH=dirfindpath
    goto :do_search
)

:: Check that ES.exe is actually working
es -max-results 0 test
::es -max-results 0 test > nul 2> nul
if errorlevel 1 (
    echo.
    echo findslpaks.bat requires VoidTools Everything tool to be installed and running
    echo and the CLI tool es.exe to be on the path
    echo See: https://www.voidtools.com/downloads/
    echo and: https://www.voidtools.com/support/everything/command_line_interface/

    set _FINDPATH=dirfindpath
)

:do_search
call :%_FINDPATH% SLROOT Supraland.exe "Supraland EXE" %*
call :%_FINDPATH% SLDIR Supraland-WindowsNoEditor.pak "Supraland PAK" "%SLROOT%"

call :%_FINDPATH% SIUROOT SupralandSIU.exe "Six Inches Under EXE" %*
call :%_FINDPATH% SIUDIR SupralandSIU-WindowsNoEditor.pak "Six Inches Under PAK" "%SIUROOT%"

call :%_FINDPATH% SWROOT Supraworld.exe "Supraworld EXE" %*
call :%_FINDPATH% SWDIR pakchunk0-Windows.pak "Supraworld PAK" "%SWROOT%"

set _FINDPATH=

exit /b

:: esfindpath {return var} {Search str} {description} {spath}
::
:: Find the path that matches the search string and return it in the specified
:: variable. Provides a description for error message.
::
:: Uses voidtools everthing command line (es.exe)

:esfindpath

setlocal enabledelayedexpansion

:: Get name of environment variable we are to set
set retvar=%~1
shift

:: Get file search string for ES to look for
set filestr=%~1
shift

:: Get friendly description of what we're looking for
set desc=%~1
shift

:: Add path onto search if provided
if NOT "%~1"=="" (
    set "filestr=%~1\*\!filestr!"
)

set retdir=
for /f "tokens=*" %%i in ('es -max-results 1 "%filestr%"') do set "retdir=%%~dpi"

if "%retdir%"=="" (
    echo Error: %desc% not found by Everything
) else (
    if !retdir:~-1!==\ set "retdir=!retdir:~0,-1!"
    echo !retvar! = "!retdir!"
)

endlocal & set %retvar%=%retdir%
goto :eof


:: dirfindpath {return var} {search str} {description} [spath1] [spath2] ...
:: ex: call slowsearch myfile C: D:
:: Result is returned in %return var% uses setlocal to protect caller environment

:dirfindpath

setlocal enabledelayedexpansion

:: variable we should set to target directory
set retvar=%~1
shift

:: filename to search for is first argument
set filestr=%~1
shift

:: friendly description of the file
set desc=%~1
shift

:: Default path in case no paths supplied in subsequent arguments
set spath=C:\Program Files (x86)\steam

:: Directory we've found
set retdir=

:tryspath

if not "%~1"=="" set spath=%~1

for /f "tokens=*" %%i in ('dir /b /s "!spath!\!filestr!" 2^>nul') do (
    set "retdir=%%~dpi"
    goto :slowsearch_return
)

shift
if not "%~1"=="" goto tryspath

:slowsearch_return

if "%retdir%"=="" (
    echo Error: %desc% file not found by slow search using dir command
) else (
    if !retdir:~-1!==\ set "retdir=!retdir:~0,-1!"
    echo !retvar! = "!retdir!"
)

endlocal & set %retvar%=%retdir%

goto :eof
