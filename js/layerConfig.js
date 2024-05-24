// Map Layer configuration
//
// Configures the set of layers and some properties for each game map.

/* exported LayerConfig */
class LayerConfig {
    constructor(type, name, defaultIcon, defaultActive, games) {
        this.type = type                        // One of "tiles", "markers", "lines"
        this.name = name                        // User facing name for the layer
        this.defaultActive = defaultActive      // Should it be toggled on by default
        this.games = games                      // Array of games to display for (sl, slc, siu)
    }
}

/* exported layerConfigs */
const layerConfigs = {
    "pipes"      : new LayerConfig("tiles",   "Pipe Lines Map", null,            false, ["sl"              ]),
    "pads"       : new LayerConfig("tiles",   "Pad Lines Map",  null,            false, ["sl"              ]),
    "closedChest": new LayerConfig("markers", "Chests",         "chest",         true,  ["sl", "slc", "siu"]),
    "shop"       : new LayerConfig("markers", "Shop",           "shop",          true,  ["sl", "slc", "siu"]),
    "collectable": new LayerConfig("markers", "Collectables",   "question_mark", true,  ["sl", "slc", "siu"]),
    "upgrades"   : new LayerConfig("markers", "Upgrades",       "loot",          false, ["sl", "slc", "siu"]),
    "misc"       : new LayerConfig("markers", "Miscellaneous",  "question_mark", false, ["sl", "slc", "siu"]),
    "coin"       : new LayerConfig("markers", "Coins",          "awesome",       false, ["sl", "slc", "siu"]),
    "graves"     : new LayerConfig("markers", "Graves",         "question_mark", false, ["sl"              ]),
    "extra"      : new LayerConfig("markers", "Extras",         "question_mark", false, ["sl", "slc", "siu"]),
    "pipesys"    : new LayerConfig("special", "Pipe System",    null,            false, ["sl", "slc", "siu"]),
    "jumppads"   : new LayerConfig("special", "Pads System",    null,            false, ["sl", "slc", "siu"])
}

/* exported layerConfigsGetDefaultActive */
// Returns dictionary of {layer: defaultActive]
function layerConfigsGetDefaultActive() {
    return Object.fromEntries(Object.entries(layerConfigs).map(([k,v]) => [k,v.defaultActive]))
}
