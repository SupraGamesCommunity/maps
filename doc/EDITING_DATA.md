# Editing Data

## Installation
### Install the Tools
Git / Github
UV
...

### Create your own fork of the repository

### Clone the forked repository

### Choose a JSON Editor
Any editor but I recommend: Notepad++ or VSCode

## Data Files

### Layers / Categories
layerConfigs.json

### Classes
The map displays 
gameClasses.json

### Icons
iconConfigs.json

### Markers
markers.{game}.json

The base marker data is extracted from the game into ...
see DATA_EXTRACTION.md

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
#### Unique Name (alt)
area or level
#### Coordinates

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








