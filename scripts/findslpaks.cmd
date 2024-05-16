@echo off

:: Sets SLDIR and SLPAK to the directory and filename where Supraland PAK can be found
:: Sets SLIUDIR and SIUPAK for the corresponding data in Six Inches Under

:: Option to add a list of paths to the search if using dir method (don't include trailing \)
:: Example:
::  findslpaks "C:\Program Files (X86)\Steam"
::
:: These paths are used if VoidTools everything is not installed
:: "C:\Program Files (X86)\Steam" is default path to search if nothing specified
 
:: Check that ES.exe is installed
where /q es.exe
if errorlevel 1 ( 
    echo Error: es.exe not found on path
    echo. 
    echo findslpaks.bat requires VoidTools Everything tool to be installed and running
    echo and the CLI tool es.exe to be on the path
    echo See: https://www.voidtools.com/downloads/
    echo and: https://www.voidtools.com/support/everything/command_line_interface/
    goto :tryslowsearch
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
    goto :tryslowsearch
)

:: PAK file names are hard coded
set slpak=Supraland-WindowsNoEditor.pak
set siupak=SupralandSIU-WindowsNoEditor.pak

:: Looks for SIU PAK file and takes first result stripping filename from the path
set sldir=
for /f "tokens=*" %%i in ('es -max-results 1 %slpak%') do set sldir=%%~dpi

if "%sldir%"=="" (
    echo Error: Supraland PAK file not found by Everything
) else (
    echo SLDir  = "%sldir%"
)

:: Looks for SIU PAK file and takes first result stripping filename from the path
set siudir=
for /f "tokens=*" %%i in ('es -max-results 1 %siupak%') do set siudir=%%~dpi

if "%siudir%"=="" (
    echo Error: Six Inches Under PAK file not found by Everything
) else (
    echo SIUDir = "%siudir%"
)

exit /b

:: Seach for pak files using dir method (could be very slow)
:tryslowsearch

echo.
echo Trying slow search using dir command...
echo.

call :slowsearch sldir %slpak% %*
if "%sldir%"=="" (
    echo Error: Supraland PAK file not found by slow search using dir command
) else (
    echo SLDir  = "%sldir%"
)

call :slowsearch siudir %siupak% %*
if "%sldir%"=="" (
    echo Error: Six Inches Under PAK file not found by slow search using dir command
) else (
    echo SIUDir = "%siudir%"
)

exit /b

:: slowsearch {return var} {filename} [spath1] [spath2] ...
:: ex: call slowsearch myfile C: D:
:: Result is returned in %return var% uses setlocal to protect caller environment

:slowsearch

setlocal
set retvar=%~1
shift

:: filename to search for is first argument
set filename=%~1

:: Default path in case no paths supplied in subsequent arguments
shift
set spath=C:\Program Files (x86)\steam

:: Directory we've found
set retdir=

:tryspath

if not "%~1"=="" set spath=%~1

for /f "tokens=*" %%i in ('dir /b /s "%spath%\%filename%" 2^>nul') do (
    set retdir=%%~dpi
    goto :slowsearch_return
)

shift
if not "%~1"=="" goto tryspath

:slowsearch_return
endlocal & set %retvar%=%retdir%

goto :eof
