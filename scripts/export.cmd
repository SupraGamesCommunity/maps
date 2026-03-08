@echo off

:: Needs the games installed with their locations set in envvars
:: Uses CUE4Parse.exe from the path/current directory
:: Spits out files into game specific subdirectories of "source"
::
:: Note the maps tend to be hand customised, so we grab copies
:: from source rather than the originals from source\{game}\mapimg
:: when we do the tiling.

setlocal enabledelayedexpansion

:: Specifies where various things are
set CUE4Parse=CUE4Parse.exe
set basedir=source

:: Make sure we have the relevant environment variables set up
for %%i in ( "%SLROOT%" "%SIUROOT%" "%SWROOT%" ) do if "%%i"=="" goto env_error

:: Decode command line options
:: export {game} {mode}

:: Game selection
set gameopt=bad
set game=%~1
if "%game%"=="" set game=sl
for %%i in (sl siu sw) do if "%%i"=="%game%" set gameopt=good
if %gameopt%==bad goto :cli_error

:: Mode selection
set mode=%~2
set modeopt=bad
if "%mode%"=="" set mode=levels
for %%i in (levels loc bp mapimg enums list) do if "%%i"=="%mode%" set modeopt=good
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
set opt= -i "%gameroot%" -g %gamever% -m "%mappings%" -o "%gameout%\temp"

:: Call the subroutine to do the work for mode/game
call :%game%_%mode%

:: Done
exit /b

:: Required environment variables not set
:env_error

echo This batch file requires SLROOT, SIUROOT and SWROOT environment variables
echo to be set up to work correctly. You can set them manually or use the
echo findslpaks.cmd batch file to set them up automatically

exit /b

:: There was a command line processing error display help text
:cli_error

echo Usage: export {game} [{mode}]
echo.
echo {game} is one of sl, siu or sw (sl does crash too)
echo {mode} is one of images, maps or list
echo.
echo levels  extracts .umap level data for the specified game to .\source\*.json
echo bp      extracts .uasset blueprint files to .json
echo mapimg  extracts .png map image files and merges them together in .\source\{maps}.json
echo loc     extracts .locres/.locmeta localistation files for the specified game
echo enums   extracts all the enumerations and their member names/numbers (source\{game}.enums.json)
echo list    generates a list of all files in the specified game ({game}.list.txt)
echo.
echo Localisation and blueprint files are left in %TEMP%\{game}export\*

exit /b

:: Set the game specific options for CUE4Parse
:setopt_sl
set "gameroot=%SLROOT%"
set gamever=GAME_UE4_26
set gamename=Supraland
set "mappings=%basedir%\%game%\%gamename%.usmap"

goto :eof

:setopt_siu
set "gameroot=%SIUROOT%"
set gamever=GAME_UE4_27
set gamename=SupralandSIU
set "mappings=%basedir%\%game%\%gamename%.usmap"

goto :eof

:setopt_sw
set "gameroot=%SWROOT%"
set gamever=GAME_UE5_6
set gamename=Supraworld
set "mappings=%basedir%\%game%\%gamename%.usmap"

goto :eof


::=================================================================================================
:: Level Map Files as jsons
::
:: Still want to unwind the enums

:sl_levels
:siu_levels
:sw_levels

:: Exract the umap files (more than we need)
%CUE4Parse% %opt% -p %gamename%/Content/FirstPersonBP/Maps/*.umap -p */%gamename%/Content/Maps/*.umap

:: Move all the level map json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\levels" md "%gameout%\levels"
pushd "%gameout%\temp"
for /r %%i in ( *.json ) do move /Y %%i ..\levels >nul
popd
rd /s /q "%gameout%\temp"

goto :eof


::=================================================================================================
:: Extract a subset of blueprints converted to JSON files
::
:: We basically want to extract all the blueprints for the types we're interested in from the
:: games umap file and then move them into the bp directory.

:sl_bp
:siu_bp
:sw_bp

echo Extracting blueprints jsons for types of interest to %gameout%\bp

:: Given some object of "Type": "{type}" there is a "Class": "path"
:: where path tells us which file the corresponding blueprint is in.
::
:: If we extract that blueprint as a json we can then pull out the
:: TextRenderComponent and find key/sourcestring that describes it,
:: which we can look up in the localisation files.
::
:: The filename will be the type without the _C + .uasset

:: Supraland blueprints are mostly in:
::Supraland/Content/Blueprints/Levelobjects/*.uasset
::Supraland/Content/Blueprints/PlayerMap/*.uasset

:: SIU blueprints are mostly in:
::SupralandSIU/Content/Blueprints/LevelObjects/Blueprints/*.uasset
::SupralandSIU/Content/Blueprints/PlayerMap/BP_UnlockMap.uasset
::SupralandSIU/Content/Blueprints/DLC2Quests/*.uasset
::SupralandSIU/Content/Blueprints/*.uasset

:: Supraworld blueprints are mostly in:
::Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/Levelobjects/
::Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/Core/
::Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/Abilities/LootPickups

:: Extract the blueprint json files to our temp directory
:: %CUE4Parse% %opt% -p Supraland/Content/Blueprints/Levelobjects/*

:: Move all the blueprint json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\bp" md "%gameout%\bp"
pushd "%gameout%\temp"
for /r %%i in ( *.json ) do move /Y %%i ..\bp >nul
popd
rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: Localisation Files

:sl_loc
:siu_loc
:sw_loc

echo Extracting localisation json files to %gameout%\loc

:: Unpack all the game specific localisation files
%CUE4Parse% %opt% -p */Localization/Game/*.locres -p */Localization/Game/*.locmeta

:: Move all the localisation json files into a single directory (keeping relative paths)
:: then delete the other files/directories
if not exist "%gameout%\loc" md "%gameout%\loc"
robocopy "%gameout%\temp\%gamename%\Content\Localization\Game" "%gameout%\loc" /s /move >nul
rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: Player Map Images

::-------------------------------------------------------------------------------------------------
:: Supraland Map Image Extraction (Crash has no in game map)
:sl_mapimg

echo Extracting map images, joining and copying to %mapimg%\slmap.png

:: Unpack all the map image textures
%CUE4Parse% %opt% -p Supraland/Content/Blueprints/PlayerMap/Textures/T_Downscale?.uasset

:: Move the extracted files to local store
set "mapimg=%gameout%\mapimg"
if not exist %mapimg% md %mapimg%
move>nul /Y  "%gameout%\temp\Supraland\Content\Blueprints\PlayerMap\Textures\T_Downscale*.png"  "%mapimg%"

:: Stitch the images into two rows and then stitch the rows into final image
magick "%mapimg%\T_Downscale0.png" "%mapimg%\T_Downscale1.png" +append "%mapimg%\row0.png"
magick "%mapimg%\T_Downscale2.png" "%mapimg%\T_Downscale3.png" +append "%mapimg%\row1.png"
magick "%mapimg%\row0.png" "%mapimg%\row1.png" -append "%mapimg%\slmap.png"

:: Delete source/intermediate files
del "%mapimg%\row*.png"
del "%mapimg%\T_Downscale*.png"
rd /s /q "%gameout%\temp"

goto :eof


::-------------------------------------------------------------------------------------------------
:: Supraland SIU Map Image Extraction
:siu_mapimg

echo Extracting map images, joining and copying to %mapimg%\siumap.png

:: Unpack all the map image textures
%CUE4Parse% %opt% -p SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV?Q?.uasset

:: Move them to the mapimg directory
set "mapimg=%gameout%\mapimg"
if not exist %mapimg% md %mapimg%
move>nul /Y  %gameout%\temp\SupralandSIU\Content\Blueprints\PlayerMap\Textures\T_SIUMapV?Q?.png "%mapimg%"

:: Stitch the images into rows and then rows into a final map
magick "%mapimg%\T_SIUMapV7Q0.png" "%mapimg%\T_SIUMapV7Q1.png" +append "%mapimg%\row0.png"
magick "%mapimg%\T_SIUMapV7Q2.png" "%mapimg%\T_SIUMapV7Q3.png" +append "%mapimg%\row1.png"
magick "%mapimg%\row0.png" "%mapimg%\row1.png" -append "%mapimg%\siumap.png"

:: Cleanup intermdiate/soure files
del "%mapimg%\row*.png"
del "%mapimg%\T_SIUMapV*.png"
rd /s /q "%gameout%\temp"

goto :eof


::-------------------------------------------------------------------------------------------------
:: Supraworld Map Image Extraction
:sw_mapimg

echo Extracting map images, joining and copying to %mapimg%\swmap.png

:: Unpack all the map image textures
%CUE4Parse% %opt% -p Supraworld/Plugins/Supra/PlayerMap/Content/Textures/T_SupraworldMapV?Q?.uasset

:: Move them to the mapimg directory
set "mapimg=%gameout%\mapimg"
if not exist "%mapimg%" md "%mapimg%"
move>nul /Y  "%gameout%\temp\Supraworld\Plugins\Supra\PlayerMap\Content\Textures\T_SupraworldMapV?Q?.hdr" "%mapimg%"

:: Convert HDR to PNG with gamma correction
:: set options= -gamma 2.2 -- too dark
set options=-colorspace RGB -auto-level -sigmoidal-contrast 3,0.5 -gamma 2.2

:: **** The 7 here might change with future releases
set "base=%mapimg%\T_SupraworldMapV7Q"

magick "%base%0.hdr" %options% "%mapimg%\out0.png"
magick "%base%1.hdr" %options% "%mapimg%\out1.png"
magick "%base%2.hdr" %options% "%mapimg%\out2.png"
magick "%base%3.hdr" %options% "%mapimg%\out3.png"

:: Stitch into rows and then join the rows together
magick "%mapimg%\out0.png" "%mapimg%\out1.png" +append "%mapimg%\row0.png"
magick "%mapimg%\out2.png" "%mapimg%\out3.png" +append "%mapimg%\row1.png"
magick "%mapimg%\row0.png" "%mapimg%\row1.png" -append "%mapimg%\swmap.png"

:: Cleanup intermediate files
del %mapimg%\out*.png
del %mapimg%\row*.png
del %base%*.hdr
rd /s /q %gameout%\temp

goto :eof


::=================================================================================================
:: Extract and convert to JSON all files in the PAK in \Enums\ directories 
:sl_enums
:siu_enums
:sw_enums
echo on
echo Outputting Enum .json files to %gameout%\*\Enums\ 

%CUE4Parse% %opt% -p */Enums/*.uasset -p Supraworld/Plugins/Supra/SupraCore/Content/Systems/Launch/ELaunchMode.uasset

:: Move all the enumeration json files into a single directory
:: then delete the other files/directories
if not exist "%gameout%\enums" md "%gameout%\enums"
pushd "%gameout%\temp"
for /r %%i in ( *.json ) do move /Y %%i ..\enums >nul
popd
rd /s /q "%gameout%\temp" 

goto :eof


::=================================================================================================
:: List the contents of the game PAK files
:sl_list
:siu_list
:sw_list

echo Outputting directory of %game% PAK files to %gameout%\gamefilelist.txt

%CUE4Parse% %opt% -l -p * >"%gameout%\gamefilelist.txt"

goto :eof
