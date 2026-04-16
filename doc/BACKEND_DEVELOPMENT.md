# Backend development

This document describes how to setup your local environment for developing and running
the backend tools that extract and process the maps.


## Back-end dev tools & libraries used in this project

The original maps were extracted using [UE4Parse](https://github.com/MinshuG/pyUE4Parse), a Python library by [MountainFlash](https://github.com/MinshuG/). With Supraworld it was updated to use [CUE4Parse.CLI](https://github.com/joric/CUE4Parse.CLI) which is based on CUE4Parse a much more up to date reader of UE data.
Many marker icons supplied by DavidM from game assets and others made by the community.


### Tools

* [Node.js](https://nodejs.org): Local JavaScript execution engine, including the NPM package manager.
* [Python](https://www.python.org/): Python language
* [uv](https://docs.astral.sh/uv/): Python runtime & package manager.
* [ImageMagick](https://imagemagick.org/index.php): image manipulation.
* [Voidtools: Everything](https://www.voidtools.com/downloads/): (Optional) fast file search.


### Libraries

* [UE4Parse](https://github.com/MinshuG/pyUE4Parse) - UE4 PAK file reader for Python.
* [joric/UE4Parse](https://github.com/joric/pyUE4Parse.git) - Joric's fork of the UE4 parse (modified).
* [joric/CUE4Parse.CLI](https://github.com/joric/CUE4Parse.CLI)
* [gentiles.py](https://github.com/danizen/campaign-map/blob/master/gentiles.py) from [Jeff Thompson](jeffreythomson.org), [Dan Davis](danizen.net) and [Joric](https://github.com/joric/)


# Development guide

This section explains how to make changes to the back-end source code.


## One-time setup

This section is a guide to setting up your local front-end development environment. You should only need to do
this once.

1. Install tools

* Follow [Node's installation guide](https://nodejs.org/en/download).
* Follow [UV's installation guide](https://docs.astral.sh/uv/getting-started/installation/).
* Follow [Imagemackick's installation guide](https://imagemagick.org/script/download.php#windows).
* (Optional) (Windows only) Install [Voidtools: Everything](https://www.voidtools.com/downloads/) to speed
  up some scripts.

Note that on MacOS, it may be more convenient to use methods like [Homebrew](https://brew.sh) to install tools,
e.g. with `brew install node`, or `brew install uv`.


2. Install libraries

Run `uv sync`. This will download a compatible Python binary (if necessary), and create a `.venv` directory
to store the Python virtual environment. (This directory is not intended to be committed to the codebase.)


## File structure overview

```
public/tiles/           Map tile hierarchy for each game. Each tile is a 512x512 jpg
                        {sl|slc|siu}/{base}/{z}/{x}/{y}.jpg
                        where z=zoom [0-4] x/y tile pos within map
                        Full maps are 8k. Zoom 0 is 1x1 - Zoom 4 is 16x16

scripts/                Utility scripts for working with the backend data.
    gentiles.py			    Generates map tile hierarchy from a full resolution map image.
    run.cmd             CLI script to help launch supraland_parser.py
    supraland_parser.py Script to extract map data from Supraland UE4 games
                        Options for raw data, markers and map textures
    gentiles.py         Utility to split large map into hierarchy of tiles suitable for Leaflet TileLayer.
    findslpaks.cmd      Helper script to locate game install directories and set environment variables
```


## Running Python scripts

There are 2 methods to run the various Python scripts:

### Method 1 (recommended)

`uv run scripts/some_script.py argument1 argument2 ...`

With this method, `uv` will ensure the environment is prepared to run the script, including downloading an appropriate
version of Python (if necessary), creating the Virtual Environment (venv), activating it, and installing dependencies.

### Method 2 (manual)

To manually install your environment and run a script:

```sh
# Ensure an appropriate Python version is available.
uv python install

# Create the virtual environment and install dependencies.
uv sync

# Activate the venv
source .venv/bin/activate

python scripts/some_script.py argument1 argument2 ...
```


## Auto-formatting Python scripts

To automatically format Python scripts in a consistent way, run:

```sh
# Use Python Black to reformat Python source code
uv run black scripts/*.py

# Use isort to sort imports in a consistent way
uv run isort scripts/*.py
```
