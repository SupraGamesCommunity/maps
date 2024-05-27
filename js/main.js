"use strict";
/*global L, Papa, layerConfigs, gameClasses, UESaveObject*/

// Terminology,
// Class - The type of object represented by marker. Based on UE4 classes/blueprints 
// Layer - a toggleable set of data on the map (base map, overlays, groups of markers)
//         Leaflet calls it a LayerGroup 
// Marker - An individual icon displayed on the map with a specific position

var map = null;         // Leaflet map object containing current game map and all its markers
var mapId = '';         // Current map selected (one of sl, slc or siu)

// Data we store in the HTML Window localStorage property 
// Current mapId, markedItems[{markerId}:true] (found), activeLayers[{layer}:true] and playerPosition
const localDataName = 'supgragamescommunity_maps';
let localData = JSON.parse(localStorage.getItem(localDataName)) || {};

let layers = {};        // Leaflet layerGroup array, one for each collection of markers
let icons = {};         // Dict of Leaflet icon objects keyed by our icon file basename
let playerStart;        // Position of first player start instance found in map data
let playerMarker;       // Leaflet marker object for current player start (or dragged position)

let reloading;          // Flag used to prevent triggering reloading while already in progress

let searchControl = {}; // Leaflet control for searching
let settings;           // Reference to localData[mapId]


let mapCenter;
let mapParam = {};      // Parameters extracted from map URL

// Hard coded map data extracted from the games
const maps = {
  // data taken from the MapWorld* nodes
  'sl':  { 
    title: 'Supraland',
    "MapWorldCenter": { "X": 13000.0, "Y": -2000.0, "Z": 0.0 },
    "MapWorldSize": 175000.0,
    "MapWorldUpperLeft": { "X": -74500.0, "Y": -89500.0, "Z": 0.0 },
    "MapWorldLowerRight": { "X": 100500.0, "Y": 85500.0, "Z": 0.0 }
   },

  'slc': {
    title: 'Supraland Crash',
    "MapWorldCenter": { "X": 25991.0, "Y": -16.0, "Z": 0.0  },
    "MapWorldSize": 90112.0,
    "MapWorldUpperLeft": { "X": -19065.0, "Y": -45040.0, "Z": 0.0 },
    "MapWorldLowerRight": { "X": 71047.0, "Y": 45072.0, "Z": 0.0 }
   },

  'siu': {
    title: 'Supraland Six Inches Under',
    "MapWorldCenter": { "X": 0.0, "Y": -19000.0, "Z": 10000.0 },
    "MapWorldSize": 147456.0,
    "MapWorldUpperLeft": { "X": -73728.0, "Y": -92728.0, "Z": 10000.0 },
    "MapWorldLowerRight": { "X": 73728.0, "Y": 54728.0, "Z": 10000.0 }
   }
};

// Save the local state data we track to the window local storage
function saveSettings() {
  localStorage.setItem(localDataName, JSON.stringify(localData));
}

// Called when the search is cleared/cancelled to update searchText, save change
// and reflect changes in current marker draw state
function clearFilter() {
  settings.searchText = '';
  saveSettings();
  markItems();
}

// Generate our URL format based on current state
// {base url}#map={sl|slc|siu}&lat={lat}&lng={lng}
function getViewURL() {
  let base = window.location.href.replace(/#.*$/,'');
  let p = map.getCenter();
  let vars = {mapId:mapId, lat:Math.round(p.lat), lng:Math.round(p.lng), zoom:map.getZoom()};
  return base +'#' + Object.entries(vars).map(e=>e[0]+'='+encodeURIComponent(e[1])).join('&');
}

function copyToClipboard(text) {
  let input = document.body.appendChild(document.createElement("input"));
  input.value = text;
  input.focus();
  input.select();
  document.execCommand('copy');
  input.parentNode.removeChild(input);
  console.log(text + ' copied to clipboard');
}

function openLoadFileDialog() {
  document.querySelector('#file').value = null;
  document.querySelector('#file').accept = '.sav';
  document.querySelector('#file').click();
}

// Called when Window loads and when base map changes, loads currently select mapId
function loadMap(id) {

  mapId = id;

  // Make sure localStorage contains a good set of defaults
  for (let id in maps) {
    //var title = maps[id].title;
    if (!localData[id]) {
      localData[id] = {};
    }
    if (!localData[id].markedItems) {
      localData[id].markedItems = {};
    }
    if (!localData[id].searchText) {
      localData[id].searchText = '';
    }
    if (!localData[id].activeLayers) {
      localData[id].activeLayers = layerConfigs.getDefaultActive(mapId);
    }
  }

  localData.mapId = mapId;
  saveSettings();

  settings = localData[mapId];

  //console.log(localData);

  var mapSize = {width: 8192, height: 8192}
  var tileSize   = {x: 512, y: 512};
  var tileMaxSet = 4;
  var mapMinResolution = Math.pow(2, tileMaxSet);

  document.querySelector('#map').style.backgroundColor = mapId=='siu' ? '#141414' : '#000';

  var p = maps[mapId];

  // fixes 404 errors
  p.MapWorldUpperLeft.X  += 1;
  p.MapWorldUpperLeft.Y += 1;
  p.MapWorldLowerRight.X -= 1;
  p.MapWorldLowerRight.Y -= 1;

  let mapBounds = [
    [ p.MapWorldUpperLeft.Y, p.MapWorldUpperLeft.X ],
    [ p.MapWorldLowerRight.Y, p.MapWorldLowerRight.X ]
  ];

  var m = p.MapWorldSize / mapSize.width;
  var mapScale   = {x: 1.0/m, y: 1.0/m};
  var mapOrigin  = {x: -p.MapWorldUpperLeft.X * mapScale.x, y: -p.MapWorldUpperLeft.Y * mapScale.y};

  // Create a coordinate system for the map
  var crs = L.CRS.Simple;
  crs.transformation = new L.Transformation(mapScale.x, mapOrigin.x, mapScale.y, mapOrigin.y);
  crs.scale = function (zoom) { return Math.pow(2, zoom) / mapMinResolution; };
  crs.zoom = function (scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };

  mapCenter = [p.MapWorldCenter.Y, p.MapWorldCenter.X];

  let gap = p.MapWorldSize/2;

  // Create the base map
  map = new L.Map('map', {
    crs: crs,
    fadeAnimation: false,
    maxZoom: 8,
    maxBounds: [
      [ p.MapWorldUpperLeft.Y - gap, p.MapWorldUpperLeft.X - gap ],
      [ p.MapWorldLowerRight.Y + gap, p.MapWorldLowerRight.X + gap ]
    ],
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomright'}).addTo(map);
  L.control.fullscreen({ position: 'bottomright', forceSeparateButton: true}).addTo(map);

  let layerOptions = {
      tileSize: L.point(tileSize.x, tileSize.y),
      noWrap: true,
      tms: false,
      updateInterval: -1,
      keepBuffer: 16,
      maxNativeZoom: 4,
      nativeZooms: [0, 1, 2, 3, 4],
      bounds: mapBounds,
      attribution: '<a href="https://github.com/SupraGamesCommunity/SupraMaps" target="_blank">SupraGames Community</a>',
  };

  let layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright',
  });

  // eslint-disable-next-line no-unused-vars
  map.on('moveend zoomend', function(e) {
    settings.center = [map.getCenter().lat, map.getCenter().lng]; // avoid circular refs here
    settings.zoom = map.getZoom();
    saveSettings();
  });

  map.on('baselayerchange', function(e) {
    location.hash = '';
    map.off();
    map.remove();
    map = null;
    playerMarker = null;
    loadMap(e.layer.mapId);
  });

  map.on('overlayadd', function(e) {
    settings.activeLayers[e.layer.id] = true;
    // set alt for polylines (attributes are not populated to paths)
    if (layers[e.layer.id])
    for (const m of Object.values(layers[e.layer.id]._layers)) {
      if ((p = m._path)) {
        p.setAttribute('alt', m.options.alt);
      }
    }
    markItems();
    saveSettings();
  });

  map.on('overlayremove', function(e) {
    delete settings.activeLayers[e.layer.id];
    markItems();
    saveSettings();
  });

  let tilesDir = 'tiles/'+mapId;

  // L.tileLayer.canvas() is much faster than L.tileLayer() but requires a L.TileLayer.Canvas plugin
  // canvas also fixes a visible line between tiles
  let baseLayer = L.tileLayer.canvas(tilesDir+'/base/{z}/{x}/{y}.jpg', layerOptions).addTo(map);

  for (let id in maps) {
    var title = maps[id].title;
    var layer = id==mapId ? baseLayer : L.layerGroup();
    layer.mapId = id;
    layerControl.addBaseLayer(layer, title);
  }

  // Add overlay image map layers 
  layerConfigs.forEachOfType(mapId, "tiles", (layerId, layerConfig) => {
    let layer = L.tileLayer.canvas(tilesDir+'/'+layerId+'/{z}/{x}/{y}.png', layerOptions);
    layer.id = layerId;
    if (settings.activeLayers[layerId]) {
      layer.addTo(map);
    }
    layerControl.addOverlay(layer, layerConfig.name);
  });

  L.control.mousePosition().addTo(map);

  if (mapParam.lat && mapParam.lng && mapParam.zoom) {
    map.setView([mapParam.lat, mapParam.lng], mapParam.zoom);
    mapParam = {};
  } else if (settings.center && settings.zoom) {
    map.setView(settings.center, settings.zoom);
  } else {
    map.fitBounds(mapBounds);
  }

  let subAction = L.Toolbar2.Action.extend({
    initialize:function(map,myAction){this.map=map;this.myAction=myAction;L.Toolbar2.Action.prototype.initialize.call(this);},
    addHooks:function(){ this.myAction.disable(); }
  });

  new L.Toolbar2.Control({
      position: 'bottomleft',
      actions: [
        // share button
        L.Toolbar2.Action.extend({
          options: {
            toolbarIcon:{html: '&#x1F517;', tooltip: 'Share'},
            subToolbar: new L.Toolbar2({ 
              actions: [
                subAction.extend({
                  options:{toolbarIcon:{html:'Copy Map View URL', tooltip: 'Copies View URL to Clipboard'}},
                  addHooks:function() {
                    copyToClipboard(getViewURL());
                    subAction.prototype.addHooks.call(this); // closes sub-action
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'&times;', tooltip: 'Close'}}
                }),
              ],
            })
          }
        }),
        // load game button
        L.Toolbar2.Action.extend({
          options: {
            toolbarIcon:{html: '&#x1F4C1;', tooltip: 'Load Game'},
            subToolbar: new L.Toolbar2({ 
              actions: [
                subAction.extend({
                  options:{toolbarIcon:{html:'Load Game', tooltip: 'Load game save (*.sav) to mark collected items (Alt+F)'}},
                  addHooks: function () {
                    openLoadFileDialog();
                    subAction.prototype.addHooks.call(this);
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'Copy Path', tooltip: 'Copy default Windows game save file path to clipboard'}},
                  addHooks:function() {
                    copyToClipboard('%LocalAppData%\\Supraland'+(mapId=='siu' ? 'SIU':'')+'\\Saved\\SaveGames');
                    subAction.prototype.addHooks.call(this);
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'Unmark All', tooltip: 'Unmark all items'}},
                  addHooks: function () { 
                    if (confirm('Are you sure to unmark all items?')) {
                      unmarkItems();
                      saveSettings();
                    }
                    subAction.prototype.addHooks.call(this);
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'&times;', tooltip: 'Close'}}
                }),
              ],
            })
          }
        }),
      ],
  }).addTo(map);

  function onContextMenu(e) {
    let markerId = e.target.options.alt;
    let found = settings.markedItems[markerId]==true;
    window.markItemFound(markerId, !found);
    e.target.closePopup();
  }

  function onPopupOpen(e) {
    let x = e.popup._source._latlng.lng;
    let y = e.popup._source._latlng.lat;
    let markerId = e.popup._source.options.alt;

    let dist = Infinity;
    let res = null;
    let o = e.popup._source.options.o;

    let text = JSON.stringify(o, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;');
    let found = settings.markedItems[markerId]==true
    let value = found ? 'checked' : '';

    //let base = window.location.href.replace(/#.*$/,'');
    //let vars = {mapId:mapId, lat:Math.round(map.getCenter().lat), lng:Math.round(map.getCenter().lng), zoom:map.getZoom()};
    //let url = base +'#' + Object.entries(vars).map(e=>e[0]+'='+encodeURIComponent(e[1])).join('&');
    //let a = '<a href="'+url+'" onclick="return false">Map URL</a>';

    // it's not "found" but rather "removed" (e.g. BuySword2_2 in the beginning of Crash DLC)
    text += '<br><br><input type="checkbox" id="'+markerId+'" '+value+' onclick=window.markItemFound("'+markerId+'",this.checked)><label for="'+markerId+'">Found</label>';
    e.popup.setContent(text);

    for (const lookup of ['chests.csv', 'collectables.csv', 'shops.csv']) {
      let filename = 'data/legacy/' + mapId + '/'+lookup;
      // eslint-disable-next-line no-unused-vars
      Papa.parse(filename, { download: true, header: true, complete: function(results, filename) {
        for (let o of results.data) {
          if (!o.x) {
            continue;
          }
          let d = Math.pow(  Math.pow(o.x-x, 2) + Math.pow(o.y-y, 2), 0.5);
          if (d<dist) {
            dist = d;
            res = o;
          }
        }
        if (dist<1000 && res.ytVideo) {
          let url = 'https://youtu.be/'+res.ytVideo+'&?t='+res.ytStart;
          e.popup.setContent(text + '<br><br><a href="'+url+'" target=_blank>'+url+'</a>');
        }
      }});
    }
  }

  function getMarkerColor(o) {
    return o.color ? o.color : '#888';
  }

  function loadMarkers() {
    for (const fname of ['markers','custom-markers'])
    fetch('data/'+fname+'.'+mapId+'.json')
      .then((response) => response.json())
      .then((j) => {
        let other_pipes = new Set();
        let titles = {};

        let enabledLayers = layerConfigs.getEnabledLayers(mapId) 
        for(let o of j) {

          // Unique name
          let alt = o.area + ':' + o.name;

          // skip markers out of bounds (e.g. "PipesystemNew_AboveSewer" in DLC2_Area0)
          let [[top,left],[bottom,right]] = mapBounds;
          if (! (o.lng>left && o.lng<right && o.lat>top && o.lat<bottom )) {
            continue;
          }

          // check if class is in the gameClasses list
          let c = gameClasses[o.type];
          if (c) {
            let text = ''; // Set it on demand in onPopupOpen (as it's potentially slow for now)

            let title = o.name;
            // Can't have duplicate titles in search
            // Map area + name would be unique
            if (titles[title]) {
              title = o.area + ':' + o.name;
            }
            titles[title] = title;

            title += ' of ' + o.type;
            
            if(o.coins) {
              title += o.coins == 0 ? " [free]" : ` [${o.coins} coin${o.coins > 1 ? "s":""}]`;
            } else if(o.spawns) {
              title += ` (${o.spawns.slice(o.spawns.startsWith("_") ? 1 : 0)})`;
            }

            const defaultIcon = 'question_mark';
            
            if(c.nospoiler && enabledLayers[c.nospoiler])
            {
              const layer = c.nospoiler;
              const layerConfig = layerConfigs.get(layer);
              const icon = layerConfig.defaultIcon || defaultIcon;
              const zIndexOffset = 10 * layerConfig.index * 10;

              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: zIndexOffset, alt: alt, o:o, layerId:layer })
                .addTo(layers[layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            }

            if(c.layer && enabledLayers[c.layer])
            {
              const layer = c.layer;
              const layerConfig = layerConfigs.get(layer);
              const icon = o.icon || c.icon || layerConfigs.defaultIcon || defaultIcon;
              const zIndexOffset = 10 * layerConfig.index * 10;
              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: zIndexOffset, alt: alt, o:o, layerId:layer })
                .addTo(layers[layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            }

            // Add spawned object to appropriate layer
            let sc;
            if(o.spawns) {
              sc = gameClasses[o.spawns];
            }
            if(o.spawns && (sc = gameClasses[o.spawns]) && enabledLayers[sc.layer])
            {
              const layerConfig = layerConfigs.get(sc.layer);
              const icon = sc.icon || layerConfig.defaultIcon || defaultIcon;
              const zIndexOffset = 10 * layerConfig.index * 10;
              L.marker([o.lat, o.lng], {icon: getIcon(icon), title: title, zIndexOffset: zIndexOffset, alt: alt, o:o, layerId:sc.layer })
                .addTo(layers[sc.layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            }

            // Add a polyline to the appropriate layer
            if(c.lines && enabledLayers[c.lines] && o.target && o.color ) {
              let add_line = true;

              if(o.other_pipe)
                if(other_pipes.has(alt)) {
                  other_pipes.delete(alt);
                  add_line = false;
                }
                else
                  other_pipes.add(alt);

              let color = getMarkerColor(o);
              L.circleMarker([o.lat, o.lng], {radius: 6, fillOpacity: 1, weight: 0, color: 'black', fillColor: color, title: title, o:o, alt: alt})
                .addTo(layers[c.lines]).bindPopup('').on('popupopen', onPopupOpen).on('contextmenu',onContextMenu);
  
              if(add_line) {

                // need to add title as a single space (leaflet search issue), but not the full title so it doesn't appear in search
                let line = L.polyline([[o.lat, o.lng],[o.target.y,o.target.x]], {weight: 4, title:' ', alt:alt, color: color})
                  .addTo(layers[c.lines]);
                line._path && line._path.setAttribute('alt', alt);
              }
            }
          } // End of all items that have gameClasses entries

          // Add dynamic player marker on top of PlayerStart icon
          if (o.type == 'PlayerStart' && !playerMarker) {
            playerStart = [o.lat, o.lng, o.alt];
            let t = new L.LatLng(o.lat, o.lng);
            let p = {}
            if ((p = settings.playerPosition)) {
              t = new L.LatLng(p[0], p[1]);
            }
            playerMarker = L.marker([t.lat, t.lng], {zIndexOffset: 10000, draggable: true, title: Math.round(t.lat)+', '+Math.round(t.lng), alt:'playerMarker'})
            .bindPopup()
            .on('moveend', function(e) {
              let marker = e.target;
              let t = marker.getLatLng();
              settings.playerPosition = [t.lat, t.lng, 0];
              saveSettings();
              e.target._icon.title = Math.round(t.lat)+', '+Math.round(t.lng)
            })
            .on('popupopen', function(e) {
                let marker = e.target;
                let t = marker.getLatLng();
                t = {name:'playerPosition', lat:Math.round(t.lat), lng:Math.round(t.lng)};
                marker.setPopupContent(JSON.stringify(t, null, 2).replaceAll('\n','<br>').replaceAll(' ','&nbsp;'));
                marker.openPopup();
            }).addTo(map)
          }
        } // end of loop

        markItems();
    });
  }

  function loadLayers() {
    playerMarker = null;

    let activeLayers = [];
    let inactiveLayers = [];
    let searchLayers = [];

    layerConfigs.forEachOfType(mapId, 'markers', (id, lc) => {
      let layerObj = L.layerGroup();
      layerObj.id = id;

      if (settings.activeLayers[id]) {
        layerObj.addTo(map);
        activeLayers.push(layerObj);
      } else {
        inactiveLayers.push(layerObj);
      }

      layers[id] = layerObj;
      layerControl.addOverlay(layerObj, lc.name);
      searchLayers.push(layerObj);
    })

    // search
    let searchControl = new L.Control.Search({
        layer: L.featureGroup(searchLayers),
        marker: false, // no red circle
        initial: false, // search any substring
        firstTipSubmit: false, // use first autosuggest
        autoCollapse: false,
        tipAutoSubmit: false, //auto map panTo when click on tooltip
        tooltipLimit: -1,
        textPlaceholder: 'Search (Enter to save search phrase)',
    }).addTo(map);

    // workaround: search reveals all layers, hide all inactive layers
    for (let layerObj of inactiveLayers) {
      map.removeLayer(layerObj);
    }

    // filter items by saved query value
    markItems();

    searchControl._handleSubmit = function(){
      settings.searchText = this._input.value;
      map.closePopup();
      saveSettings();
      markItems();
      this._input.select();
    }

    document.querySelector('.search-cancel').addEventListener('click', clearFilter);
    searchControl._input.addEventListener('focus', function(e) { setTimeout(function(e){ e.target.select(); },50,e); } );
    searchControl._input.addEventListener('input', addSearchCallbacks);

    // item clicked in a dropdown list
    function clickItem(text, collapse=false) {
      let loc;
      if ((loc = searchControl._getLocation(text))) {
        searchControl.showLocation(loc, text);
        searchControl.fire('search:locationfound', { latlng: loc, text: text, layer:loc.layer });
        collapse && searchControl.collapse();
      }
    }

    // add click callbacks to dropdown list after input events, wait 1500 ms so it could reload items
    function addSearchCallbacks(){
      setTimeout(function() {
        let divs = document.querySelectorAll('.search-tip');
        [].forEach.call(divs, function(div) {
          div.addEventListener('click', function (e) { clickItem(e.target.innerText); e.preventDefault(); })
          div.addEventListener('dblclick', function (e) { clickItem(e.target.innerText, true); e.preventDefault(); })
        })
      }, 1500)
    }

    // fired after search control focused on the item
    searchControl.on('search:locationfound', function (e) {
        if (e.layer._popup) {
          // reveal layer on click
          layers[e.layer.options.layerId].addTo(map);
          e.layer.openPopup();
        }
    });

    // fired when input control is expanded (not the dropdown list)
    searchControl.on('search:expanded', function (e) {
      searchControl._input.value = settings.searchText;
      searchControl.searchText(settings.searchText);
      addSearchCallbacks();
    });
    // end of search

    loadMarkers();

    layerControl.addTo(map); // triggers baselayerchange, so called in the end
  }

  loadLayers();
} // end of loadmap

// Change current map loaded (if not currently reloading)
function reloadMap(id) {
  if (!reloading && mapId != id) {
    reloading = true;
    map.fireEvent('baselayerchange',{layer:{mapId:id}});
    setTimeout(function(){ reloading = false; }, 250);
  }
}

function getIconSize(zoom) {
  let s = [32];
  return s[Math.round(Math.min(zoom,s.length-1))];
}

function getIcon(icon) {
  let iconObj = icons[icon];
  if (!iconObj) {
    let s = getIconSize(map.getZoom());

    // For small coins, shrink them down to half the size 
    // TODO: This is a nasty hack hard coding the icon and assuming we only use it for small coins
    if (icon.includes("coin_small")) {
      s = s >> 1
    }
    let c = s >> 1;
    iconObj = L.icon({iconUrl: 'img/markers/'+icon+'.png', iconSize: [s,s], iconAnchor: [c,c]});
    icons[icon] = iconObj;
  }
  return iconObj;
}

/*
function resizeIcons() {
    map.eachLayer(function(layer) {
      if (layer instanceof L.Marker) {
        //let icon = layer.getIcon(); // undefined in 1.3
        let icon = layer.options.icon;
        if (icon.options.iconUrl!='marker-icon.png') {
          let s = getIconSize(map.getZoom());

          // For small coins, shrink them down to half the size 
          // TODO: This is a nasty hack hard coding the icon and assuming we only use it for small coins
          if(icon.options.iconUrl.includes("coin_small")) {
            s = s >> 1
          }
          let c = s >> 1;
          icon.options.iconSize = [s,s];
          icon.options.iconAnchor = [c,c];
          layer.setIcon(icon);
        }
      }
   });
  }
  */

window.markItemFound = function (id, found=true, save=true) {
  var divs = document.querySelectorAll('*[alt="' + id + '"]');

  [].forEach.call(divs, function(div) {
    if (found) {
      div.classList.add('found');
    } else {
      div.classList.remove('found');
    }
  });

  if (found) {
    settings.markedItems[id] = true;
  } else {
    delete settings.markedItems[id];
  }

  if (save) {
    saveSettings();
  }
}

function markItems() {
  for (const[id,value] of Object.entries(settings.markedItems)) {
    let divs = document.querySelectorAll('*[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.add('found');
    });
  }

  // filter by settings.searchText. caching is unreliable, just perform a full search here
  let lookup = {}
  if (settings.searchText) {
    for (const o of Object.values(searchControl._filterData(settings.searchText, searchControl._recordsFromLayer()))) {
      lookup[o.layer.options.alt] = true;
      // reveal layers on filter
      layers[o.layer.options.layerId].addTo(map);
    }
  }

  [].forEach.call(document.querySelectorAll('img.leaflet-marker-icon, path.leaflet-interactive'), function(div) {
    if (div.alt!='playerMarker') {
      let alt = div.getAttribute('alt');
      if (!settings.searchText || lookup[alt]) {
        div.classList.remove('hidden');
      } else {
        div.classList.add('hidden');
      }
    }
  });
}

function unmarkItems() {
  for (const[id,value] of Object.entries(settings.markedItems)) {
    var divs = document.querySelectorAll('*[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.remove('found');
    });
  }
  settings.markedItems={};
  settings.playerPosition = playerStart;
  if (playerMarker) {
    playerMarker.setLatLng(new L.LatLng(playerStart[0], playerStart[1]));
  }
}

window.loadSaveFile = function () {
  let file = document.querySelector('#file').files[0];

  let self = this;
  let ready = false;
  let result = '';

  const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  self.readAsArrayBuffer = async function() {
      while (ready === false) {
        await sleep(100);
      }
      return result;
  }

  const reader = new FileReader();

  reader.onloadend = function(evt) {

    let loadedSave;
    try {
      loadedSave = new UESaveObject(evt.target.result);
    } catch(e) {
      console.log(e);
      alert('Could not load file, incompatible format.');
      return;
    }

    //console.log(loadedSave);

    for (let section of ["ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever"]) {
      for (let o of loadedSave.Properties) {
        if (o.name != section) {
          continue;
        }
        for(let x of o.value.value) {
          // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
          let name = x.split(".").pop();
          let area = x.split("/").pop().split('.')[0];
          if (name != "None") {

            // do not mark jumppads and pipes for now
            if (name.includes('Jumppad') || name.includes('Pipesystem')) {
              //continue; // let's try inverting css rules for paths so activated are brighter

              console.log('activating', area +':' + name);
            }

            window.markItemFound(area + ':' + name, true, false);
          }
        }
      }
    }

    for (let o of loadedSave.Properties) {
      if (o.name == 'Player Position' && playerMarker) {
        //let c = [0,0,0]
        let p = o.value;

        if (o.value.type=='Transform' && o.value['Translation']) {
          p = o.value['Translation'].value;
        }

        if (p && p.x && p.y) {
          var latlng = new L.LatLng(p.y, p.x);
          //console.log('setting player position from file', mapId, latlng);
          playerMarker.setLatLng(latlng);
          settings.playerPosition = [p.y, p.x, p.z];
        } else {
          console.log('cannot load player position from', JSON.stringify(o));
        }

      }
    }

    //setTimeout(function(){alert('Loaded successfully. Marked ' + Object.keys(settings.markedItems).length + ' items')},250);
    console.log('Marked ' + Object.keys(settings.markedItems).length + ' items');

    saveSettings();

    ready = true;
  };

  if (file instanceof Blob) {
    reader.readAsArrayBuffer(file);
  }
}

window.onload = function(event) {
  if (location.hash.length>1) {
    for (const s of location.hash.slice(1).split('&')) {
      let [k,v] = s.split('=');
      mapParam[k] = v;
    }
  }

  // clear location hash
  history.pushState('', document.title, window.location.pathname + window.location.search);

  mapId = mapParam.mapId || localData.mapId || 'sl';

  loadMap(mapId);

  // Keys mappings for pan and zoom map controls
  let bindings = {
    KeyA:['x',+1],KeyD:['x',-1],
    KeyW:['y',+1],KeyS:['y',-1],
    KeyT:['z',+1],KeyG:['z',-1],
  };

  // Keys currently pressed [code]=true
  let pressed = {};

  // Called every browser animation timestep following call to requestAnimationFrame
  function update(timestep) {
    let step = 100;
    let v = {};
    for (let key of Object.keys(bindings)) {
      if (pressed[key]) {
        let [dir, step] = bindings[key];
        v[dir] = (v[dir]||0) + step;
      }
    }
    (v.x || v.y) && map.panBy([(-v.x||0)*step, (-v.y||0)*step], {animation: false});
    //v.z && map.setZoom(map.getZoom()+v.z/16, {duration: 1});
    window.requestAnimationFrame(update);
  }

  // When a key goes up remove it from the list 
  window.addEventListener('keyup', (e) => {
    delete pressed[e.code];
  });

  window.addEventListener("keydown",function (e) {
    //console.log(e, e.code);
    if (e.target.id.startsWith('searchtext')) {
      return;
    }
    pressed[e.code] = true;
    setTimeout(function(code){pressed[code]=false;},250,e.code); // prevent stuck keys
    switch (e.code) {
      case 'KeyF':        // F (no ctrl) to toggle fullscreen
        if(e.ctrlKey) {
          searchControl.expand(true);
          e.preventDefault();
        } else if(e.altKey){
          openLoadFileDialog();
          e.preventDefault();
        } else {
          map.toggleFullscreen();
        }
        break;
      case 'Slash':     // Ctrl+F or / to search
        searchControl.expand(true);
        e.preventDefault();
        break;
      case 'KeyR':if (!e.ctrlKey) map.flyTo(playerMarker ? playerMarker._latlng : mapCenter); break;
      case 'Digit1': reloadMap('sl'); break;
      case 'Digit2': reloadMap('slc'); break;
      case 'Digit3': reloadMap('siu'); break;
      case 'KeyT': map.zoomIn(1); break;
      case 'KeyG': map.zoomOut(1); break;
    }
  });

  document.querySelector('#file').onchange = function(e) {
    window.loadSaveFile();
  }

  window.requestAnimationFrame(update);
  window.addEventListener('contextmenu', function(e) { e.stopPropagation()}, true); // enable default context menu
}
