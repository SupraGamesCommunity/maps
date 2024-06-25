// Map Layer configuration
//
// Configures the set of layers and some properties for each game map.


/* exported layerConfigs */
const layerConfigs = {
    data: {},

    // Initialise any procedural data - store index based on position in Map
    init: function() {
        return fetch('data/layerConfigs.json')
            .then((response) => response.json())
            .then((j) => {
                this.data = j;
            });
      },

    // Returns layerConfig for specified id
    get: function(id) {
        return this.data[id];
    },

    backZIndexOffset: -20 * 300000,
    frontZIndexOffset: 20 * 300000,

    // Returns index of specified id (in order)
    getZIndexOffset: function(id, found=false) { 
        return this.data[id].zDepth * 300000 + (found ? this.backZIndexOffset : 0);
    },

    // Calls fn for each layer in order (passes v = LayerConfig(), k = layerId
    forEach: function(mapId, fn) {
        // Could use foreach but this seems clearer
        for(const [layerId, layerConfig] of Object.entries(this.data)) {
            if(layerConfig.games.includes(mapId)) {
                fn(layerId, layerConfig);
            }
        }
    },

    // Calls the specified function for each layer of the specified type that is enabled for mapId
    forEachOfType: function(mapId, type, fn) {
        for(const [layerId, layerConfig] of Object.entries(this.data)) {
            if(layerConfig.games.includes(mapId) && layerConfig.type == type) {
                fn(layerId, layerConfig);
            }
        }
    },

    // Returns object with entry for each layer that is enabled for the specified map { layer: true, ... } 
    getEnabledLayers: function(mapId) {
        let ret = {};
        for(const [layerId, layerConfig] of Object.entries(this.data)) {
            if(layerConfig.games.includes(mapId)) {
                ret[layerId] = true;
            }
        }
        ret['_map'] = true;
        return ret;
    },

/*      A couple of different ways to do this. 2nd is not widely supported
        return Object.fromEntries(
            Array.from(this.data.entries(), ([k,v]) => [k, v.games.includes(mapId)])
            .filter(v => v[1]));
        return Object.fromEntries(this.data.entries()
            .filter(([k,v]) => v.games.includes(mapId))
            .map(([k,v]) => [k, true]));
*/

    // Returns object with entry for each layer that is active by default { layer: true }
    getDefaultActive: function(mapId) {
        let ret = {};
        for(const [layerId, layerConfig] of Object.entries(this.data)) {
            if(layerConfig.games.includes(mapId) && layerConfig.defaultActive) {
                ret[layerId] = true;
            }
        }
        return ret;
    },

    // Returns object with entry for each layer that is enabled for the mapId and is of the specified type 
    getLayersByType : function(mapId, type) {
        let ret = {};
        for(const [layerId, layerConfig] of Object.entries(this.data)) {
            if(layerConfig.games.includes(mapId) && layerConfig.type == type) {
                ret[layerId] = true;
            }
        }
        return ret;
    }
}

