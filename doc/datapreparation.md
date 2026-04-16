## SupraGames community map development

The data for the maps is a combination of user generated content overlayed over
the raw data extracted from the Supraland games. Originally this was done by a
python script, however Joric developed `CUE4Parse.CLI` to do the core extraction
which makes things somewhat simpler.

I've based some of these instructions on Joric's SupraTools modding wiki:
https://github.com/joric/SupraTools/wiki#development

These notes are largely focussed on the data preparation.


## Data preparation

### Step 1: Install the games

The data is extracted directly from the original game `PAK` files (compressed
game data). So step 1 is to install the games that you want to work with via Steam.
There's no particular reason they couldn't be done from another store but I've done
no testing of this.


### Step 2: Find install directories

[VoidTools Everything](https://www.voidtools.com/downloads/) is a very fast
and powerful file search tool that I highly recommend and includes a command
line tool (ES.exe). If you install it then:

```sh
scripts/findslpaks.cmd
```

can be run to set up a bunch of environment variables pointing into the Supraland
installation directories of SupraLand, Six Inches Under, SupraWorld, etc:

`SLROOT, SLDIR, SIUROOT, SIUDIR, SWROOT, SWDIR`

Which respectively point to the root install directory (e.g. `C:\Program Files (x86)\Steam\steamapps\common`)
and the subdirectory containing the main PAK file.


### Step 3: generate `.usmap` for the games

The UE4 parser needs `mappings.usmap` to successfully extract the data, this can be
done using the UE4SS-RE scripting plugin, you install it in the directory of the
relevant game then run the game and use the tool to generate the mapping files.

First download `UE4SS...zip` file from the assets section on
[this page](https://github.com/UE4SS-RE/RE-UE4SS/releases/tag/experimental-latest#assets).

Open the zip and copy the `dwmapi.dll` file and `ue4ss/` directory to the target game's
`Binaries/Win64/` directory:

```
    $SLROOT%\Supraland\Binaries\Win64
    %SIUROOT%\SupralandSIU\Binaries\Win64
    %SWROOT%\Supraworld\Binaries\Win64
```

Open the `ue4ss\UE4SS-settings.ini` file and find/edit the fields to set the
engine version (SL 4.26, SIU 4.27, SW 5.6) and enable the GUI console.

```
MajorVersion = 5              
MinorVersion = 6
GuiConsoleEnabled = 1
GuiConsoleVisible = 1
```

Then run the game. When the game launches an extra window will open, select the Dumpers
tab and click "Generate `.usmap` file", which will spit out a `.usmap` file in the `ue4ss/`
directory. Rename it and copy it to the scripts directory in maps project.

Quit the game, and zip up or delete the UE4SS directory to remove it. I've not found
SupraWorld very stable with UE4SS installed.

I've generated and placed versions of these files in the repository scripts/source:

```
Supraland.usmap
SupralandSIU.usmap
Supraworld.usmap
```


### Step 4: Extract map images and data

Download the latest version of CUE4Parse.CLI and put the exe in the scripts directory:
https://github.com/joric/CUE4Parse.CLI/releases/latest

You will also want to install ImageMagick and VoidTools Everything:
https://imagemagick.org/script/download.php
https://www.voidtools.com/downloads/

Then run `findslpaks.cmd` to set up the environment variables.

The run `export.cmd {sl|slc|siu|sw}` to extract the map layout and images. The script
will convert and merge the extracted map tiles into a single big png.

It's worth noting there was no Crash map so that was generated from the game with the
help of the dev team, and the raw maps have in some cases been tweaked to improve them.
These improved images can be found here:

https://github.com/SupraGamesCommunity/reference

Once the map images have been generated or downloaded into the scripts/source
directory, then they have to be split into a hierarchy of LoD tiles. This is done with
`make_tiles.cmd`:

`make_tiles {sl|slc|siu|sw}`

which if run in the scripts directory will create the tile hierarchy from the relevant
map ({game}map.png). The tiles are stored as jpg to help loading speed.

In addition to the map images the data extractor generates a set of json files listing
all the objects and their positions etc. These files are 100s of Mb in size and need
some tidying up, so we have a python script that pre-processes this data and cleans it
up.


### Step 5: Run-time map data generation

The previous export step puts the game data in ExtractData as a series of .json files.

Extract blueprint uasset files -> json

Supraland/Content/Localization/Game/{lang}/Game.locres

```
SL Example: BuyGraveDetector_C in Supraland\Content\Blueprints\BuyGraveDetector.json
Supraland/Content/Localization/Game/

TextRenderComponent

Coin

Egg

Gift Box
Random Loot

Solver's Guide Page

Secret Area

Hay
Spool of Thread

Carriables:
   AAA Battery
   Aluminium Ball
   Barrel
   Button Battery
   Chocolate Egg
   Clothing Button
   Construction Hat
   Cork
   Corn
   Spider
```


Run `findslpaks.cmd` to locate your installs of the games and set environment variables
to point at them.

Run `export.cmd` to pull the data out of the packs. A normal sequence would be

To pull out and assemble the map image files: export all mappimg
Then put the maps you actually want to use into "source" directory and use: `make_tiles {game}`
to generate the tiled versions in the relevant directory.

To extract the level data use:
export all levels
uv run supraland_parse.py preproc`

The get the blueprints and enums that are used, and all the localisation data:
export all "bp enums loc"

Optionally run the preprocessor again to remap the enums used in the level files:
`uv run supraland_parse.py preproc`

Generate the marker data
Generate the localisation data

To add a new class to what gets extracted add it to gameClasses.json
