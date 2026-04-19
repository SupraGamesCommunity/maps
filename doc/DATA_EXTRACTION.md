# Data Extraction

The data for the maps is a combination of user generated content overlayed over the raw data extracted from the Supraland games. Originally this was done by a python script, however Joric developed `CUE4Parse.CLI` to do the core extraction which makes things somewhat simpler.

I've based some of these instructions on Joric's SupraTools modding [wiki](https://github.com/joric/SupraTools/wiki#development)

These notes are largely focussed on the data preparation.


## Data preparation

### Step 1: Install the tools

See [BACK_END_DEVELOPMENT.md](BACKEND_DEVELOPMENT.md) and [FRONTEND_DEVELOPMENT.md](FRONTEND_DEVELOPMENT.md) for details.

### Step 2: Install the games

The data is extracted directly from the original game `PAK` files (compressed game data). So install the games that you want to work with via Steam. There's no particular reason they couldn't be done from another store but I've done no testing of this.

### Step 3: Find install directories

[VoidTools Everything](https://www.voidtools.com/downloads/) is a very fast and powerful file search tool that I highly recommend and includes a command line tool (ES.exe). If you install open a windows shell and then:

```sh
cd scripts
findslpaks.cmd
```

can be run to set up a bunch of environment variables pointing into the Supraland installation directories of SupraLand, Six Inches Under, SupraWorld, etc:

`SLROOT, SLDIR, SIUROOT, SIUDIR, SWROOT, SWDIR`

Which respectively point to the root install directory (e.g. `C:\Program Files (x86)\Steam\steamapps\common`) and the subdirectory containing the main PAK file.


### Step 3: generate `.usmap` for the games

The UE4 parser needs `mappings.usmap` to successfully extract the data, this can be done using the UE4SS-RE scripting plugin, you install it in the directory of the relevant game then run the game and use the tool to generate the mapping files.

First download `UE4SS...zip` file from the assets section on [this page](https://github.com/UE4SS-RE/RE-UE4SS/releases/tag/experimental-latest#assets).

Open the zip and copy the `dwmapi.dll` file and `ue4ss/` directory to the target game's `Binaries/Win64/` directory:

```
    $SLROOT%\Supraland\Binaries\Win64
    %SIUROOT%\SupralandSIU\Binaries\Win64
    %SWROOT%\Supraworld\Binaries\Win64
```

Open the `ue4ss\UE4SS-settings.ini` file and find/edit the fields to set the engine version (SL 4.26, SIU 4.27, SW 5.6) and enable the GUI console.

```
MajorVersion = 5              
MinorVersion = 6
GuiConsoleEnabled = 1
GuiConsoleVisible = 1
```

Then run the game. When the game launches an extra window will open, select the Dumpers tab and click "Generate `.usmap` file", which will spit out a `.usmap` file in the `ue4ss/` directory. Rename it and copy it to the scripts directory in maps project.

Quit the game, and zip up or delete the UE4SS directory to remove it. I've not found SupraWorld very stable with UE4SS installed.

I've generated and placed versions of these files in the repository source/{game}/, but they should be updated when new releases are made:

```
source/sl/Supraland.usmap
source/siu/SupralandSIU.usmap
source/sw/Supraworld.usmap
```


### Step 4: Extract map images and data

A version of CUE4Parse.exe is in the repository but you can download the latest version from [CUE4Parse.CLI](https://github.com/joric/CUE4Parse.CLI/releases/latest)

Run `findslpaks.cmd` to set up the environment variables.

Most of the extraction operations are wrapped up by [export.cmd](scripts/export.cmd) windows batch script.

This is run to extract and parse all the data from the games, operations are invoked with `export.cmd {sl|slc|siu|sw} {command}`.

You can run a step for multiple games or commands by listing them space in quotes. Thus `export "sl sw" list` will run the list command for SL and SW.

Intermediate data extracted from the game is stored in the `source/`directory and output data is written to the `data/` directory.

### Map Images

The raw map images can be extracted from the games and then broken up into tiles for the runtime.

__Supraland__: The Supraland map tiles can be extracted from the game however there is a polished version that can be found [here](https://github.comSupraGamesCommunity/reference/blob/main/Files/Images/Maps/SL/CleanedupPNG.png)

__Supraland Crash__: There was no map for SLC shipped with the game, Ben Vlogdi of Supra Games generated a custom one which was then customised, the final version can be found [here](https://github.com/SupraGamesCommunity/reference/blob/main/Files/Images/Maps/SLC/MapUpscaleFogged.png)

__Supraland SIU__: The SIU map can be extracted from the game and the live map uses it unmodified. A copy can be found [here](https://github.com/SupraGamesCommunity/reference/blob/main/Files/Images/Maps/SIU/OriginalPNG.png)

__Supraworld__: As SW is changing with each release, the SW map must be extracted from the game each time it updates and then fog applied to hide the unreleased areas of the map, and to help with hiding map objects.

### Extracting Map Images

To extract the map image, for example for Supraworld:

```sh
export sw mapimg
```

This pulls the latest version of the map tiles and uses image magick to recolour, upscale and assemble them into an 8k x 8k PNG and places the result in `source/sw/mapimg/swmap.png`.

#### Applying Fog

You can extract fog from a Supraworld save file using `export sw getfog {save name}` which will output 8k `swmapfog.png` and 2k `swmapfog-2k.png` to `source/sw/mapimg`.

You may then edit the 8k version to customise the fog before applying it to mask out the areas of the original map that have yet to be released.

```sh
export sw applyfog
```
To apply `swmapfog.png` to `swmap.png` and generate `source/sw/mapimg/swmap-fogged.png`.

If the 2k version is renamed to `swmapfog-ea.png` then it will be used to filter out objects extracted from the game so they will not be added to the map.

#### Generating Tiles

Once a fullscale map has been downloaded, generated or created it should be copied to `source\{game}map-final.png` and then can be used to generate the tiles needed by the front end.

```sh
export sw gentiles
```
which splits the `png` into a hierarchy of `jpg` tiles in the   `public/tiles` directory which should be added to source control when major changes are made.


### Data Extraction

To generate the marker data we extract three types of `.uasset`  file from the game and convert them to `.json`.

- __souce/{game}/levels__ Level files contain all the instance data for the objects in the game.
- __source/{game}/bp__ Blueprint files contain class data and scripts for the objects.
- __source/{game}/enums__ Enum files allow us translate enumerations to human readable form 
- __source/{game}/loc__  Localisation data

We also generate some intermediate files:
- __gamefileslist.txt__ is a directory of all files found in the game install directory/PAKs
- __areanames.txt__ lists all the levels we find
- __bpassetlist.txt__ lists all the blueprints we are using
- __enumassetlist.txt__ lists all the enumeration blueprints we find
- __levelprops.json__ lists the properties found in the level files

Extracting the data is a multi-step process:

1. Generate a list of all the files (`export sw list`)
2. Extract the level files (`export sw levels`)
3. Preprocess level files (`export sw preproc`)
4. Extract enums and blueprints found in levels (`export sw "bp enums")
5. Update level files with enum mappings (`export sw preproc`)
6. Extract the map markers (`export sw markers`)
7. Extract the raw localisation data (`export sw loc`)
8. Apply the localisation data (`export sw applyloc`)

You can also use `export sw parse {arguments}` run CUE4Parse.exe and extract additional files to `source/{game}/parse` 

The `all` command will run all these steps sequentially:

```sh
export sw all
```

A few notes:
- The extraction process reads gameClasses.json to decide which classes we are interested in and ignores anything else.
- We write localisation keys to gameClasses.json during the _applyloc_ step. 
- For SW we filter out anything marked as beyond current EA release and anything in the black regions of swmapfog-ea.png.
- The enums translation is required for successful extraction of markers
- We read the blueprint files to find default values for some things (and for localisation).
- For SW we get the version number in the preproc step

- ___Steps 5 , 7 and 8 are currently incomplete___
- ___SL, SLC, SIU map extraction is in an unknown state whilst updates are made for SW___
