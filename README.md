# SupraMaps

* Interactive maps for Supraland, Supraland Crash (DLC) and Supraland: Six Inches Under

* Repository: https://github.com/SupraGamesCommunity/SupraMaps
* Live map: https://supragamescommunity.github.io/SupraMaps/

# Credits

All credit for these amazing games goes to [David Münnich](http://www.david-m.org) and the [Supra Games Team](https://store.steampowered.com/developer/SupraGames)
Original maps and data created by [Supra Games Community](https://github.com/supragamescommunity)
Complete rewrite based on game data extraction and merge of 3 maps by Joric (https://github.com/joric/supraland) 
Fork of Joric's map to SupraMaps project and tweaks to finish in preparation for Supra World by [Supra Games Community]

Credits:
   Cal, Egasuas, Joric, Jules, KoenigsKind, LewisPattJr

Additional support from: 
  Anna, BenVlodgi, David, Norabseven, TJ999M and Zookster 

# Features

* Supports all games (Supraland, Supraland Crash, Supraland Six Inches Under) and map location URLs.
* Supports save file uploading to show/hide items you collected (or not collected yet) for all games.
* Crash Map kindly exported by BenVlodgi and upscaled/fogged by Egasuas
* Game maps and items extracted from game data files see [scripts](https://github.com/SupraGamesCommunity/SupraMaps/tree/main/scripts) directory)

# Assets and Dependencies

FModel did not work for large maps, Joric ended up using a wonderful [UE4Parse](https://github.com/MinshuG/pyUE4Parse) Python library by MountainFlash.
Many marker icons supplied by DavidM from game assets and others made by the community 

L.Control.FullScreen (https://github.com/brunob/leaflet.fullscreen) - Adds fullscreen button to leaflet map.
L.Control.MousePosition (https://github.com/ardhi/Leaflet.MousePosition) - Displays mouse XY map position on a leaflet map.
L.TileLayer.Canvas (https://github.com/GIAPspzoo/L.TileLayer.Canvas) - Leaflet extension to use map tile hierarchy.
leaflet-hash (https://github.com/mlevans/leaflet-hash) - Add dynamic URL hashes to web pages with Leaflet maps (modified).
leaflet-search (https://github.com/stefanocudini/leaflet-search) - search icon for leaflet maps.
leaflet (https://leafletjs.com/) - A javascript library for interactive maps.
leaflet.toolbar (https://github.com/Leaflet/Leaflet.toolbar) -  flexible, extensible toolbar interfaces for Leaflet maps.
papaparse (https://github.com/mholt/PapaParse) - Fast CSV reading.
UE4Parse (https://github.com/MinshuG/pyUE4Parse) - UE4 PAK file reader for Python.
Joric's UE4Parse (https://github.com/joric/pyUE4Parse.git) - Joric's fork of the UE4 parse (modified)
gentiles.py from Jeff Thompson (jeffreythomson.org), Dan Davis (danizen.net) and Joric (https://github.com/danizen/campaign-map/blob/master/gentiles.py)

ImageMagick (https://imagemagick.org/index.php) - command line image manipulation.
Voidtools Everything (https://www.voidtools.com/downloads/) - fast file search.

# License

This project uses some code Joric's Supraland project, the original SupraGamesCommunity map code and media files. Most of the media content is copyrighted by David Münnich. Joric developed scripts to import data from the original game and fixed some bugs. This project is an unlicensed public domain, feel free to copy, sell and modify.

See See [LICENSE](https://github.com/SupraGamesCommunity/SupraMaps/blob/main/LICENSE) for details.

# Other Maps

https://supragamescommunity.github.io/map-sl (Supraland)
https://supragamescommunity.github.io/map-slc (Supraland Crash)
https://supragamescommunity.github.io/map-siu (Supraland Six Inches Under)
https://joric.github.io/supraland (Joric's combined map)

# How to use documentation

## Map linking URL

The current map can be found here:

https://supragamescommunity.github.io/SupraMaps

You can link to individual maps by adding #{map id} (one of sl, slc or siu), for example:

https://supragamescommunity.github.io/SupraMaps#sl
https://supragamescommunity.github.io/SupraMaps/#siu

In addition you can share a link to a specific map, zoom level and position:

https://supragamescommunity.github.io/SupraMaps/#{zoom}/{lat}/{lng}/{map}

zoom is 0-4 where 0 is all the way zoomed out
lat/lng are the X Y position on the map
map is one of sl, slc or siu


# Technical Documentation

See [technicalnotes.md](https://github.com/SupraGamesCommunity/SupraMaps/blob/main/doc/technicalnotes.md)
