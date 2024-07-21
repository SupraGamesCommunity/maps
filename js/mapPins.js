/* globals L */

import { browser } from './utils.js';
import { Settings } from './settings.js';
import { MapLayer } from './mapLayer.js';

//=================================================================================================
// MapPins
//
// Manages a set of user draggable pins around the map, saving them between sessions

export class MapPins {
    static _defaultLayer = 'coordinate';
    static _defaultOptions = {
        layerId: this._defaultLayer,      // By default add to the coordinate layer
        activateLayer: true,              // By default activate the layer when adding a pin
        pos: undefined,                   // By default pins are added to the center of the viewable area [lat: lat, lng: lng]
    }

    static _markers = {};

    // Returns alt name for the pin
    static getAlt(idx) { return `XYMarker ${idx}`; }

    // Returns true if we have any pins at the moment 
    static hasAny() { return Object.keys(this._markers).length > 0; }

    static getPinTitle = (idx) => {
        const pin = Settings.map.mapPins[idx];
        return `${pin.type != undefined ? pin.type+' ' : ''}${idx}: (${pin.pos.lng.toFixed(0)},${pin.pos.lat.toFixed(0)})`
    };

    // Add a pin or update it if it already exists
    static add(options){
        options = Object.assign({}, this._defaultOptions, options);

        const mapLayer = MapLayer.get(options.layerId);

        if(!(mapLayer?.isEnabled))
            return;

        // Figure out index, position and type of pin
        const idx  = options.idx  || Object.keys(Settings.map.mapPins).length;
        const pos  = options.pos  || Settings.map.mapPins[idx]?.pos || MapLayer.map.getCenter();
        const type = options.type || Settings.map.mapPins[idx]?.type;

        // Save / update pin in settings
        Settings.map.mapPins[idx] = { pos: pos, ... type != undefined ? { type: type } : {} };
        Settings.commit();

        const alt = MapPins.getAlt(idx);
        if(!(alt in this._markers)) {

            const marker = L.marker(pos, {zIndexOffset: MapLayer.frontZIndexOffset, draggable: true, title: this.getPinTitle(idx), pinIdx: idx, layerId: mapLayer.id})
                .bindPopup()
                .on('moveend', function(e) {
                        const idx = e.target.options.pinIdx;
                        Settings.map.mapPins[idx].pos = e.target.getLatLng();
                        Settings.commit();
                        e.target._icon.title = this.getPinTitle(idx);
                    }, this)
                .on('popupopen', function(e) {
                        const idx = e.target.options.pinIdx;
                        marker.setPopupContent(this.getPinTitle(idx));
                        marker.openPopup();
                    }, this).addTo(mapLayer.layerObj);
                
                this._markers[alt] = marker;
            }
            else {
                this._markers[alt].setLatLng(pos);
            }

        if(options.activateLayer) {
            mapLayer.setActive(true);
        }
    }

    // Copies a string with a list of the current pins to the clipboard
    static copyToClipboard(){
        if(this.hasAny()){
            let pins = '';
            for(const idx in  Settings.map.mapPins) {
                pins += this.getPinTitle(idx)+'\r\n'; 
            }
            browser.copyTextToClipboard(pins)                    
        }
    }

    // Delete all our markers from the map
    static _clearMarkers(){
        for(const id in this._markers) {
            this._markers[id].remove(MapLayer.map);
        }
        this._markers = {};
    }

    // Recreate all pins in storage and add them to the map
    static restoreMapPins(){
        this._clearMarkers();
        if(MapLayer.isEnabledFromId(this._defaultLayer)){
            Settings.mapSetDefault('mapPins', {});
            for(const idx in Object.keys(Settings.map.mapPins)) {
                this.add({ idx: idx, activateLayer: false });
            }
        }
    }

    // Remove all the pins we've created from the map and storage
    static clearAll(){
        this._clearMarkers();
        Settings.map.mapPins = {};
        Settings.commit();
    }
}
