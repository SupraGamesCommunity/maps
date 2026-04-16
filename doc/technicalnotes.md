# Technical Notes

## Map Tile and Data Extraction

### General usage

Make sure you've got SupraLand (SL) / Six Inches Under (SIU) installed.
Open a command prompt with `/scripts` as the current working directory.

First run 'findslpaks' to locate the game install directories and
set some environment variables. If you don't have 'Voidtools: Everything' installed
it will look in `C:\Program Files (X86)\steam`. If your versions are
elsewhere then just do `findslpaks {path to search}`. It can be just `{drive}:`
(don't add trailing `\` to path).

To use the extraction python script use the 'run' batch file, it prompts
for different options.


### Extracting Maps and Generating Tiles

The command sequence would be something like this:

```
findslpaks         # sets up environment
run                # selecting Game then Textures
```

By default it will put the extracted map textures in `%tmp%`. They consist
of 4 4096x4096 tiles which need to be merged.

```sh
magick montage %tmp%\T_Downscale*.png -tile 2x2 -geometry +0+0 slmap.jpg
magick montage %tmp%\T_SIUMapV7Q*.png -tile 2x2 -geometry +0+0 siumap.jpg
```

As there's no in-game map for Crash that so that needs a copy of the latest
community one. `run.cmd` expects this to be called `slcmap.jpg`

You can then generate the map tile hierarchy:

```
run					# select Game then Generate tiles
```

This outputs the hierarchy of tiles to `tiles_dir/` so the contents is then
copied to the relevant `\tiles\{game}\base` directory.

In addition Supraland has tiles\sl\pads|pipes containing tiled versions of
the full size PNGs showing the routes/locations of jumppads and pipes. These
can be generated similarly to the crash tiles if required.

Note on quality: The `gentiles.py` script currently saves as JPG with low-ish
quality settings which can lead to compression artifacts. This can be changed
by editing the script and finding these lines:

```
    #tile.save(tile_path, quality=95)
    tile.save(tile_path)
```

Changing the quality will affect file sizes and thus the repository and the
performance characteristics of the map. Going from the default to 95 will
approximately double the map file sizes.


### Generating Marker Data

This is a two step process. As above use `findslpaks` to set the directory
environment variables, then the `run` command. First to extract all the
`levels` data to the `%tmp%` directory (`map.json`), and then the second step to
actually build the marker file (`markers.{game}.json`). Internally the script
has a list of classes we're interested in and dumps the instances with the
following properties (if available):

```
  name			  Name of the instance
  type			  Name of the class it instances
  area			  Level / map it is attached to
  lat,lng,alt	3D position (x,y,z)
  coins			  Number of coins
  cost			  Cost to buy
  spawns		  What it spawns
  hits			  Hits to break
  obsidian    Obsidian?
  price_type  "scrap" or "bones" for cost instead of coins
```

The name is often the type with `_C` removed and a number added.


## Custom Data and Legacy Data

In addition to the extracted data tha map has a number of custom data files
that control behaviour and it also pulls data from copies of files taken from
the original community maps.

`layers.csv` says which layers (marker: what the UI should call them and the default icon.

`types.csv` is a mapping from instance class to the marker icon that should
be used to display it, the layer it should be displayed on and the spoiler layer.
If icon is not specified default (or ?) icon will be used. If layer is not
specified then 'extra' will be used.

`custom-markers.{game}.json` are files which custom markers can be added using the
same format as the extracted data. Custom classes could be added with unique icons
such as for the coins stashes from SIU.

The legacy files are assumed to be one for each layer, named from the `layers.csv` id.
So when displaying a marker of id, shops, the map will search `shops.csv` for an
object with the same position as the marker it is displaying. If found it will
extract the corresponding data (such as YouTube video). At this time it would be
`chests.csv`, `collectables.csv` and `shops.csv` that would be looked at.

Note that coinstash in SIU legacy files and some other data were hand entered
so may not map to extracted data. In particular coinstash are represented as just
loads of coins in SIU.

* https://github.com/joric/viva-games

* Front end tools
* USMAP files
* Fog and SW Map
* SLC Map

