@echo off

:: Needs the games installed with their locations set in envvars
:: Uses CUE4Parse.exe from the path/current directory
:: Spits out files into game specific subdirectories of "source"
::
:: Note the maps tend to be hand customised, so we grab copies
:: from source rather than the originals from ..\source\{game}\mapimg
:: when we do the tiling.

setlocal enabledelayedexpansion

for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set colDef=%ESC%[0m
set colRed=%ESC%[31m
set colGrn=%ESC%[32m

:: Specifies where various things are
set CUE4Parse=CUE4Parse.exe
set basedir=..\source

:: Make sure we have the relevant environment variables set up
for %%i in ( "%SLROOT%" "%SIUROOT%" "%SWROOT%" ) do if "%%~i"=="" goto env_error

:: Decode command line options
:: export {game} {mode}

:: Game selection
set games=%~1
if "%games%"=="" goto :cli_error
if "%games%"=="all" set games=sl slc siu sw
call :has_wildcard "%games%"
if not errorlevel 1 goto cli_error

:: Mode selection
set modes=%~2
if "%modes%"=="" goto :cli_error
call :has_wildcard %modes%
if not errorlevel 1 goto cli_error

:: Flatten flag (used by parse command)
if "%~3"=="flatten" ( set "flatten=true" & shift /3 )

:: Concatenate any extra arguments

set extraargs=%~3
shift /3
:join_args
if not "%~3"=="" (
    set extraargs=%extraargs% %~3
    shift /3
    goto :join_args
)

:: Call one or more commands
for %%i in ( %games% ) do (
    set game=%%i
    for %%j in ( %modes% ) do (
        set mode=%%j
        call :do_command
    )
) 

exit /b


::=================================================================================================

:do_command

:: Check game and mode are valid
set gameopt=bad
for %%i in (sl siu sw) do if "%%i"=="%game%" set gameopt=good
if %gameopt%==bad goto :cli_error

set modeopt=bad
for %%i in (levels loc bp mapimg gentiles enums list parse) do if "%%i"=="%mode%" set modeopt=good
if %modeopt%==bad goto :cli_error

:: Make sure the game output directory exists (this creates basedir and basedir\game)
set "gameout=%basedir%\%game%"
if not exist "%gameout%" md "%gameout%"

:: Set up envars for CUE4Parse options based on the game 
call :setopt_%game%

:: Opt is the default arguments for CUE4Parse
:: -i specifies where the game install is installed
:: -g specifies the version the game was built on
:: -m specifies the mappings.usmap file extracted from the game (possibly not required)
:: -o specifies the directory where extracted files should be placed
:: -l to list files
:: -c to specify a file containing a list of file patterns
:: -p to specify a file pattern to match
set opt= -i "%gameroot%" -g %gamever% -m "%mappings%" -o "%gameout%\temp"

:: Call the subroutine to do the work for mode/game
call :%game%_%mode%

:: Done
goto :eof

::=================================================================================================

:: Required environment variables not set
:env_error

echo %colRed%This batch file requires SLROOT, SIUROOT and SWROOT environment variables
echo to be set up to work correctly. You can set them manually or use the
echo findslpaks.cmd batch file to set them up automatically%colDef%

exit /b

:: There was a command line processing error display help text
:cli_error

:: Sequence is:
:: findslpaks                   - set up env vars
:: export all list              - outputs PAK dir in gamefilelist.txt
:: export all levels            - extract levels
:: export all preproc           - identify bps and enums based on gameClasses.json
:: export all "bp enums"        - extract bps and enums
:: export all preproc           - optional remap enums based on enum extraction
:: export all markers           - export markers
::                              - add loc keys to gameClasses.json (export_class_loc)
::                              - Filter loc files to just keys we want (markers, layers, gameclasses...)
::
:: For map textures:
:: export all mapimg            - to get the map raw images
:: {manually produce ..\source\{game}map-final.png}
:: export all gentiles          - to generate tiles for runtime map
::
:: Todo:
:: Move stuff in run.cmd to here with these commands:
:: python supraland_parse.py -d ..\source -g %game% -p      preproc
:: python supraland_parse.py -d ..\source -g %game% -m      markers
:: python supraland_parse.py -d ..\source -g %game% -b      loc keys from blueprints to gameClasses
:: python supraland_parse.py -d ..\source -g %game% -o      loc files filtered to just keys we need
::
:: Deal with pipeline update

echo Usage: export {game} [{mode}]
echo.
echo {game} is one of sl, slc, siu or sw (slc ignored for most commands) (use all or put multiple games in quotes)
echo {mode} is one of images, maps or list (put multiple modes in quotes)
echo.
echo levels   extracts .umap level data for the specified game to ..\source\*.json
echo bp       extracts .uasset blueprint files to .json
echo mapimg   extracts .png map image files and merges them together in ..\source\{maps}.json
echo gentiles takes ..\source\{game}map-final.png and generates tiles in ..\tiles\{game}\base 
echo loc      extracts .locres/.locmeta localistation files for the specified game
echo enums    extracts all the enumerations and their member names/numbers (..\source\{game}.enums.json)
echo list     generates a list of all files in the specified game ({game}.list.txt)
echo parse    runs extraction with custom arguments (optional flatten argument)
echo          ie export {game} parse [flatten] -p */{file}.uasset
echo.
echo Files and directories are placed in ..\source\{game}\

exit /b

::=================================================================================================

:: Set the game specific options for CUE4Parse
:setopt_sl
:setopt_slc
set "gameroot=%SLROOT%"
set gamever=GAME_UE4_26
set gamename=Supraland
set "mappings=%basedir%\%game%\%gamename%.usmap"
set mapimage=T_Downscale
set mappath=Supraland/Content/Blueprints/PlayerMap/Textures

goto :eof

:setopt_siu
set "gameroot=%SIUROOT%"
set gamever=GAME_UE4_27
set gamename=SupralandSIU
set "mappings=%basedir%\%game%\%gamename%.usmap"
set mapimage=T_SIUMapV7Q
set mappath=SupralandSIU/Content/Blueprints/PlayerMap/Textures

goto :eof

:setopt_sw
set "gameroot=%SWROOT%"
set gamever=GAME_UE5_6
set gamename=Supraworld
set "mappings=%basedir%\%game%\%gamename%.usmap"
set mapimage=T_SupraworldMapV?Q
set mappath=Supraworld/Plugins/Supra/PlayerMap/Content/Textures

goto :eof


::=================================================================================================
:: Sets errorlevel to 0 if the string has a wildcard in it (* or ?) 
:has_wildcard
echo %1 | find "*" >nul
if not errorlevel 1 goto :eof
echo %1 | find "?" >nul
goto :eof


::=================================================================================================
:: Level Map Files as jsons
::
:: Still want to unwind the enums

:slc_levels
echo %colGrn%Crash umaps are extracted with Supraland skipping%colDef%
goto :eof

:sl_levels
:siu_levels
:sw_levels

echo %colGrn%Extracting umaps as jsons to %basedir%\%game%\levels%colDef%

:: Exract the umap files (more than we need)
:: Content/FirstPersonBP/Maps is SIU/SL and Content/Maps is SW
%CUE4Parse% %opt% -p %gamename%/Content/FirstPersonBP/Maps/*.umap -p */%gamename%/Content/Maps/*.umap

:: Move all the level map json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\levels" md "%gameout%\levels"
pushd "%gameout%\temp"
if not errorlevel 0 goto :eof

for /r %%i in ( *.json ) do move /Y %%i ..\levels >nul
popd
rd /s /q "%gameout%\temp"

goto :eof


::=================================================================================================
:: Extract a subset of blueprints converted to JSON files
::
:: We basically want to extract all the blueprints for the types we're interested in from the
:: games umap file and then move them into the bp directory.

:slc_bp
echo %colGrn%Crash blueprints are extracted with Supraland skipping%colDef%
goto :eof

:sl_bp
:siu_bp
:sw_bp

echo %colGrn%Extracting blueprints jsons for types of interest to %basedir%\%game%\bpassetlist.txt%colDef%

if not exist "%basedir%\%game%\bpassetlist.txt" goto :eof
%CUE4Parse% %opt% -c "%basedir%\%game%\bpassetlist.txt"

:: Move all the blueprint json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\bp" md "%gameout%\bp"
pushd "%gameout%\temp"
if not errorlevel 0 goto :eof

for /r %%i in ( *.json ) do move /Y %%i ..\bp >nul
popd
rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: Localisation Files

:slc_loc
echo %colGrn%Crash localisation data is extracted with Supraland skipping%colDef%
goto :eof

:sl_loc
:siu_loc
:sw_loc

echo %colGrn%Extracting localisation json files to %gameout%\loc%colDef%

:: Unpack all the game specific localisation files
%CUE4Parse% %opt% -p */Localization/Game/*.locres -p */Localization/Game/*.locmeta

:: Move all the localisation json files into a single directory (keeping relative paths)
:: then delete the other files/directories
if not exist "%gameout%\loc" md "%gameout%\loc"
robocopy "%gameout%\temp\%gamename%\Content\Localization\Game" "%gameout%\loc" /s /move >nul

rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: Player Map Image extraction and conversion

:slc_mapimg
echo %colGrn%Crash had no map image use manually created one, skipping%colDef%
goto :eof

:sl_mapimg
:siu_mapimg
:sw_mapimg

echo %colGrn%Extracting map images, joining and copying to %gameout%\mapimg\%game%map.png%colDef%

:: Unpack all the map image textures
%CUE4Parse% %opt% -p %mappath%/%mapimage%?.uasset

:: Move the extracted files to local store
if not exist %gameout%\mapimg md %gameout%\mapimg
move>nul /Y  "%gameout%\temp\%mappath:/=\%\%mapimage%*.*" "%gameout%\mapimg"

set "hdropt=-colorspace RGB -auto-level -sigmoidal-contrast 3,0.5 -gamma 2.2"

if not "%game%"=="sw" (
    :: Stitch the PNG images into two rows and two columns
    magick montage "%gameout%\mapimg\%mapimage%*.png" -geometry +0+0 %gameout%\mapimg\%game%map.png 
) else (
    :: Convert HDR to PNG with gamma correction and merge tiles
    magick "%gameout%\mapimg\%mapimage%*.hdr" %hdropt% miff:- | magick montage miff:- -geometry +0+0 "%gameout%\mapimg\%game%map.png"
)

:: Cleanup intermediate files
del "%gameout%\mapimg\%mapimage%*.*"
rd /s /q %gameout%\temp

goto :eof


::=================================================================================================
:: Generate tiled versions of map images

:sl_gentiles
:slc_gentiles
:siu_gentiles
:sw_gentiles

set tiledir=..\tiles\%game%\base
set mappng=..\source\%game%map-final.png

echo %colGrn%Generating map tiles in %tiledir% from %mappng%%colDef%

if not exist "%tiledir%" md "%tiledir%""

python gentiles.py -t jpg -w 512 %mappng% 0-4 %tiledir%

goto :eof


::=================================================================================================
:: Extract and convert to JSON all files in the PAK in \Enums\ directories 

:slc_enums
echo %colGrn%Crash enums extracted from Supraland, skipping%colDef%
goto :eof

:sl_enums
:siu_enums
:sw_enums

echo %colGrn%Outputting Enum .json files to %basedir%\%game%\enumassetlist.txt%colDef%

if not exist "%basedir%\%game%\enumassetlist.txt" goto :eof
%CUE4Parse% %opt% -c "%basedir%\%game%\enumassetlist.txt"

:: Move all the enumeration json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\enums" md "%gameout%\enums"
pushd "%gameout%\temp"
if not errorlevel 0 goto :eof

for /r %%i in ( *.json ) do move /Y %%i ..\enums >nul
popd
rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: List the contents of the game PAK files

:slc_list
echo %colGrn%Crash data extracted from Supraland, skipping%colDef%
goto :eof

:sl_list
:siu_list
:sw_list

echo %colGrn%Outputting directory of %game% PAK files to %gameout%\gamefilelist.txt%colDef%

%CUE4Parse% %opt% -l -p * >"%gameout%\gamefilelist.txt"

goto :eof


::=================================================================================================
:: Run CUE4Parse with custom arguments
::
:: Normal use: export sw parse [flatten] -p *name.uasset

:slc_parse
echo %colGrn%Crash data extracted from Supraland, skipping%colDef%
goto :eof

:sl_parse
:siu_parse
:sw_parse

echo %colGrn%Running CUE4Parse from %game% to %gameout%\parse with args:%colDef% %extraargs%

%CUE4Parse% %opt% %extraargs%

:: Any files extracted?
if not exist "%gameout%\temp" goto :eof

echo Moving any extracted files to %gameout%\parse

if not exist "%gameout%\parse" md "%gameout%\parse"
pushd "%gameout%\temp"
if not errorlevel 0 goto :eof

if "%flatten%"=="flatten" (
    :: Copy files removing subfolders
    robocopy "%gameout%\temp\" "%gameout%\parse" /s /move >nul
) else (
    :: Copy files keeping subfolder structure
    for /r %%i in ( *.* ) do move /Y %%i ..\parse >nul
)

popd
rd /s /q "%gameout%\temp"

goto :eof
