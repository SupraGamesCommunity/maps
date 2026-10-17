## layerConfigs.json
Configuration data for UI elements on the map.

- **Base Layers**: One of the underlying maps for a specific game.
- **Marker Layer**: A group of markers which can be shown or hidden on the map together.
- **Category Layer**: A collection of marker layers.

The `layerConfig.json` is a dictionary of layer ids and layer configurations with a common set of properties and additional properties based on type.

### Properties: Common 

- **type**: One of _"base"_, _"marker"_ or _"category"_.
- **name**: A user facing name for the layer.
- **games**: An array of game id's for which this layer is relevant.

### Properties: __base__ 


