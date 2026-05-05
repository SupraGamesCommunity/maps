# Editing Data

## Setup

See section in [One Time Setup](./BACKEND_DEVELOPMENT.md) in BACKEND_DEVELOPMENT.md

See [CONTRIBUTING.md](CONTRIBUTING.md) on how to make your own fork of the repository.

### Choose a JSON Editor
Any editor will work but I recommend: Notepad++ or VS Code

## Data Files

### Layers / Categories
[layerConfigs.json](../public/data/layerConfigs.json)

Describes the base map layers, categories and toggleable layer groups displayed on the map.

### Classes
[gameClasses.json](../public/data/gameClasses.json)

Describes the marker types and how they are displayed.

friendly:
category:
nospoiler:
icon:
games:    [ "sl", "slc", "siu", "sw" ] which games use this class
setfound: true | false | not set - true marker is always found, false never found, not set => toggleable

### Icons
[iconConfigs.json](../public/data/iconConfigs.json)

Describes the marker icons and how they are to be rendered during the build.

See [ICON_CONFIG.md](ICON_CONFIG.md)

### Markers
- Supraland Marker Data:
    - [Game Extracted Markers](../public/data/markers.sl.json) - do not edit
    - [User Marker Customisations](../public/data/custom-markers.sl.json)
    - [YouTube Links for Markers](../public/data/ytdata.sl.json)
- Supraland: Crash Marker Data
    - [Game Extracted Markers](../public/data/markers.slc.json) - do not edit
    - [User Marker Customisations](../public/data/custom-markers.slc.json)
    - [YouTube Links for Markers](../public/data/ytdata.slc.json)
- Supraland: Six Inches Under Marker Data
    - [Game Extracted Markers](../public/data/markers.siu.json) - do not edit
    - [User Marker Customisations](../public/data/custom-markers.siu.json)
    - [YouTube Links for Markers](../public/data/ytdata.siu.json)
- Supraworld Marker Data
    - [Game Extracted Markers](../public/data/markers.sw.json) - do not edit
    - [User Marker Customisations](../public/data/custom-markers.sw.json)
    - [YouTube Links for Markers](../public/data/ytdata.sw.json)

Describes all the markers/pins that are to appear on the map. The base extracted markers are loaded first and then the custom data is loaded and modifies the base data. This means you can customise all the markers without changing the base data.

The base marker data is extracted from the game into [this](../public/data) see [DATA_EXTRACTION.md](./DATA_EXTRACTION.md).

The marker data are json files with arrays of property sets. Each marker instance is uniquely identified by "{area}:{name}". Any entries with matching "{area}:{name}" will be overwritten with any changes.

```
  area			  Level / map it is attached to (required)
  name			  Name of the instance (required)
  type			  Name of the class it instances - controls icon, friendly name etc
  lat,lng,alt	3D position (y,x,z) - lat is up down, lng left to right, alt is Z/Altitude
              Note a delta Z is displayed comparing altitude to the current reference
  coins			  Number of coins - for objects that spawn coins
  scrapamount Amount of scrap acquired when collected
  cost			  Cost to buy cost - for objects that spawn shop items
  price_type  "scrap" or "bones" for cost instead of coins
  spawns		  What it spawns - class of object it spawns (if any)
  variant     Colour or other string identifying instance for icon changes
  hidden      Flags that object is initially hidden
  area_tag    For secrets, master area where secret is counted
  prog_tag    For collectibles that count against completion %
  abilities   Indicates which abilities are needed to find secret
  loop        In Crash indicates which loop object is available in
  comment     Free form text string for developer target messages
  description Free form description shown in the shop for buyable objects
  spoiler_help Contextual hint
  icon        Allows overriding of the icon for the object
  friendly    Allows the overriding of the popup dialog title and mouse over text for the object
  notsaved    If set to true the object will not allow toggling of found/unfound

  linetype    jumppad | tigger | pipe | target
  targets     [ { x, y, z },... ]
  target      { x, y, z }
  twoway      1 or 2, if set indicates that arrows are double ended
```

#### Unique Name (alt)
All objects must have a unique string when combining "{area}:{name}" properties. 

#### Coordinates
All objects have a 

#### Customising Data ####

#### YouTube Links ####

## Frontend Tools (Build Mode)

## Customising Styles (CSS)

## Testing Changes

Run the map using local server

## Updating Live Map

### Pushing Changes
### Creating a PR
### Releasing a PR

## Notes Spoilers and other Guidelines

## Custom Localisation
