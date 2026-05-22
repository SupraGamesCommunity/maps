@echo off

setlocal enabledelayedexpansion

cd %~dp0

call export sw setup
call export sw mapimg
call export sw markers

copy ..\source\sw\mapimg\swmapfog-ea.png ..\source\sw\mapimg\swmapfog.png

call export sw applyfog

move ..\source\sw\mapimg\swmap-fogged.png ..\source\sw\mapimg\swmap-final.png

export sw gentiles

endlocal
