@echo off

set TILES=
set MAP=

if "%~1"=="sl" call :sl_tiles
if "%~1"=="slc" call :slc_tiles
if "%~1"=="siu" call :siu_tiles
if "%~1"=="sw" call :sw_tiles

if "%TILES%"=="" (
 echo Choose game to make tiles for: sl, slc, siu or sw
 exit /b
)

if not exist %TILES% mkdir %TILES%
if not exist %TILES%\base mkdir %TILES%\base

python gentiles.py -t jpg -w 512 %MAP% 0-4 %TILES%

:sl_tiles
set TILES=..\tiles\sl\base
set MAP=..\source\slmap-final.png
goto :eof

:slc_tiles
set TILES=..\tiles\slc\base
set MAP=..\source\slcmap-final.png
goto :eof

:siu_tiles
set TILES=..\tiles\siu\base
set MAP=..\source\siumap-final.png
goto :eof

:sw_tiles
set TILES=..\tiles\sw\base
set MAP=..\source\swmap-final.png
goto :eof

