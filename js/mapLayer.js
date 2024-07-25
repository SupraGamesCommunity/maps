/* global L */

import { browser } from './utils.js';
import { locStr } from './locStr.js';
import { Settings } from './settings.js';

// L.tileLayer.canvas() is faster than L.tileLayer() and fixes a visible line between tiles on most browsers
// However on Firefox it makes the lines much worse, so we choose based on which browser
const L_tileLayer = browser.isFirefox ? L.tileLayer : L.tileLayer.canvas

function boundsShrink(b, d) {
  return [{ x: b[0].x + d, y: b[0].y + d }, { x: b[1].x - d, y: b[1].y - d }];
}
function boundsMin(b1, b2) {
  return [{ x: Math.max(b1[0].x, b2[0].x), y: Math.max(b1[0].y, b2[0].y) }, { x: Math.min(b1[1].x, b2[1].x), y: Math.max(b1[1].y, b2[1].y) }];
}

export class MapLayer {
  static _layers;         // Map from layer id to layer instance

  static _map;            // Leaflet Map

  // Instance constructor
  constructor(layerId, json) {
    this.id = layerId;               // Id for the layer
    this.config = json;              // Configuration from layerConfigs.json
    this.active = false;             // Is layer active (visible) on map?
    this.layerObj = null;            // Leaflet layer object

    if (this.config.mapBounds) {
      // Shrink map bounds by 1 to avoid TileLayer trying to load tiles that are out of range (could cause 404 errors)
      this.config.mapBounds = boundsShrink(this.config.mapBounds, 1);
      this.config.viewBounds = boundsMin(this.config.viewBounds, this.config.mapBounds);
    }
  }

  // Accessors for the most commonly used configuration data

  // Full name for the layer
  get name() { return locStr.str(this.config.name, this.config.name_key); }

  // List of games (base maps) this layer is enabled for
  get games() { return this.config.games; }

  // Returns true if layer is enabled for current mapId
  get isEnabled() { return this.games.includes(MapLayer._map?.mapId); }

  // Returns true if layer is currently attached to map
  get isActive() { return this.active; }

  // For Marker layers there is a default icon name and Z depth
  get type() { return this.config.type; }
  get icon() { return this.config.defaultIcon; }
  get zDepth() { return this.config.zDepth; }

  // For base layers we can get the bounds and center
  get mapLatLngBounds() { return [[this.config.mapBounds[0].y, this.config.mapBounds[0].x], [this.config.mapBounds[1].y, this.config.mapBounds[1].x]]; }
  get viewLatLngBounds() { return [[this.config.viewBounds[0].y, this.config.viewBounds[0].x], [this.config.viewBounds[1].y, this.config.viewBounds[1].x]]; }
  get viewCenterLngLat() { return [[(this.config.viewBounds[0].y + this.config.viewBounds[1].y) * 0.5], [(this.config.viewBounds[0].x + this.config.viewBounds[1].x) * 0.5]]; }

  // Leaflet Z index is based on the latitude, so our offsets need to be bigger than the max range of latitude
  static zIndexScale = 300000;
  static backZIndexOffset = -20 * MapLayer.zIndexScale;
  static frontZIndexOffset = 20 * MapLayer.zIndexScale;

  // Z Index offset for objects on this layer (found and unfound)
  getZIndexOffset(found) { return this.zDepth * MapLayer.zIndexScale + (found ? MapLayer.backZIndexOffset : 0); }


  // When this layer is activated (normally via layer control) record that we're active and update settings
  onActivate() {
    this.active = true;
    Settings.map.activeLayers[this.id] = true;
    Settings.commit();
  }

  // When this layer is de-activated (normally via layer control) record that we're inactive and update settings
  onDeactivate() {
    this.active = false;
    delete Settings.map.activeLayers[this.id];
    Settings.commit();
  }

  // Activate or deactivate this layer group
  setActive(active) {
    if (this.config.type != 'base' && this.active != active) {
      if (active) {
        this.layerObj.addTo(MapLayer._map);
      }
      else {
        this.layerObj.remove();
      }
    }
  }

  // Create the appropriate layer object for this map layer
  createTileLayer() {
    const mapId = MapLayer._map.mapId;
    const id = this.id;
    const cfg = this.config;

    let tilesDir = 'tiles/' + mapId + '/';
    const tileExt = cfg.type == 'tiles' ? '.png' : '.jpg';

    let options = {
      tileSize: L.point(cfg.tileRes, cfg.tileRes),  // Tile size is currently fixed
      noWrap: true,                                 // tops map wrapping
      updateInterval: -1,                           // Allows map to update as often as needed when panning
      keepBuffer: 16,                               // More tiles loaded when panning 
      minNativeZoom: 0, maxNativeZoom: 4,           // Zooming beyond this means auto-scaled
      bounds: this.viewLatLngBounds,                // Tiles only loaded in this area
      layerId: id,                                  // Store the name for the map
    };

    if (id == mapId) {
      options.attribution = '<a href="https://github.com/SupraGamesCommunity/maps" target="_blank">SupraGames Community</a>';
      tilesDir += 'base';
    }
    else {
      tilesDir += id;
    }
    return L_tileLayer(tilesDir + '/{z}/{x}/{y}' + tileExt, options);
  }

  // Create the leaflet layer "group" and add it to map and control
  init() {
    if (!this.isEnabled) {
      return;
    }
    if (this.config.type == 'base') {
      if (this.id == MapLayer._map.mapId) {
        // Primary map layer
        this.layerObj = MapLayer._map;
        this.active = true;

        this.layerObj = this.createTileLayer().addTo(MapLayer._map);
      }
      else {
        // The other selectable maps
        this.layerObj = L.layerGroup([], { layerId: this.id });
        this.active = false;
      }
    }
    else {
      if (this.config.type == 'tiles') {
        // An extra tile layer (used to be used for pipe/pad map overlay)
        this.layerObj = this.createTileLayer();
      }
      else {
        // A collection of markers
        this.layerObj = L.layerGroup([], { layerId: this.id });
      }
      this.active = !!Settings.map.activeLayers[this.id];

      if (this.active) {
        this.layerObj.addTo(MapLayer._map);
      }
      this.layerObj.on('add', this.onActivate, this);
      this.layerObj.on('remove', this.onDeactivate, this);
    }
  }

  // Reset layer to initial state (releasing layerObj)
  reset() {
    if (this.layerObj) {
      this.layerObj.off('add remove');
      this.layerObj.remove();
      this.layerObj = null;
    }
    this.active = false;
  }


  // Retrieve the map layer from the object
  static get(layerId) {
    if (layerId == '_map') {
      layerId = Settings.mapId;
    }
    return MapLayer._layers[layerId];
  }

  // Retrieve the Leaflet layer object for the specified id
  static getLayerObj(layerId) {
    if (layerId == '_map') {
      layerId = Settings.mapId;
    }
    return MapLayer._layers[layerId].layerObj;
  }

  // Returns true if the specified layer will be selectable on the layer control 
  static isEnabledFromId(layerId) { return !!MapLayer._layers[layerId]?.isEnabled; }

  // Returns true if the specified layer is/will be active
  static isActiveFromId(layerId) { return Boolean(MapLayer._layers?.[layerId].active); }

  static getZIndexOffsetFromId(layerId, found) { return MapLayer._layers[layerId].getZIndexOffset(found); }

  // Retrieve list of the currently active layers
  static getActiveLayers() {
    let activeLayers = {};
    for (const [id, layer] of Object.entries(MapLayer._layers)) {
      if (layer.active) {
        activeLayers[id] = true;
      }
    }
    return activeLayers;
  }

  // Set the layers active that are in map as true, set all other layers inactive
  static setActiveLayers(activeLayers) {
    for (const [id, layer] of Object.entries(MapLayer._layers)) {
      layer.setActive(!!activeLayers[id]);
    }
  }

  static forEachEnabled(fn) {
    for (const [layerId, layer] of Object.entries(MapLayer._layers)) {
      if (layer.isEnabled) {
        fn(layerId, layer);
      }
    }
  }

  static forEachMarkers(fn) {
    for (const [layerId, layer] of Object.entries(MapLayer._layers)) {
      if (layer.config.type == 'markers' && layer.isEnabled) {
        fn(layerId, layer);
      }
    }
  }

  static forEachBase(fn) {
    for (const [layerId, layer] of Object.entries(MapLayer._layers)) {
      if (layer.config.type == 'base' && layer.isEnabled) {
        fn(layerId, layer);
      }
    }
  }

  // Loads layer configs and constructs layer objects
  static async loadConfigs() {
    MapLayer._layers = {};
    MapLayer._map = null;

    const response = await fetch('data/layerConfigs.json');
    const json = await response.json();

    // Create layer instances
    for (const [id, config] of Object.entries(json)) {
      MapLayer._layers[id] = new MapLayer(id, config);
    }
  }

  // Initialise the layer objects and add them to map and layer control as appropriate
  static setupLayers(map) {
    MapLayer._map = map;

    // Set up default Settings for activeLayers
    const defaultActive = {};
    for (const [id, layer] of Object.entries(MapLayer._layers)) {
      if (layer.config.type == 'base') {
        defaultActive[id] = map.mapId == id;
      }
      else {
        if (layer.config.defaultActive && layer.isEnabled) {
          defaultActive[id] = true;
        }
      }
    }
    Settings.mapSetDefault('activeLayers', defaultActive);

    // Initialise layer instances
    for (const layer of Object.values(MapLayer._layers)) {
      layer.init();
    }
  }

  // Restore MapLayer to initial state
  static resetLayers() {
    for (const layer of Object.values(MapLayer._layers)) {
      layer.reset();
    }
    MapLayer._map = null;
  }
}
