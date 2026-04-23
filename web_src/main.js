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
import { MapObject } from './mapObject.jsx';
import { MapPins } from './mapPins.js';
import { L_Control_supraSearch } from './supraSearch.js';
import { L_supraMap } from './supraMap.js';
import { initSidepanelDom, renderSidepanel, destroySidepanel } from './sidepanel/renderSidepanel.jsx';

const skipConfirms = browser.isCode;

let map = null; // Leaflet map object containing current game map and all its markers

//=================================================================================================
// setupKeyControls

function setupKeyControls(map, searchControl) {
  // Keys currently pressed [code]=true
  let pressed = {};

  // Called every browser animation timestep following call to requestAnimationFrame
  function update() {
    // (timestep)
    // Keys mappings for pan and zoom map controls
    const bindings = {
      KeyA: ['x', +1],
      KeyD: ['x', -1],
      KeyW: ['y', +1],
      KeyS: ['y', -1],
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

  map.on('blur', function () {
    // (e)
    pressed = {}; // prevent sticky keys
  });

  // When a key goes up remove it from the list
  map.on('keyup', (e) => {
    delete pressed[e.originalEvent.code];
  });

  map.on(
    'keydown',
    function (e) {
      e = e.originalEvent;

      if (e.target.localName == 'input' || e.target.id.startsWith('searchtext')) {
        return;
      }

      pressed[e.code] = true;
      switch (e.code) {
        case 'KeyF': // F (no ctrl) to toggle fullscreen
          if (e.ctrlKey) {
            searchControl.expand(true);
            e.preventDefault();
          } else {
            map.toggleFullscreen();
          }
          break;
        case 'Slash': // Ctrl+F or / to search
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
        case 'Digit1':
          loadMap(new MapParam({ mapId: 'sl' }));
          break;
        case 'Digit2':
          loadMap(new MapParam({ mapId: 'slc' }));
          break;
        case 'Digit3':
          loadMap(new MapParam({ mapId: 'siu' }));
          break;
        case 'Digit4':
          loadMap(new MapParam({ mapId: 'sw' }));
          break;
        case 'KeyT':
          map.zoomIn(1);
          break;
        case 'KeyG':
          map.zoomOut(1);
          break;
      }
    },
    this
  );

  window.requestAnimationFrame(update);
}

//=================================================================================================
// loadMap
//
// Called when Window loads or base map changes
async function loadMap(mapParam) {
  // Protect against being called while in the middle of loading
  if (loadMap.isLoading) {
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
  renderSidepanel(map);

  map.on('baselayerchange', function (e) {
    if (map.mapId != e.options.layerId) {
      destroySidepanel();
      loadMap(new MapParam({ mapId: e.options.layerId }));
    }
  });

  // Add the tool bars to the map
  let subAction = L.Toolbar2.Action.extend({
    initialize: function (map, myAction) {
      this.map = map;
      this.myAction = myAction;
      L.Toolbar2.Action.prototype.initialize.call(this);
    },
    addHooks: function () {
      this.myAction.disable();
    },
  });
  new L.Toolbar2.Control({
    position: 'bottomleft',
    actions: [
      // build mode button
      L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: { html: '<i class="fa fa-map-pin"></i>', tooltip: 'Map pins' },
          subToolbar: new L.Toolbar2({
            actions: [
              subAction.extend({
                options: { toolbarIcon: { html: 'Add', tooltip: 'Adds new pin to map' } },
                addHooks: function () {
                  MapPins.add(map, { activateLayer: true });
                  subAction.prototype.addHooks.call(this); // closes sub-action
                },
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'clear', tooltip: 'Clears all pins added to map' } },
                addHooks: function () {
                  if (
                    MapPins.hasAny() &&
                    (skipConfirms || confirm('Are you sure you want to clear all custom pins?'))
                  ) {
                    MapPins.clearAll();
                  }
                  subAction.prototype.addHooks.call(this); // closes sub-action
                },
              }),
              subAction.extend({
                options: { toolbarIcon: { html: 'copy', tooltip: 'Copy pin positions to clip board' } },
                addHooks: function () {
                  MapPins.copyToClipboard();
                  subAction.prototype.addHooks.call(this); // closes sub-action
                },
              }),
              subAction.extend({
                options: { toolbarIcon: { html: '&times;', tooltip: 'Close' } },
              }),
            ],
          }),
        },
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
  setupKeyControls(map, searchControl);

  if (mapParam.hasAlt()) {
    MapObject.showAlt(mapParam.getAlt(), mapParam.getShow());
  }

  // This is a fix for the map tiles going black when you reactivate a tab/window containing
  // the map. If it happens zooming in/out or refreshing fixes it. Seems to be a problem with
  // leaflet - though I've not found a good reference discussing it.
  window.addEventListener('visibilitychange', () => {
    if (!window.document.hidden && map) {
      map.invalidateSize();
    }
  });

  // Done loading so ok to switch maps
  loadMap.isLoading = false;
} // end of loadmap

//=================================================================================================
window.onhashchange = function () {
  // (e)
  const mapParam = new MapParam(browser.getHashAndClear());

  if (!map || (mapParam.mapId && mapParam.mapId != map.mapId)) {
    loadMap(mapParam);
  } else if (mapParam.hasAlt()) {
    MapObject.showAlt(mapParam.getAlt(), mapParam.getShow());
  } else if (mapParam.hasView()) {
    map.setView(mapParam.getCenter(map.getCenter()), mapParam.getZoom(map.getZoom()));
  } else if (mapParam.hasBounds()) {
    map.fitBounds(mapParam.bounds);
  }
};

//=================================================================================================
window.onload = async function () {
  // (event)

  // Initialise/load settings
  Settings.init('sl');
  Settings.globalSetDefault('language', null); // ie use browser default language
  initSidepanelDom();

  // Initialise all the modules that load config from Json but are indepedent of map selection
  await Promise.all([
    locStr.loadStrings(Settings.global.language),
    GameClasses.loadClasses(),
    Icons.loadIconConfigs(),
    MapLayer.loadConfigs(),
  ]);

  // Load map based on hash parameters or defaults. Clearing location hash
  loadMap(new MapParam(browser.getHashAndClear()));
};
