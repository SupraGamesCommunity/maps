@echo off
if "%1"=="sl" set files=%tmp%\T_Downscale*.png
if "%1"=="siu" set files=%tmp%\T_SIUMapV7Q*.png
if not "%files%"=="" goto JOIN

echo Usage: join {sl|siu}

exit /b

:JOIN
echo Joining %files%... into %1map.png
magick montage %files% -geometry +0+0 %1map.png 


