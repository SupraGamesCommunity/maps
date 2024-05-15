# SupraMaps

* Live map: https://supragamescommunity.github.io/SupraMaps/

Joric: I didn't do much, all credit goes to [David Münnich](http://www.david-m.org) and [Supra Games Community](https://github.com/supragamescommunity).

## Features

* Supports all games (Supraland, Supraland Crash, Supraland Six Inches Under) and map position/zoom in URL.
* Supports save file uploading to show/hide items you collected (or not collected yet) for all games.
* Accurate and complete item map, ripped from data files (not crowdsourced, see [scripts](https://github.com/joric/supraland/tree/main/scripts) directory).

## Assets

FModel did not work for large maps, so I ended up using a wonderful [UE4Parse](https://github.com/MinshuG/pyUE4Parse) Python library by MountainFlash.

The base map for Six Inches Under is DLC2_Complete.umap, it includes all other submaps internally (look for "LevelTransform" keys).
The base map size is also included in this umap (look for "MapWorldSize").

Supraland Crash doesn't have a map in resources so it was captured in the game engine (not by me) in 2048x2048
([raw_image](https://github.com/SupraGamesCommunity/map-slc/blob/11dc702ece83254fe1de1a567c3c3b890147f95d/img/map.jpg)) 
and then upscaled to 8192x8192. It's probably possible to upscale other maps as well, say to 32768x32768 (4x) with something
like [Upscayl](https://upscayl.github.io) but it's quite slow and the size will be 16x (~256 megs for 3 maps).

## License

This project is an unlicensed public domain, feel free to copy, sell and modify.

## References

* https://github.com/supragamescommunity
* https://github.com/MinshuG/pyUE4Parse
