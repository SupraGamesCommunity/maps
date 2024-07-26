/* globals L */

import { Settings } from './settings.js'
import { MapLayer } from "./mapLayer.js";

//=================================================================================================
// SupraMap a specialised version of Leaflet Map

const _super = L.Map.prototype;

export const L_SupraMap = L.Map.extend({
  options: {
    fadeAnimation: true,
    minZoom: 1,
    maxZoom: 8,
    zoomDelta: 0.5,
    zoomSnap: 0.125,
    zoomControl: false,
    doubleClickZoom: true,

    // By default when zooming in and out everything stays the same size, which means as you zoom out
    // things get bigger relative to the map. To counteract this provides a zoom dependent scale
    // to apply to icons sizes and similar pixel space characteristics.

    resizeScaleZoom0: 0.6,          // Scale factor when map zoom is 0
    resizeZoom1: 3,                 // Zoom when scale should be 1:1 (set to -1 for no dynamic scaling)

    // We set the defaults for these two in initialize
    // crs: ?
    // maxBounds: ?
  },

  initialize(mapParam, id = 'map', options = {}){

    if(options === undefined){
      options = {};
    }
    if(!id){
      id = 'map';
    }

    // Sort out mapId and store for other clients to access
    Settings.globalSetDefault('mapId', 'sl');
    Settings.mapId = mapParam.mapId || Settings.mapId;
    Settings.commit();
    this.mapId = Settings.mapId;

    // Get map configuration
    const mapLayer = MapLayer.get(this.mapId);

    // Set up the default options

    // Create a coordinate system for the map
    const mapScale = mapLayer.config.mapRes / mapLayer.config.mapSize;
    const tileMaxSet = 4;
    const mapMinResolution = Math.pow(2, tileMaxSet);

    const crs = L.CRS.Simple;
    crs.transformation = new L.Transformation(mapScale, -mapLayer.mapLatLngBounds[0][1] * mapScale, mapScale, -mapLayer.mapLatLngBounds[0][0] * mapScale);
    crs.scale = function (zoom) { return Math.pow(2, zoom) / mapMinResolution; };
    crs.zoom = function (scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };
    this.options.crs = crs;

    // Set the bounds
    this.options.maxBounds =  L.latLngBounds(mapLayer.viewLatLngBounds).pad(0.25), // elastic-y bounds + elastic-x bounds

    L.setOptions(this, options);

    // Set the div background colour to match the map
    document.querySelector('#'+id).style.backgroundColor = mapLayer.config.backgroundColor;

    _super.initialize.call(this, id, options);

    // redraw paths on dragging (sets % of padding around viewport, may be performance issue)
    this.getRenderer(this).options.padding = 1;

    this.on('moveend zoomend', this.onViewChanged, this);

    // Set the initial view
    Settings.mapSetDefault('bounds', mapLayer.viewLatLngBounds);
    if (mapParam.hasView()) {
      this.setView(mapParam.getCenter(this.getCenter()), mapParam.getZoom(this.getZoom()));
    }
    else {
      this.fitBounds(mapParam.getBounds(Settings.map.bounds));
    }
  },

  // Called to fire the moveend and zoomend events, we track changes view bounds
  onViewChanged: function(){
    const b = this.getBounds();
    Settings.map.bounds = [[Math.round(b.getNorth()), Math.round(b.getWest())], [Math.round(b.getSouth()), Math.round(b.getEast())]]
    Settings.commit();
  },

  // Returns scale to apply to objects based on config and current map zoom
  getPixelResizeScale() {
    const scalePower = -Math.log2(this.options.resizeScaleZoom0) / this.options.resizeZoom1;
    return Math.pow(2, this._zoom * scalePower) * this.options.resizeScaleZoom0;
  },

});

export const L_supraMap = function (mapParam, id = 'map', options = {}) {
  return new L_SupraMap(mapParam, id, options);
};