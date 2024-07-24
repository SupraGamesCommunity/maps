/*eslint strict: ["error", "global"]*/
/*global L */

import { Settings } from './settings.js';
import { Icons } from './icons.js';
import { GameClasses } from './gameClasses.js';
import { locStr } from './locStr.js';
import { MapLayer } from './mapLayer.js';
import { browser } from './utils.js';
import { MapObject, mapObjectFound } from './mapObject.js';
import { SaveFileSystem } from './saveFileSystem.js';
import { MapPins } from './mapPins.js';
import { MapParam } from './mapParam.js';
import { L_Control_supraSearch } from './supraSearch.js';

window.mapObjectFound = mapObjectFound;

// Terminology,
// Class - The type of object represented by marker. Based on UE4 classes/blueprints 
// Layer - a toggleable set of data on the map (base map, overlays, groups of markers)
//         Leaflet calls it a LayerGroup 
// Marker - An individual icon displayed on the map with a specific position

var map = null;         // Leaflet map object containing current game map and all its markers
var mapId = '';         // Current map selected (one of sl, slc or siu)

let reloading;          // Flag used to prevent triggering reloading while already in progress

let searchControl;      // Leaflet control for searching

export const buildMode = {
  marker: undefined,    // Current marker we're editing in Build Mode
  object: undefined,    // Current object we're editing in Build Mode
  objectChanges: [],    // Current object's changed values before they are committed to the list
  changeList: []        // Changes made in the current Build Mode session
}

const skipConfirms = browser.isCode;

Settings.init('sl');

// Todo: Move these to the the place the relevant code is dealt with
Settings.globalSetDefault('buildMode', false);

// Generate our URL format based on current state
// {base url}#map={sl|slc|siu}&W={bounds west lng}&N={north}&E={east}&S={south}
function getViewURL() {
  const base = window.location.href.replace(/#.*$/, '')
  const b = map.getBounds();
  const vars = { mapId: mapId, W: Math.round(b.getWest()), N: Math.round(b.getNorth()), E: Math.round(b.getEast()), S: Math.round(b.getSouth()) };
  const url = base + '#' + Object.entries(vars).map((e) => e[0] + '=' + encodeURIComponent(e[1])).join('&');
  return url;
}

function toggleBuildMode() {
  Settings.globalSetDefault('buildMode', false);
  Settings.global.buildMode = !Settings.global.buildMode;
  Settings.commit();
  skipConfirms || alert('Build mode is now set to ' + Settings.global.buildMode + '.');
}

/* eslint-disable-next-line no-unused-vars */
function updateBuildModeValue(event) {
  let el = event.target;
  buildMode.object[el.id] = el.value;
  buildMode.objectChanges[MapObject.makeAlt(buildMode.object.area, buildMode.object.name) + '|' + el.id] = el.value;
  //alert(buildMode.object.name + ' property ' + el.id + ' changed from ' + el.defaultValue + ' to ' + el.value + '.');
}

/* eslint-disable-next-line no-unused-vars */
function commitCurrentBuildModeChanges() {
  Object.getOwnPropertyNames(buildMode.objectChanges).forEach(
    function (i) {
      buildMode.changeList[i] = buildMode.objectChanges[i];
    }
  );
  let newLat = buildMode.object.lat;
  let newLng = buildMode.object.lng;

  buildMode.marker.setLatLng(new L.LatLng(newLat, newLng)).update();
  buildMode.objectChanges = [];
  map.closePopup();
}

function exportBuildChanges() {
  // It might be worth accummulating the changes in this structure as we make them, but this works
  let jsonobj = {}
  Object.getOwnPropertyNames(buildMode.changeList).filter(function (e) { return e !== 'length' }).forEach(
    function (k) {
      let alt, prop, area, name;
      [alt, prop] = k.split('|');
      [area, name] = alt.split(':');
      if (!jsonobj[alt]) {
        jsonobj[alt] = {}
      }
      jsonobj[alt][name] = name;
      jsonobj[alt][area] = area;
      jsonobj[alt][prop] = buildMode.changeList[k];
    });
  jsonobj = Object.values(jsonobj);

  console.log(buildMode.changeList);
  let t = JSON.stringify(jsonobj, null, 2)
  browser.copyTextToClipboard(t);
  skipConfirms || alert('Build mode changes have been placed on the clipboard.');
}

// Called when Window loads and when base map changes, loads currently select mapId
function loadMap(mapParam) {
  Settings.globalSetDefault('mapId', 'sl');
  if ('mapId' in mapParam) {
    Settings.global.mapId = mapParam.mapId;
    Settings.commit();
  }
  mapId = Settings.global.mapId;

  const mapLayer = MapLayer.get(mapId);

  document.querySelector('#map').style.backgroundColor = mapLayer.config.backgroundColor;

  const mapScale = mapLayer.config.mapRes / mapLayer.config.mapSize;
  const tileMaxSet = 4;
  const mapMinResolution = Math.pow(2, tileMaxSet);

  // Create a coordinate system for the map
  var crs = L.CRS.Simple;
  crs.transformation = new L.Transformation(mapScale, -mapLayer.mapLatLngBounds[0][1] * mapScale, mapScale, -mapLayer.mapLatLngBounds[0][0] * mapScale);
  crs.scale = function (zoom) { return Math.pow(2, zoom) / mapMinResolution; };
  crs.zoom = function (scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };

  // Create the base map
  map = new L.Map('map', {
    crs: crs,
    fadeAnimation: true,
    minZoom: 1,
    maxZoom: 8,
    zoomDelta: 0.5,
    zoomSnap: 0.125,
    maxBounds: L.latLngBounds(mapLayer.viewLatLngBounds).pad(0.25), // elastic-y bounds + elastic-x bounds
    zoomControl: false,
    doubleClickZoom: true,
    mapId: mapId,
  });
  // redraw paths on dragging (sets % of padding around viewport, may be performance issue)
  map.getRenderer(map).options.padding = 1;

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.fullscreen({ position: 'bottomright', forceSeparateButton: true }).addTo(map);
  L.control.mousePosition({ numDigits: 0, lngFirst: true }).addTo(map);

  map.on('moveend zoomend', function () {     // (e)
    const b = map.getBounds();
    Settings.map.bounds = [[Math.round(b.getNorth()), Math.round(b.getWest())], [Math.round(b.getSouth()), Math.round(b.getEast())]]
    Settings.commit();
  });

  map.on('baselayerchange', function (e) {
    MapLayer.resetLayers();
    MapObject.resetAll();
    map.off();
    map.remove();
    map = null;

    loadMap(new MapParam({ mapId: e.layer.options.layerId }));
  });

  MapLayer.setupLayers(map);

  const layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright',
  });

  MapLayer.forEachEnabled((id, layer) => {
    if (layer.type == 'base') {
      layerControl.addBaseLayer(layer.layerObj, layer.name);
    }
    else {
      layerControl.addOverlay(layer.layerObj, layer.name);
    }
  });

  Settings.mapSetDefault('bounds', mapLayer.viewLatLngBounds);
  if (mapParam.hasView()) {
    map.setView(mapParam.getCenter(map.getCenter()), mapParam.getZoom(map.getZoom()));
  }
  else {
    map.fitBounds(mapParam.getBounds(Settings.map.bounds));
  }

  let subAction = L.Toolbar2.Action.extend({
    initialize: function (map, myAction) { this.map = map; this.myAction = myAction; L.Toolbar2.Action.prototype.initialize.call(this); },
    addHooks: function () { this.myAction.disable(); }
  });
  new L.Toolbar2.Control({
    position: 'bottomleft',
    actions: [
      // build mode button
      L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: { html: '&#x1F588;', tooltip: 'Map pins' },
          subToolbar: new L.Toolbar2({
            actions: [
              subAction.extend({
                options: { toolbarIcon: { html: 'Add', tooltip: 'Adds new pin to map' } },
                addHooks: function () {
                  MapPins.add({ activateLayer: true });
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'clear', tooltip: 'Clears all pins added to map' } },
                addHooks: function () {
                  if (MapPins.hasAny()
                    && (skipConfirms || confirm("Are you sure you want to clear all custom pins?"))) {
                    MapPins.clearAll();
                  }
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'copy', tooltip: 'Copy pin positions to clip board' } },
                addHooks: function () {
                  MapPins.copyToClipboard();
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: '&times;', tooltip: 'Close' } }
              }),
            ],
          })
        }
      }),
      // build mode button
      L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: { html: '&#x1F527;', tooltip: 'Developer Mode' },
          subToolbar: new L.Toolbar2({
            actions: [
              subAction.extend({
                options: { toolbarIcon: { html: 'Toggle', tooltip: 'Toggles Developer mode on or off' } },
                addHooks: function () {
                  toggleBuildMode();
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'Copy Changes', tooltip: 'Copies the changes made in this session to the Clipboard' } },
                addHooks: function () {
                  exportBuildChanges();
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: '&times;', tooltip: 'Close' } }
              }),
            ],
          })
        }
      }),
      // share button
      L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: { html: '&#x1F517;', tooltip: 'Share' },
          subToolbar: new L.Toolbar2({
            actions: [
              subAction.extend({
                options: { toolbarIcon: { html: 'Copy Map View URL', tooltip: 'Copies View URL to the Clipboard' } },
                addHooks: function () {
                  browser.copyTextToClipboard(getViewURL());
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: '&times;', tooltip: 'Close' } }
              }),
            ],
          })
        }
      }),
      // load game button
      L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: { html: '&#x1F4C1;', tooltip: 'Browse...' },
          subToolbar: new L.Toolbar2({
            actions: [
              subAction.extend({
                options: { toolbarIcon: { html: 'Browse...', tooltip: 'Load game save (*.sav) to mark collected items (Alt+R)' } },
                addHooks: function () {
                  if (Object.keys(Settings.map.markedItems).length == 0 ||
                    skipConfirms || confirm("Are you sure you want to overwrite existing items marked found?")) {
                    SaveFileSystem.loadFileDialog();
                  }
                  subAction.prototype.addHooks.call(this);
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'Copy File Path', tooltip: 'Copy default Windows game save file path to the Clipboard' } },
                addHooks: function () {
                  browser.copyTextToClipboard('%LocalAppData%\\Supraland' + (mapId == 'siu' ? 'SIU' : '') + '\\Saved\\SaveGames');
                  subAction.prototype.addHooks.call(this);
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'Unmark Found', tooltip: 'Unmark all found items' } },
                addHooks: function () {
                  if (skipConfirms || confirm('Are you sure to unmark all found items?')) {
                    SaveFileSystem.ClearAll();
                  }
                  subAction.prototype.addHooks.call(this);
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: '&times;', tooltip: 'Close' } }
              }),
            ],
          })
        }
      }),
    ],
  }).addTo(map);

  Settings.mapSetDefault('searchText', '');

  searchControl = L_Control_supraSearch({
    layerFilter: (id, l) => {
      return id != 'coordinate';
    }
  }).addTo(map);

  MapObject.loadObjects().then(() => {
    MapObject.initObjects();

    MapPins.restoreMapPins();

    layerControl.addTo(map); // triggers baselayerchange, so called in the end

  });

} // end of loadmap

// Change current map loaded (if not currently reloading)
function reloadMap(id) {
  if (!reloading && mapId != id) {
    reloading = true;
    map.fireEvent('baselayerchange', { layer: { options: { layerId: id } } });
    setTimeout(function () { reloading = false; }, 500);
  }
}

window.onhashchange = function () {   // (e)
  const mapParam = new MapParam(browser.getHashAndClear());

  if (mapParam.mapId && mapParam.mapId != mapId) {
    MapLayer.resetLayers();
    MapObject.resetAll();
    browser.clearLocationHash();
    map.off();
    map.remove();
    map = null;

    loadMap(mapParam);
  }
  else if (mapParam.hasView()) {
    map.setView(mapParam.getCenter(map.getCenter()), mapParam.getZoom(map.getZoom()));
  }
  else if (mapParam.hasBounds()) {
    map.fitBounds(mapParam.bounds);
  }
}

window.onload = function () {    // (event)

  Settings.globalSetDefault('language', null); // ie use browser default language

  Promise.all([locStr.loadStrings(Settings.global.language), GameClasses.loadClasses(), Icons.loadIconConfigs(), MapLayer.loadConfigs()])
    .then(() => {

      // Load map based on hash parameters and clear it
      loadMap(new MapParam(browser.getHashAndClear()));

      // Keys mappings for pan and zoom map controls
      let bindings = {
        KeyA: ['x', +1], KeyD: ['x', -1],
        KeyW: ['y', +1], KeyS: ['y', -1],
        KeyT: ['z', +1], KeyG: ['z', -1],
      };

      // Keys currently pressed [code]=true
      let pressed = {};

      // Called every browser animation timestep following call to requestAnimationFrame
      function update() { // (timestep)
        let step = 100;
        let v = {};
        for (let key of Object.keys(bindings)) {
          if (pressed[key]) {
            let [dir, step] = bindings[key];
            v[dir] = (v[dir] || 0) + step;
          }
        }
        (v.x || v.y) && map.panBy([(-v.x || 0) * step, (-v.y || 0) * step], { animation: false });
        //v.z && map.setZoom(map.getZoom()+v.z/16, {duration: 1});
        window.requestAnimationFrame(update);
      }

      document.querySelector('#map').addEventListener('blur', function () {  // (e)
        pressed = {}; // prevent sticky keys
      });

      // When a key goes up remove it from the list 
      window.addEventListener('keyup', (e) => {
        delete pressed[e.code];
      });

      window.addEventListener("keydown", function (e) {
        //console.log(e, e.code);
        if (e.target.id.startsWith('searchtext')) {
          return;
        }
        if (Settings.global.buildMode) { return; }
        pressed[e.code] = true;
        switch (e.code) {
          case 'KeyF':        // F (no ctrl) to toggle fullscreen
            if (e.ctrlKey) {
              searchControl.expand(true);
              e.preventDefault();
            } else {
              map.toggleFullscreen();
            }
            break;
          case 'Slash':     // Ctrl+F or / to search
            searchControl.expand(true);
            e.preventDefault();
            break;
          case 'KeyR':
            if (!e.ctrlKey && !e.altKey) {
              const playerPos = MapObject.get('PlayerPosition');
              map.flyTo(playerPos ? [playerPos.o.lat, playerPos.o.lng] : MapLayer._layers[mapId].viewCenterLngLat);
            } else if (e.altKey) {
              SaveFileSystem.loadFileDialog();
            }
            break;
          case 'Digit1': reloadMap('sl'); break;
          case 'Digit2': reloadMap('slc'); break;
          case 'Digit3': reloadMap('siu'); break;
          case 'KeyT': map.zoomIn(1); break;
          case 'KeyG': map.zoomOut(1); break;
        }
      });

      window.requestAnimationFrame(update);
      //window.addEventListener('contextmenu', function(e) { e.stopPropagation()}, true); // enable default context menu
    }
    );
}
