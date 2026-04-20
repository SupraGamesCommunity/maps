# Architecture

This document provides an overview of the how the code and data are structured and the different processes involved. 

## Overview

This project provides online interactive maps for the Supraland family of games. A backend tool is used to extract data from the game data files and prepare it for display. The frontend reads the prepared data, combines it with user generated customisations and displays the result.

This leads to four independent scenarios for working with the map.

__Data Extraction__: Updating the data extracted from the games when new releases are made. This largely only affects Supraworld now as the other games are stable. The process requires a windows system with the steam game installed and the tools setup. It is mostly a question of running scripts.

__Editing Data__: With the data extracted it is possible to customise it, adding/removing objects, adding youtube links, comments or customising descriptions and icons. It is also possible to customisethe localisation data. This involves using some basic tools in the site itself and a text editor.

__Backend Development__: The backend is mostly python and windows batch scripts plus some utilities using node.js. It is most easily worked with using VS Code but any python development environment will work.

__Frontend Development__: The frontend is JS and HTML with some tools to automate installation and distribution. Again VS Code is a good environment but any JS dev tools will work.

See the [README](../README.md) for list of documentation of these elements.

## File structure overview

```
/                       SupraGamesCommunity maps project repository root. Includes mostly configuration files plus
                        the license, readme and the main website index.html
    dist/               When the production site is built, all front-end assets (HTML, CSS, JavaScript) are placed into
                        this directory for distribution.
    doc/                Documentation.
    LOC/                Complete extracted localisation strings (should be removed).
    public/             Static files. Anything under this directory is delivered 'as-is' to the browser, and are never
                        modified by the Vite local server. Vite serves this directory as if it was from the server's
                        root `/`.
        data/               JSON files describing map elements (markers, icons, layers etc).
            loc/            Localisation strings for each language supported.
        images/         Images required by 3rd party libraries (mostly leaflet).
        img/            Images used by frontend
            markers/    PNG and SVG images used for map marker icons
        js/             Unmodified JavaScript. This directory is typically used for 3rd-party libraries and/or
                        JavaScript that is not compatible with ES6 modules. It is not optimized by Vite.
            lib/        3rd party front end scripts
        tiles/          Map tile hierarchy for each game. Each tile is a 512x512 jpg
                            {sl|slc|siu}/{base}/{z}/{x}/{y}.jpg
                            where z=zoom [0-4] x/y tile pos within map
                                Full maps are 8k. Zoom 0 is 1x1 - Zoom 4 is 16x16
    scripts/            Tool and scripts for extracting/preparing data for frontend
    source/             Data extracted from the game is placed here temporarily each game (sl/siu/sw) has it's own
                        subdirectory. For convenience a few files are under source control but mostly it is
                        intermediate data. 
    web_src/            JavaScript, CSS, and other web assets. Unlike the public/ directory above, the contents of this
                        directory are transformed by Vite to transpile, minify, and cache source files
        css/            Frontend source CSS 
        lib/            Frontend libraries built from source

    node_modules/       Development-only. Stores tools and libraries. Should not be committed to the codebase.
    venv/               Development-only. Python virtual environment. Should not be committed to the codebase.
```

## Coordinate Systems

Unreal uses a left-handed coordinate system with X forward, Y right and Z up.

The backend python uses the blender based mathlib which is right right-handed X right, Y forward and Z up. This normally has minimal impact but particular care is needed when dealing with rotations.

The map frontend uses leaflet which normally works in latitude (lat or Y) and longitude (lng or X). Generally working in image coordinates.

The map coordinates ranges are pretty large - see [layerConfigs](..\public\data\layerConfigs.json) for the different map bounds.

## Leaflet

[Leaflet](https://leafletjs.com/index.html) is an open-source JS library for mobile friendly interactive maps. Much of the terminology used in code and data comes from this library.

- _marker_ - clickable icons on the map
- _layer_  - components of the map

## Save Games Format
The Supraland games use the Unreal SAV format for the save games, it is not well documented but some information can be found in various public projects such as [this one](https://github.com/CrystalFerrai/UeSaveGame).

For the Supraland, Crash and SIU save game loader was written by reverse engineering some of the file format.

Supraworld is based on UE5.6 and the SAV format then on an updated version of the SAV format. Rather than update the reader to the new format the first implementation just looks for raw strings in the save file.

## Unreal Game Format
[CUE4Parse](https://github.com/FabianFG/CUE4Parse) is a parsing library designed specifically for extracting data from archives and packages generated by Unreal Engine 4 and 5 and is maintained by the maintained by the [FModel team](https://github.com/4sval/FModel).

There's a fair overlap between the save game format and the fmodel format.

The tools backend uses CUE4Parse.CLI, a command line wrapper for the CUE4Parse library written by Joric.

## Key Data Files

The frontend reads JSON files from the data directory:

- __layerConfigs.json__ configures the categories/groups and the base map data.
- __iconConfigs.json__ configures the icons used on the map.
- __gameClasses.json__ configures the different types of objects that the map deals with and how to display them (written to to add localisation).
- __markers.{game}.json__ hold the extracted data from the game about each marker on the map (written to by extraction).
- __custom-markers.{game}.json__ allows customisations to be applied to the extracted data, overriding or deleting markers or marker fields.
- __ytdata.{game}.json__ is the same as `custom-markers` but it intended to be used to add YouTube links to the map maerkes.

- __custom-loc.json__ can be used to customise the localisation data extracted from the game and included in gameClasses.json.
- __loc/locstr-{lang}.json__ are the stripped down localisation strings extracted from the game and associated with each type of object (see localisation).

