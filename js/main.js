/*eslint strict: ["error", "global"]*/
/*global L */

import { browser } from './utils.js';
import { Settings } from './settings.js';
import { locStr } from './locStr.js';
import { SaveFileSystem } from './saveFileSystem.js';
import { MapParam } from './mapParam.js';
import { Icons } from './icons.js';
import { GameClasses } from './gameClasses.js';
import { MapLayer } from './mapLayer.js';
import { MapObject } from './mapObject.js';
import { MapPins } from './mapPins.js';
import { L_Control_supraSearch } from './supraSearch.js';
import { L_supraMap } from './supraMap.js';

const skipConfirms = browser.isCode;

let map = null;         // Leaflet map object containing current game map and all its markers


//=================================================================================================
// BuildMode hanlding

export const buildMode = {
  marker: undefined,    // Current marker we're editing in Build Mode
  object: undefined,    // Current object we're editing in Build Mode
  objectChanges: [],    // Current object's changed values before they are committed to the list
  changeList: []        // Changes made in the current Build Mode session
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

//=================================================================================================
// setupKeyControls

function setupKeyControls(searchControl){
  // Keys currently pressed [code]=true
  let pressed = {};

  // Called every browser animation timestep following call to requestAnimationFrame
  function update() { // (timestep)
    // Keys mappings for pan and zoom map controls
    const bindings = {
      KeyA: ['x', +1], KeyD: ['x', -1],
      KeyW: ['y', +1], KeyS: ['y', -1],
      //KeyT: ['z', +1], KeyG: ['z', -1],   // Could be used for zoom
    };
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

  document.querySelector('#'+map._container.id).addEventListener('blur', function () {  // (e)
    pressed = {}; // prevent sticky keys
  });

  // When a key goes up remove it from the list 
  window.addEventListener('keyup', (e) => {
    delete pressed[e.code];
  });

  window.addEventListener("keydown", function (e) {
    if (e.target.id.startsWith('searchtext') || Settings.global.buildMode) {
      return;
    }

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
          map.flyTo(playerPos ? [playerPos.o.lat, playerPos.o.lng] : MapLayer._layers[map.mapId].viewCenterLngLat);
        } else if (e.altKey) {
          SaveFileSystem.loadFileDialog(map.mapId);
        }
        break;
      case 'Digit1': loadMap(new MapParam({ mapId: 'sl' })); break;
      case 'Digit2': loadMap(new MapParam({ mapId: 'slc' })); break;
      case 'Digit3': loadMap(new MapParam({ mapId: 'siu' })); break;
      case 'KeyT': map.zoomIn(1); break;
      case 'KeyG': map.zoomOut(1); break;
    }
  });

  window.requestAnimationFrame(update);
}

//=================================================================================================
// loadMap
//
// Called when Window loads or base map changes  
async function loadMap(mapParam) {

  // Protect against being called while in the middle of loading
  if(loadMap.isLoading){
    return;
  }
  loadMap.isLoading = true;

  // If we're already running, clear all the loadMap stuff
  if (map) {
    MapObject.resetAll();
    MapLayer.resetLayers();
    browser.clearLocationHash();
    map.off();
    map.remove();
    map = null;
  }

  // Create the map
  map = L_supraMap(mapParam);


  // Add zoom, fullscreen toggle and mousePosition controls to the map
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.fullscreen({ position: 'bottomright', forceSeparateButton: true }).addTo(map);
  L.control.mousePosition({ numDigits: 0, lngFirst: true }).addTo(map);


  // Sort out the layer configuration and create the layers
  MapLayer.setupLayers(map);


  // Add the layer control to the map
  const layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright',
  });

  MapLayer.forEachEnabled(map.mapId, (id, layer) => {
    if (layer.type == 'base') {
      layerControl.addBaseLayer(layer.layerObj, layer.name);
    }
    else {
      layerControl.addOverlay(layer.layerObj, layer.name);
    }
  });
  layerControl.addTo(map); // triggers baselayerchange which will be ignored

  map.on('baselayerchange', function (e) {
    if (map.mapId != e.layer.options.layerId) {
      loadMap(new MapParam({ mapId: e.layer.options.layerId }));
    }
  });


  // Add the tool bars to the map
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
                  MapPins.add(map, { activateLayer: true });
                  subAction.prototype.addHooks.call(this); // closes sub-action
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'clear', tooltip: 'Clears all pins added to map' } },
                addHooks: function () {
                  if (MapPins.hasAny() && (skipConfirms || confirm("Are you sure you want to clear all custom pins?"))) {
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
                  browser.copyTextToClipboard(MapParam.getViewURL(map));
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
                    SaveFileSystem.loadFileDialog(map.mapId);
                  }
                  subAction.prototype.addHooks.call(this);
                }
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'Copy File Path', tooltip: 'Copy default Windows game save file path to the Clipboard' } },
                addHooks: function () {
                  browser.copyTextToClipboard('%LocalAppData%\\Supraland' + (map.mapId == 'siu' ? 'SIU' : '') + '\\Saved\\SaveGames');
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


  // Add search control to the map
  Settings.mapSetDefault('searchText', '');

  const layerObjArray = [];
  MapLayer.forEachMarkers(map.mapId, (id, layer) => {
    if (id != 'coordinate') {
      layerObjArray.push(layer.layerObj);
    }
  });
  const searchLayer = L.layerGroup(layerObjArray);

  const searchControl = L_Control_supraSearch({ layer: searchLayer }).addTo(map);


  // Add the markers to the map
  await MapObject.loadObjects(map.mapId); 
  MapObject.initObjects(map);
  MapPins.restoreMapPins(map);


  // Setup keyboard controls
  setupKeyControls(searchControl);


  // Done loading so ok to switch maps
  loadMap.isLoading = false;

} // end of loadmap

//=================================================================================================
window.onhashchange = function () {   // (e)
  const mapParam = new MapParam(browser.getHashAndClear());

  if (mapParam.mapId && mapParam.mapId != map.mapId) {
    loadMap(mapParam);
  }
  else if (mapParam.hasView()) {
    map.setView(mapParam.getCenter(map.getCenter()), mapParam.getZoom(map.getZoom()));
  }
  else if (mapParam.hasBounds()) {
    map.fitBounds(mapParam.bounds);
  }
}

//=================================================================================================
window.onload = async function () {    // (event)

  // Initialise/load settings
  Settings.init('sl');
  Settings.globalSetDefault('language', null); // ie use browser default language
  
  // Initialise all the modules that load config from Json but are indepedent of map selection
  await Promise.all([locStr.loadStrings(Settings.global.language), GameClasses.loadClasses(), Icons.loadIconConfigs(), MapLayer.loadConfigs()]);

  // Load map based on hash parameters or defaults. Clearing location hash
  loadMap(new MapParam(browser.getHashAndClear()));
}
