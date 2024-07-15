/* global L */

import { browser } from './utils.js';
import { locStr } from './locStr.js';
import { Settings } from './settings.js';

// L.tileLayer.canvas() is faster than L.tileLayer() and fixes a visible line between tiles on most browsers
// However on Firefox it makes the lines much worse, so we choose based on which browser
const L_tileLayer = browser.isFirefox ? L.tileLayer : L.tileLayer.canvas

export class MapLayer {
    static _layers;         // Map from layer id to layer instance

    static _map;            // Leaflet Map
    static _layerControl;   // Leaflet Layer Control

    // Instance constructor
    constructor(layerId, json){
        this.id = layerId;               // Id for the layer
        this.config = json;              // Configuration from layerConfigs.json
        this.active = false;             // Is layer active (visible) on map?
        this.layerObj = null;            // Leaflet layer object

        // fixes 404 errors
        if(this.config.mapBounds) {
            this.config.mapBounds[0].x += 1;
            this.config.mapBounds[0].y += 1;
            this.config.mapBounds[1].x -= 1;
            this.config.mapBounds[1].y -= 1;
        }
    }

    // Accessors for the most commonly used configuration data

    // Full name for the layer
    get name() { return locStr.str(this.config.name, this.config.name_key); }

    // List of games (base maps) this layer is enabled for
    get games() { return this.config.games; }

    // Returns true if layer is enabled for current mapId
    get isEnabled() { return this.games.includes(MapLayer._map?.options.mapId); }

    // Returns true if layer is currently attached to map
    get isActive() { return this.active; }

    // For Marker layers there is a default icon name and Z depth
    get icon() { return this.config.defaultIcon; }
    get zDepth() { return this.config.zDepth; }

    // For base layers we can get the bounds and center
    get mapLngLatBounds() { return [[this.config.mapBounds[0].y, this.config.mapBounds[0].x], [this.config.mapBounds[1].y, this.config.mapBounds[1].x]]; }
    get viewLngLatBounds() { return [[this.config.viewBounds[0].y, this.config.viewBounds[0].x], [this.config.viewBounds[1].y, this.config.viewBounds[1].x]]; }
    get viewCenterLngLat() { return [[(this.config.viewBounds[0].y + this.config.viewBounds[1].y) * 0.5], [(this.config.viewBounds[0].x + this.config.viewBounds[1].x) * 0.5]]; }

    // Leaflet Z index is based on the latitude, so our offsets need to be bigger than the max range of latitude
    static zIndexScale = 300000;
    static backZIndexOffset = -20 * MapLayer.zIndexScale;
    static frontZIndexOffset = 20 * MapLayer.zIndexScale;

    // Z Index offset for objects on this layer (found and unfound)
    getZIndexOffset(found) { this.zDepth * MapLayer.zIndexScale + (found ? MapLayer.backZIndexOffset : 0); }


    // When this layer is activated (normally via layer control) record that we're active and update settings
    onActivate(){
        this.active = true;
        Settings.map.activeLayers[this.id] = true;
        Settings.commit();
    }

    // When this layer is de-activated (normally via layer control) record that we're inactive and update settings
    onDeactivate(){
        this.active = false;
        delete Settings.map.activeLayers[this.id];
        Settings.commit();
    }

    // Activate or deactivate this layer group
    setActive(active){
        if(this.config.type != 'base' && this.active != active) {
            if(active) {
                this.layerObj.addTo(MapLayer._map);
            }
            else {
                this.layerObj.remove();
            }
        }
    }

    // Create the appropriate layer object for this map layer
    createLayer()
    {
        const mapId = MapLayer._map.options.mapId;
        const id = this.id;
        const cfg = this.config;

        // For marker layers and base maps other than current jusr create an L.LayerGroup
        if(cfg.type == 'markers' || cfg.type == 'base' && id != mapId){
            return L.layerGroup([], {layerId: id});
        }
        else {  // The primary base layer or an additional 'tiles' layer
            let tilesDir = 'tiles/' + mapId + '/';
            const tileExt = cfg.type == 'tiles' ? '.png' : '.jpg';

            let options = {
                tileSize: L.point(cfg.tileRes, cfg.tileRes),  // Tile size is currently fixed
                noWrap: true,                                 // tops map wrapping
                updateInterval: -1,                           // Allows map to update as often as needed when panning
                keepBuffer: 16,                               // More tiles loaded when panning 
                maxNativeZoom: 4,                             // Zooming beyond this means auto-scaled
                bounds: this.viewLngLatBounds,                // Tiles only loaded in this area
                layerId: id,                                       // Store the name for the map
            };

            if(id == mapId){
                options.attribution = '<a href="https://github.com/SupraGamesCommunity/maps" target="_blank">SupraGames Community</a>';
                tilesDir += 'base';
            }
            else {
                tilesDir += id;
            }
            return L_tileLayer(tilesDir + '/{z}/{x}/{y}' + tileExt, options);
        }
    }

    // Create the leaflet layer "group" and add it to map and control
    init(){
        if(this.isEnabled) {
            this.active = !!Settings.map.activeLayers[this.id];

            this.layerObj = this.createLayer(MapLayer._map, this.id, this.config);

            if(this.config.type == 'base') {
                MapLayer._layerControl.addBaseLayer(this.layerObj, this.config.name);
            }
            else {
                MapLayer._layerControl.addOverlay(this.layerObj, this.config.name);
            }

            if(MapLayer._map.options.mapId == this.id || this.active){
                this.layerObj.addTo(MapLayer._map);
            }

            if(this.config.type != 'base') {
                this.layerObj.on('add', this.onActivate, this);
                this.layerObj.on('remove', this.onDeactivate, this);
            }
        }
    }

    // Reset layer to initial state (releasing layerObj)
    reset() {
        if(this.layerObj) {
            this.layerObj.off('add remove');
            this.layerObj.remove();
            MapLayer._layerControl.removeLayer(this.layerObj);
            this.layerObj = null;
        }
        this.active = false;
    }


    // Retrieve the map layer from the object
    static get(layerId) {
        return MapLayer._layers[layerId];
    }

    // Retrieve the Leaflet layer object for the specified id
    static getLayerObj(layerId) {
        if(layerId == '_map'){
            return MapLayer._map;
        }
        else {
            return MapLayer._layers[layerId].layerObj;
        }
    }

    // Returns true if the specified layer will be selectable on the layer control 
    static isEnabledFromId(layerId) { return !!MapLayer._layers[layerId]?.isEnabled; }

    // Returns true if the specified layer is/will be active
    static isActiveFromId(layerId) { return Boolean(MapLayer._layers?.[layerId].active); }

    static getZIndexOffsetFromId(layerId, found) { return MapLayer._layers[layerId].getZIndexOffset(found); }

    // Retrieve list of the currently active layers
    static getActiveLayers() {
        let activeLayers = {};
        for(const [id, layer] of Object.entries(MapLayer._layers)) {
            if(layer.active){
                activeLayers[id] = true;
            }
        }
        return activeLayers;
    }

    // Retrieve map of currently enabled layers
    static getEnabledLayers() {
        let enabledLayers = { '_map': true };
        for(const [id, layer] of Object.entries(MapLayer._layers)) {
            if(layer.isEnabled){
                enabledLayers[id] = true;
            }
        }
        return enabledLayers;
    }

    // Set the layers active that are in map as true, set all other layers inactive
    static setActiveLayers(activeLayers){
        for(const [id, layer] of Object.entries(MapLayer._layers)) {
            layer.setActive(!!activeLayers[id]);
        }
    }

    static forEachMarkers(fn) {
        for(const [layerId, layer] of Object.entries(this._layers)) {
            if(layer.type == 'markers' && layer.isEnabled) {
                fn(layerId, layer);
            }
        }
    }

    // Loads layer configs and constructs layer objects
    static async loadConfigs() {
        MapLayer._layers = {};
        MapLayer._layerControl = null; 
        MapLayer._map = null;

        const response = await fetch('data/layerConfigs.json');
        const json = await response.json();

        // Create layer instances
        for(const [id, config] of Object.entries(json)){
            MapLayer._layers[id] = new MapLayer(id, config);
        }
    }

    // Initialise the layer objects and add them to map and layer control as appropriate
    static setupLayers(map, layerControl) {
        MapLayer._layerControl = layerControl; 
        MapLayer._map = map;

       // Set up default Settings for activeLayers
       const defaultActive = {};
       for(const [id, layer] of Object.entries(MapLayer._layers)){
           if(layer.config.defaultActive && layer.isEnabled) {
               defaultActive[id] = true;
           }
       }
       Settings.mapSetDefault('activeLayers', defaultActive);

        // Initialise layer instances
        for(const layer of Object.values(MapLayer._layers)) {
            layer.init();
        }
    }

    // Restore MapLayer to initial state
    static resetLayers() {
        for(const layer of Object.values(MapLayer._layers)) {
            layer.reset();            
        }
        MapLayer._layerControl = null; 
        MapLayer._map = null;
    }
}

// **** listen for baselayerchange to trigger map change

//    => on add we potentially need to deal with marking items found/unfound (or hide/unhide)

// **** Should we create LayerControl here?
/*

    LayerControl
        current map = create TileLayer add as baseLayer
        other maps = create LayerGroup add as baseLayer
        other layers = create LayerGroup add as overlay layer
    
    all overlay layers get added as search layers (but inactive have to be disabled again)

    Markers get added / removed from layers to handle hide/unhide

    baselayerchange event is how we handle map change -> reloadmap -> baselayerchange -> loadmap


    For each enabled 'layer'
        currrent map = create TileLayer and add as baseLayer to LayerControl
        other maps = create LayerGroup and add as baseLayer to LayerControl
        other layers = create LayerGroup and adds as overlay layer

        all if active by default then enable
            -> add to map

    If layer has been created then it is enabled
    if layer has been added to map then it is active

    Enable layer => add to map
    Disable layer => remove from map 
        Both imply hide/unhide corresponding stuff on map (ie could be done via CSS)




*/