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
* (Optional) Install [Visual Studio Code](https://code.visualstudio.com/download)

Note: on MacOS, it may be more convenient to use methods like [Homebrew](https://brew.sh) to install tools,
e.g. with `brew install node`, or `brew install uv`.

Note: See separate notes on convenient setup/extensions to use with VS Code

2. Install libraries

Run `uv sync`. This will download a compatible Python binary (if necessary), and create a `.venv` directory
to store the Python virtual environment. (This directory is not intended to be committed to the codebase.)


## File structure overview

```
/                       SupraGamesCommunity Maps repository directory
|                           into this directory for distribution.
+-- doc/                Documentation
+-- LOC/                Complete extracted localisation strings (should be removed)
+-- public/             Static files. Anythin under this directory is delivered 'as-is' to the browser, and are
|   |                       never modified by the Vite local server. Vite serves this directory as if it was from the
|   |                       server's root `/`.
|   +-- data/           JSON files describing map elements (Pins, Icons etc).
|   |   +-- loc/        Localisation strings for each language supported
|   +-- images/         Images required by 3rd party libraries (mostly leaflet)
|   +-- img/            Images used by frontend
|   +-- markers/        Images used for map marker icons
|   +-- js/             Unmodified JavaScript. This directory is typically used for 3rd-party libraries and/or
|   |   |                   JavaScript that is not compatible with ES6 modules. It is not optimized by Vite.
|   |   +-- lib/        3rd party front end scripts
|   +-- tiles/          Map tile hierarchy for each game. Each tile is a 512x512 jpg
|                           {sl|slc|siu}/{base}/{z}/{x}/{y}.jpg
|                           where z=zoom [0-4] x/y tile pos within map
|                           Full maps are 8k. Zoom 0 is 1x1 - Zoom 4 is 16x16
+-- scripts/                Tool scripts for extracting/preparing data for frontend
|  +-- findslpaks.cmd      Helper script to locate game install directories and set environment variables
|  +-- export.cmd          CLI script used to extract and parse data from the game
|  +-- supraland_parser.py Script to extract map data from Supraland UE4 games
|                           Options for raw data, markers and map textures
+-- source/             Data extracted from the game is placed here temporarily (mostly not under source control)
|                           see notes on running builds.
+-- web_src/            JavaScript, CSS, and other web assets. Unlike the public/ directory above, the contents
|                           of this directory are transformed by Vite to transpile, minify, and cache source files
+-- css/                Frontend source CSS 
+-- lib/                Frontend libraries built from source

+-- dist/               When the production site is built, all front-end assets (HTML, CSS, JavaScript) are placed.
+-- node_modules/       Development-only. Stores tools and libraries. Should not be committed to the codebase.
+-- .venv/              Development-only. Python virtual environment. Should not be committed to the codebase.
```

## Running Windows Scripts

Scripts are written for Windows CMD.exe and expect the tools (above) to be installed.

The main extraction scripts use [CUE4Parse.exe](https://github.com/joric/CUE4Parse.CLI) which is included.

Most of the scripts rely on environment variables set up by findslpaks.cmd.

It would likely be possible to run them under Wine (https://gitlab.winehq.org/wine/wine/-/wikis/Download)

I recommend [Windows Terminal](https://apps.microsoft.com/detail/9n0dx20hk701) or VS Code terminal.
```sh
Open Terminal
cd {maps root path}/scripts
findslpaks
export /h
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


## Auto-formatting and linting Python scripts

To automatically format Python scripts in a consistent way, run:

```sh
# Use Python Black to reformat Python source code
uv run black scripts/*.py

# Use isort to sort imports in a consistent way
uv run isort scripts/*.py
```


Run the flake8 linter over the Python scripts to find common problems with Python code:

```sh
uv run flake8 scripts/*.py
```


## Running Node.JS Scripts

The Node.JS scripts are generally non-essential utility functions for testing, investigations and debugging. 

```sh
cd {maps root path}/scripts
findslpaks
node {some script.js} argument1 argument2 ...
```

## Auto-formatting JS scripts

?

