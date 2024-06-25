/*eslint strict: ["error", "global"]*/
/*global L, UESaveObject*/
/*global layerConfigs*/
/*global gameClasses, gameClassesInit, defaultGameClass, decodeIconName, getClassIcon, getObjectIcon, locStr*/

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
let icons = {};         // Dict of Leaflet icon obj, defSize, size  keyed by our icon file basename + size
let playerStart;        // Position of first player start instance found in map data
let playerMarker;       // Leaflet marker object for current player start (or dragged position)

let reloading;          // Flag used to prevent triggering reloading while already in progress

let settings;           // Reference to localData[mapId]
let mapCenter;
let mapParam = {};      // Parameters extracted from map URL
let objects = {};
let markers = {};
let coin2stack = {};    // Map from coin name to coin stack
let searchControl;      // Leaflet control for searching

let currentMarkerReference;             // Current marker we're editing in Build Mode
let currentBuildReference;              // Current object we're editing in Build Mode
let currentBuildReferenceChanges = [];  // Current object's changed values before they are committed to the list
let buildModeChangeList = [];           // Changes made in the current Build Mode session

// Hard coded map data extracted from the games
var maps = {
  // data taken from the MapWorld* nodes
  'sl':  { 
      title: 'Supraland',
      "MapWorldCenter": { "X": 13000.0, "Y": -2000.0, "Z": 0.0 },
      "MapWorldSize": 175000.0,
      "MapWorldUpperLeft": { "X": -74500.0, "Y": -89500.0, "Z": 0.0 },
      "MapWorldLowerRight": { "X": 100500.0, "Y": 85500.0, "Z": 0.0 },
   },

  'slc': {
    title: 'Supraland Crash',
      "MapWorldCenter": { "X": 25991.0, "Y": -16.0, "Z": 0.0  },
      "MapWorldSize": 90112.0,
      "MapWorldUpperLeft": { "X": -19065.0, "Y": -45040.0, "Z": 0.0 },
      "MapWorldLowerRight": { "X": 71047.0, "Y": 45072.0, "Z": 0.0 },
   },

  'siu': {
      title: 'Supraland Six Inches Under',
      "MapWorldCenter": { "X": 0.0, "Y": -19000.0, "Z": 10000.0 },
      "MapWorldSize": 147456.0,
      "MapWorldUpperLeft": { "X": -73728.0, "Y": -92728.0, "Z": 10000.0 },
      "MapWorldLowerRight": { "X": 73728.0, "Y": 54728.0, "Z": 10000.0 },
   },
};

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key])
          Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}


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
  let input = document.body.appendChild(document.createElement("textarea"));    //Changed from input to textarea so it honors newline characters
  input.value = text;
  input.focus();
  input.select();
  document.execCommand('copy');
  input.parentNode.removeChild(input);
  //console.log(text + ' copied to clipboard');
}

function openLoadFileDialog() {
  document.querySelector('#file').value = null;
  document.querySelector('#file').accept = '.sav';
  document.querySelector('#file').click();
}

function toggleBuildMode() {
  if(!settings.buildMode){ settings.buildMode = false }
  settings.buildMode = !settings.buildMode;
  alert('Build mode is now set to ' + settings.buildMode + '.');
}

function updateBuildModeValue() {
  let el = window.event.srcElement;
  currentBuildReference[el.id] = el.value;
  currentBuildReferenceChanges[currentBuildReference.area + ':'+ currentBuildReference.name + '|' + el.id] = el.value;
  //alert(currentBuildReference.name + ' property ' + el.id + ' changed from ' + el.defaultValue + ' to ' + el.value + '.');
}

function commitCurrentBuildModeChanges() {
  Object.getOwnPropertyNames(currentBuildReferenceChanges).forEach(
    function (i) {
      buildModeChangeList[i] = currentBuildReferenceChanges[i];
    }
  );
  let newLat = currentBuildReference.lat;
  let newLng = currentBuildReference.lng;

  currentMarkerReference.setLatLng(new L.LatLng(newLat, newLng)).update();
  currentBuildReferenceChanges = [];
  map.closePopup();
}

function exportBuildChanges() {
  // It might be worth accummulating the changes in this structure as we make them, but this works
  let jsonobj = {}
  Object.getOwnPropertyNames(buildModeChangeList).filter(function(e) { return e !== 'length' }).forEach(
    function(k){
      let alt, prop, area, name;
      [alt, prop] = k.split('|');
      [area, name] = alt.split(':');
      if(!jsonobj[alt]){
        jsonobj[alt] = {}
      }
      jsonobj[alt][name] = name;
      jsonobj[alt][area] = area;
      jsonobj[alt][prop] = buildModeChangeList[k];
  });
  jsonobj = Object.values(jsonobj);

  console.log(buildModeChangeList);
  let t = JSON.stringify(jsonobj, null, 2)
  copyToClipboard(t);
  alert('Build mode changes have been placed on the clipboard.');
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
    if (!localData[id].coinsFound) {
      localData[id].coinsFound = {};
    }
    if (!localData[id].searchText) {
      localData[id].searchText = '';
    }
    if (!localData[id].activeLayers) {
      localData[id].activeLayers = layerConfigs.getDefaultActive(mapId);
    }
    if (!localData[id].buildMode) {
      localData[id].buildMode = false;
    }
  }

  localData.mapId = mapId;
  saveSettings();

  settings = localData[mapId];

  icons = {}
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

  let gap = p.MapWorldSize/2;
  let mapBoundsWithGap = [
    [ p.MapWorldUpperLeft.Y*0- gap, p.MapWorldUpperLeft.X - gap ],
    [ p.MapWorldLowerRight.Y*0 + gap, p.MapWorldLowerRight.X + gap ]
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

  // Create the base map
  map = new L.Map('map', {
    crs: crs,
    fadeAnimation: true,
  	minZoom: 1,
    maxZoom: 8,
    maxBounds: mapBoundsWithGap, // elastic-y bounds + elastic-x bounds
    zoomControl: false,
    doubleClickZoom: true,
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
      attribution: '<a href="https://github.com/SupraGamesCommunity/maps" target="_blank">SupraGames Community</a>',
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
    if(e.type == 'zoomend'){
      resizeIcons();
    updatePolylines();
    markItems();
    }
});

  map.on('baselayerchange', function(e) {
    location.hash = '';
    map.off();
    map.remove();
    map = null;
    playerMarker = null;
    loadMap(e.layer.mapId);
  });

  function updatePolylines() {
    // set alt for polylines (attributes are not populated to paths)
    for (const m of Object.values(map._layers)) {
      if ((p = m._path)) {
        p.setAttribute('alt', m.options.alt);
      }
    }
  }

  map.on('overlayadd', function(e) {
    settings.activeLayers[e.layer.id] = true;
    updatePolylines();
    markItems();
    saveSettings();
    resizeIcons(true);

    // let's maybe clear search on layer change just to avoid confusion
    // clearFilter(); // can't really do that, search also opens layers
  });

  map.on('overlayremove', function(e) {
    delete settings.activeLayers[e.layer.id];
    markItems();
    saveSettings();
  });

  let tilesDir = 'tiles/'+mapId;

  // L.tileLayer.canvas() is much faster than L.tileLayer() but requires a L.TileLayer.Canvas plugin
  // canvas also fixes a visible line between tiles
  // However on Firefox it makes the lines much worsel, so we choose based on which browser
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

  let baseLayer;
  if(isFirefox)
    baseLayer = L.tileLayer(tilesDir+'/base/{z}/{x}/{y}.jpg', layerOptions).addTo(map);
  else
    baseLayer = L.tileLayer.canvas(tilesDir+'/base/{z}/{x}/{y}.jpg', layerOptions).addTo(map);

  for (let id in maps) {
    var title = maps[id].title;
    var layer = id==mapId ? baseLayer : L.layerGroup();
    layer.mapId = id;
    layerControl.addBaseLayer(layer, title);
  }

  // Add overlay image map layers 
  layerConfigs.forEachOfType(mapId, "tiles", (layerId, layerConfig) => {
    let layer;
    if(isFirefox)
      layer = L.tileLayer(tilesDir+'/'+layerId+'/{z}/{x}/{y}.png', layerOptions);
    else
      layer = L.tileLayer.canvas(tilesDir+'/'+layerId+'/{z}/{x}/{y}.png', layerOptions);
    layer.id = layerId;
    if (settings.activeLayers[layerId]) {
      layer.addTo(map);
    }
    layerControl.addOverlay(layer, layerConfig.name);
  });

  L.control.mousePosition({numDigits:0, lngFirst:true}).addTo(map);

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
        // build mode button
        L.Toolbar2.Action.extend({
          options: {
            toolbarIcon:{html: '&#128295;&#x1F527;', tooltip: 'Developer Mode'},
            subToolbar: new L.Toolbar2({ 
              actions: [
                subAction.extend({
                  options:{toolbarIcon:{html:'Toggle', tooltip: 'Toggles Developer mode on or off'}},
                  addHooks:function() {
                    toggleBuildMode();
                    subAction.prototype.addHooks.call(this); // closes sub-action
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'Copy Changes', tooltip: 'Copies the changes made in this session to the Clipboard'}},
                  addHooks:function() {
                    exportBuildChanges();
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
        // share button
        L.Toolbar2.Action.extend({
          options: {
            toolbarIcon:{html: '&#x1F517;', tooltip: 'Share'},
            subToolbar: new L.Toolbar2({ 
              actions: [
                subAction.extend({
                  options:{toolbarIcon:{html:'Copy Map View URL', tooltip: 'Copies View URL to the Clipboard'}},
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
            toolbarIcon:{html: '&#x1F4C1;', tooltip: 'Browse...'},
            subToolbar: new L.Toolbar2({ 
              actions: [
                subAction.extend({
                  options:{toolbarIcon:{html:'Browse...', tooltip: 'Load game save (*.sav) to mark collected items (Alt+R)'}},
                  addHooks: function () {
                    openLoadFileDialog();
                    subAction.prototype.addHooks.call(this);
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'Copy File Path', tooltip: 'Copy default Windows game save file path to the Clipboard'}},
                  addHooks:function() {
                    copyToClipboard('%LocalAppData%\\Supraland'+(mapId=='siu' ? 'SIU':'')+'\\Saved\\SaveGames');
                    subAction.prototype.addHooks.call(this);
                  }
                }),
                subAction.extend({
                  options:{toolbarIcon:{html:'Unmark Found', tooltip: 'Unmark all found items'}},
                  addHooks: function () { 
                    if (confirm('Are you sure to unmark all found items?')) {
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
    // We don't need to use _source as target and sourceTarget both point at the marker object
    //let x = e.popup._source._latlng.lng;
    //let y = e.popup._source._latlng.lat;
    let markerId = e.popup._source.options.alt;

    let o = e.popup._source.options.o;

    currentMarkerReference = e.popup._source;
    currentBuildReference = o;

    let text = ''
    text += `<div class="marker-popup-heading">${locStr.friendly(o, o.type, mapId) || o.type}</div>`
    text += '<div class="marker-popup-text">'
    if(o.spawns) {
      text += `<br><span class="marker-popup-col">Contains:</span><span class="marker-popup-col2">${locStr.friendly(null, o.spawns, mapId) || o.spawns}</span>`;
    }
    if(o.coins) {
      text += `<br><span class="marker-popup-col">Coins:</span>${o.coins} coin${o.coins > 1 ? "s":""}`;
    }
    if(o.scrapamount) {
      text += `<br><span class="marker-popup-col">Amount:</span>${o.scrapamount} scrap`;
    }
    if(o.cost) {
      let price_type = (o.price_type in price_types ? o.price_type : 0);
      text += `<br><span class="marker-popup-col">Price:</span>${o.cost} ${price_types[price_type]}${o.cost != 1 && price_type != 5 ? 's':''}`;  // No s on plural of scrap
    }
    for(let f of ['variant', 'loop']){
      if(o[f]){
        text += `<br><span class="marker-popup-col">${f.charAt(0).toUpperCase() + f.slice(1)}:</span>${o[f]}`;
      }
    }
    if(o.description || (gameClasses[o.type] || defaultGameClass).description) {
      text += `<br><span class="marker-popup-col">Description:</span><span class="marker-popup-col2">${locStr.description(o, o.type, mapId)}</span>`;
    }
    if(o.comment) {
      text += `<br><span class="marker-popup-col">Comment:</span><span class="marker-popup-col2">${o.comment}</span>`;
    }
    text += `<br><span class="marker-popup-col">XYZ pos:</span>(${o.lng.toFixed(0)}, ${o.lat.toFixed(0)}, ${o.alt.toFixed(0)})`
  
    text += '<br><br></div>'

    if(o.yt_video) {
      let ytSrc = 'https://www.youtube-nocookie.com/embed/' + o.yt_video + '?controls=0';
      if (o.yt_start) ytSrc += '&start=' + o.yt_start;
      if (o.yt_end) ytSrc += '&end=' + o.yt_end;

      text = text + '<iframe width="300" height="169" src="' + ytSrc
        + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
    }

    //text += '<div class="marker-popup-subheading">' + o.area + '</div><br>'
    //text += '<br><br><div class="marker-popup-footnote">Lat: ' + o.lat + '<br>Lng: ' + o.lng + '<br>Alt: ' + o.alt + '</div>'
    //<p><span class="a">foo</span>  <span class="b">=</span>  <span class="c">"abcDeveloper"</span>

    // it's not "found" but rather "removed" (e.g. BuySword2_2 in the beginning of Crash DLC)
    let found = (settings.markedItems[markerId] == true);
    let value = found ? 'checked' : '';
    text += '<div class="marker-popup-found">';
    text += `<input type="checkbox" id="${markerId}" ${value} onclick=window.markItemFound("${markerId}",this.checked)><label for="${markerId}">`
    text += 'Found</label></div>';

    //let base = window.location.href.replace(/#.*$/,'');
    //let vars = {mapId:mapId, lat:Math.round(map.getCenter().lat), lng:Math.round(map.getCenter().lng), zoom:map.getZoom()};
    //let url = base +'#' + Object.entries(vars).map(e=>e[0]+'='+encodeURIComponent(e[1])).join('&');
    //let a = '<a href="'+url+'" onclick="return false">Map URL</a>';

    if(settings.buildMode) {
      let json = JSON.stringify(o, null, 2)
      json = json.substring(json.indexOf('\n'), json.lastIndexOf('}'));
      json = json.replaceAll('\n','<br>').replaceAll(' ','&nbsp;');
      text +=  '<div class="marker-popup-debug">' + json + '</div><br>'
    }

    if(settings.buildMode) {
      text += '<hr>';
      Object.getOwnPropertyNames(o).forEach(
        function (propName) {
          if(propName != 'name' && propName != 'area')
            text += '<br>' + propName + ': <input type="text" id="' + propName + '" onchange="updateBuildModeValue();" value="' + o[propName] + '"></input>';
        }
      );
      if(!o.yt_video){ text += '<br>yt_video: <input type="text" id="yt_video" onchange="updateBuildModeValue();" value=""></input>'; };
      if(!o.yt_start){ text += '<br>yt_start: <input type="text" id="yt_start" onchange="updateBuildModeValue();" value=""></input>'; };
      text += '<button onclick="commitCurrentBuildModeChanges();">Save</button>';
    }

//    e.target.setIcon(e.target.options.icon);
    e.popup.setContent(text);
  }

  const price_types = {
    0: 'coin',
    5: 'scrap',
    6: 'bone',
    7: 'red moon',
  }

  function parseRelativeOrAbsoluteValue(value) {
    if (typeof value === 'string' && value.indexOf('%') !== -1) {
        return {
            value: parseFloat(value) / 100,
            isInPixels: false,
        };
    }
    const parsedValue = value ? parseFloat(value) : 0;
    return {
        value: parsedValue,
        isInPixels: parsedValue > 0,
    };
}
  function loadMarkers() {

    // Extract line properties from CSS
    let lineTypeProps = {}
    for(let lt of ['jumppad red', 'jumppad blue', 'pipe', 'trigger', 'target']) {
      const div = $("<div>").addClass(`line-${lt}`).appendTo(document.body);
      let lineProps = {}
      for(let p of ['stroke', 'fill', 'opacity', 'fill-opacity', '--arrow', '--arrow-size', '--arrow-angle', '--arrow-dist',
            '--line-width', '--shadow-width', '--offset', '--end-offset']) {
        if(div.css(p)) {
          let val = div.css(p); 
          val = !isNaN(val) ? Number(val) : val.endsWith('px') ? Number(val.substring(0,val.length-2)) : val;
          val = typeof val == 'string' ? val.replace(/["']/g, '') : val;
          lineProps[p.replaceAll('-', '')] = val;
          
        }
      }
      lineTypeProps['line-'+lt.replace(' ', '_')] = lineProps;
      div.remove();
    }

    Promise.all([
        fetch(`data/markers.${mapId}.json`),
        fetch(`data/ytdata.${mapId}.json`),
        fetch(`data/custom-markers.${mapId}.json`)])
      .then(res => Promise.all(res.map(r => r.json())) )
      .then(([j, cmjyt, cmj]) => {
        let titles = {};
        objects = {};
        markers = {};
        coin2stack = {};

        // Build a look up table from alt id to objects 
        for(let o of j){
          let id = o.area + ':' + o.name;
          objects[id] = o;
        }

        function merge_cm(cm) {
          for(let co of cm){
            let alt = co.area + ':' + co.name;
            let o = objects[alt];
            if(o){
              mergeDeep(o, co);
            }
            else{
              objects[alt] = co;
              j.push(co)
            }
          }
        }
        merge_cm(cmjyt);
        merge_cm(cmj);

        let enabledLayers = layerConfigs.getEnabledLayers(mapId) 
        for(let o of j) {

          // skip markers out of bounds (e.g. the whole start area of the red town in SIU is not painted on the map)
          let [[top,left],[bottom,right]] = mapBounds;
          if (! (o.lng>left && o.lng<right && o.lat>top && o.lat<bottom )) {
            continue;
          }

          let c = gameClasses[o.type] || defaultGameClass;
          let sc = o.spawns ? (gameClasses[o.spawns] || defaultGameClass) : null;
          let text = ''; // Set it on demand in onPopupOpen (as it's potentially slow for now)
          let alt = o.area + ':' + o.name;

          let title;
          if(settings.buildMode){
            // Ensure the object name is unique
            title = titles[title] ? alt : o.name;
            titles[title] = title;

            // Add what it spawns
            if(o.spawns) {
              title += !('spawns_name' in o) ? ` (${o.spawns})` : o.spawns_name != '' ? ` (${o.spawns_name})` : '';    
            }
          }
          else {
            title = o.friendly || c.friendly || o.type;
            if(sc) {
              title += ` (${sc.friendly || o.spawns})`; 
            }
          }
          // Shouldn't be coins and spawns: so this is saying what's in it
          if(o.coins) {
            title += ` (${o.coins} coin${o.coins > 1 ? "s":""})`;
          }
          // Can have spawns and cost
          if(o.cost) {
            let price_type = (o.price_type in price_types ? o.price_type : 0);
            title += ` [${o.cost} ${price_types[price_type]}${o.cost != 1 && price_type != 5 ? 's':''}]`  // No s on plural of scrap
          }

          if(settings.buildMode) {
            // Add the type
            title += ' of ' + o.type;
          } else {
            // XY position is added to ensure it's unique
            title += ` (${o.lng.toFixed(0)},${o.lat.toFixed(0)})`
          }

          // For coin stacks we add each old_coin to a look up table
          if(o.old_coins){
            for(let c of Object.keys(o.old_coins)){
              coin2stack[o.area+':'+c] = o;
            }
          }

          const defaultIcon = 'question_mark';

          let start = [o.lat, o.lng];

          // I feel like this is a bit of a hack because it requires awareness of the layer names which
          // is supposed to be just data but I can't think of a better way to do it.
          // If an class is marked as shop channel but doesn't have a price in coins, bones or scrap
          // it wants to be on the collectable layer not the shop layer 
          let nospoiler = c.nospoiler != 'shop' || (o.cost && o.price_type != 7) ? c.nospoiler : 'collectable';
          if(nospoiler && enabledLayers[nospoiler])
          {
            const layer = nospoiler
            const layerConfig = layerConfigs.get(layer);
            const [icon, size] = decodeIconName(layerConfig.defaultIcon || defaultIcon, mapId, o.variant);

            const marker = L.marker(start, {icon: getIcon(icon, size), zIndexOffset: layerConfigs.getZIndexOffset(layer), title: title, alt: alt, o:o, layerId:layer})
              .addTo(layers[layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            markers[alt] = markers[alt] ? [...markers[alt], marker] : [marker];
          }
  
          // If there is a normal layer specified then add it to that
          if(c.layer && enabledLayers[c.layer])
          {
            const layer = c.layer
            const layerConfig = layerConfigs.get(layer);
            const [icon, size] = decodeIconName((o.icon || c.icon || layerConfig.defaultIcon || defaultIcon), mapId, o.variant);

            const marker = L.marker(start, {icon: getIcon(icon, size), zIndexOffset: layerConfigs.getZIndexOffset(layer), title: title, alt: alt, o:o, layerId:layer })
              .addTo(layers[layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            markers[alt] = markers[alt] ? [...markers[alt], marker] : [marker];
            }

          // Deal with layer for whatever it spawns. Normally things that spawn something don't have a spoiler layer
          if(sc && sc.layer && enabledLayers[sc.layer])
          {
            const layer = sc.layer
            const layerConfig = layerConfigs.get(layer);
            const [icon, size] = decodeIconName((o.icon || sc.icon || layerConfig.defaultIcon || defaultIcon), mapId, o.variant);

            const marker = L.marker(start, {icon: getIcon(icon, size), zIndexOffset: layerConfigs.getZIndexOffset(layer), title: title, alt: alt, o:o, layerId:layer})
              .addTo(layers[layer]).bindPopup(text).on('popupopen', onPopupOpen).on('contextmenu', onContextMenu);
            markers[alt] = markers[alt] ? [...markers[alt], marker] : [marker];
            }

          // Add a polyline to the appropriate layer
          if(c.lines && enabledLayers[c.lines] && o.linetype) {
            let endxys = o.linetype != 'trigger' ? [o.target] : o.targets;

            // need to add title as a single space (leaflet search issue), but not the full title so it doesn't appear in search

            const className = 'line-' + o.linetype + (o.linetype == 'jumppad' ? '_'+o.variant : '');
            let ltp = lineTypeProps[className];

            let options = {
              zIndexOffset: layerConfigs.getZIndexOffset(c.lines),
              title: ' ', interactive: false, alt: alt, o:o, layerId:c.lines, className: className,
              arrow: ltp.arrow ? ltp.arrow : 'none',
              arrowSize: ltp.arrowSize ? ltp.arrowSize : 0,
              arrowAngle: ltp.arrowngle ? ltp.arrowangle : 45,
              lineWidth: ltp.linewidth ? ltp.linewidth : 5,
              shadowWidth: ltp.shadowwidth ? ltp.shadowwidth : 3,
              offset: ltp.offset ? ltp.offset : 0,
              endOffset: ltp.endoffset ? ltp.endoffset : 0,
              color: ltp.stroke ? ltp.stroke : '#000',
              fillColor: ltp.fill ? ltp.fill : '#FFF',
            }
            if(o.twoway){
              options.arrow = 'none';
            }
            for(let endxy of endxys) {
              L.arrowLine(start, [endxy.y, endxy.x], options).addTo(layers[c.lines]);
            }
          }

          // add dynamic player marker on top of PlayerStart icon (moves with load save game) 
          if ((o.type == 'PlayerStart' || o.type == '_PlayerPosition') && !playerMarker) {
            const pc = gameClasses[o.type];
            if(pc.layer && enabledLayers[pc.layer])
            {
              o.type = '_PlayerPosition';
              const [icon, size] = getClassIcon(pc, mapId, o['variant']) || defaultIcon;
              playerStart = [o.lat, o.lng, o.alt];
              let title = `Player Position (${o.lng.toFixed(0)},${o.lat.toFixed(0)})`;
              let t = new L.LatLng(o.lat, o.lng);
              if (settings.playerPosition) {
                t = new L.LatLng(settings.playerPosition[0], settings.playerPosition[1]);
                [o.lat, o.lng, o.alt] = settings.playerPosition;
              }
              else {
                settings.playerPosition = playerStart;
              }
              playerMarker = L.marker([t.lat, t.lng], {icon: getIcon(icon,size), zIndexOffset: layerConfigs.backZIndexOffset, draggable: false, title: title, alt:'playerMarker', o:o, layerId:pc.layer})
                .bindPopup().on('popupopen', onPopupOpen).addTo(layers[pc.layer]);
            }
          } // end of player marker
        } // end of loop

        if(enabledLayers['coordinate']){
          L.marker(mapCenter, {zIndexOffset: layerConfigs.frontZIndexOffset, draggable: true, title: Math.round(mapCenter[1])+', '+Math.round(mapCenter[0]), alt:'XYMarker'})
            .bindPopup()
            .on('moveend', function(e) {
              let marker = e.target;
              let t = marker.getLatLng();
              e.target._icon.title = Math.round(t.lng)+', '+Math.round(t.lat)
            })
            .on('popupopen', function(e) {
                let marker = e.target;
                let t = marker.getLatLng();
                marker.setPopupContent(`(${Math.round(t.lng)}, ${Math.round(t.lat)})`);
                marker.openPopup();
            }).addTo(layers['coordinate'])
        }

        resizeIcons();
        updatePolylines();
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
    layers['_map'] = map;

    // search
    searchControl = new L.Control.Search({
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
      clickItem(this._input.value, false);
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
          // mark discovered items grey
          let loc;
          if ((loc = searchControl._getLocation(div.innerText))) {
            if (settings.markedItems[loc.layer.options.alt]) {
              div.style.color = '#bbb';
            }
          }
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

  // redraw paths on dragging (sets % of padding around viewport, may be performance issue)
  map.getRenderer(map).options.padding = 1;

} // end of loadmap

// Change current map loaded (if not currently reloading)
function reloadMap(id) {
  if (!reloading && mapId != id) {
    reloading = true;
    map.fireEvent('baselayerchange',{layer:{mapId:id}});
    setTimeout(function(){ reloading = false; }, 250);
  }
}

// Equation: pow(2, zoom * (log2(y0) / z1)) * y0
// z1 is the zoom level where we want scale to be 1:1 (so bigger it is the bigger icons are on higher zooms)
// s0 is the scale factor when zoom is 0 (so bigger it is bgger icons are overall)
const z1 = 3, s0 = 0.6;   // p = 0.33 for z1=3/s0=0.5; p=0.25 for z1=4/s0=0.5
const p = -Math.log2(s0) / z1;
function getIconSize(size, zoom) {
  return Math.round(size * Math.pow(2, zoom * p) * s0);;
}
  //Original solution
  //let scaleForZoom = [0.5,0.5,0.75,1,1,1,1.5,1.5,2];
  //let scaleForZoom = [0.5,0.63,0.79,1,1.26,1.59,2,2.52,3.17]
  //zoom = zoom < 0 ? 0 : zoom < scaleForZoom.length ? zoom : scaleForZoom.length-1;
  //return Math.round(size * scaleForZoom[zoom]);

// Returns leaflet object corresponding to icon base name + default size
function getIcon(icon, size=32) {
  const iconCls = icon + size.toString();
  let iconObj = icons[iconCls] && icons[iconCls].obj;
  if (!iconObj) {
    // We set the iconSize and iconAnchor via CSS in resizeIcons, when we also set the popupAnchor
    iconObj = L.icon({iconUrl: 'img/markers/'+icon+'.png', className:iconCls});

    // We will also set size entry to the zoom based size of the icon in resizeIcons
    icons[iconCls] = {obj: iconObj, baseSize: size};
}
  return iconObj;
}

function resizeIcons(force) {
  let zoom = map.getZoom();
  for(let [iconCls, iconData] of Object.entries(icons)){
    let size = getIconSize(iconData.baseSize, zoom);
    if(force || !iconData.size || iconData.size != size) {
      iconData.size = size;
      iconData.obj.options.popupAnchor = [0, -(size >> 1)];   // Top center relative to the marker icon center
      let s = size.toString() + 'px';
      let c = '-' + (size >> 1).toString() + 'px';
      $('#map .'+iconCls).css({'width':s, 'height':s, 'margin-left':c, 'margin-top':c});
    }
  }
}
  
window.markItemFound = function (id, found=true, save=true) {
  var divs = document.querySelectorAll('*[alt="' + id + '"]');
  [].forEach.call(divs, function(div) {
    if (found) {
      div.classList.add('found');
    } else {
      div.classList.remove('found');
    }
  });

  for(let m of markers[id]){
    m.setZIndexOffset(layerConfigs.getZIndexOffset(m.options.layerId, found));
  }

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
  for (let id of Object.keys(settings.markedItems)) {
    let divs = document.querySelectorAll('*[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.add('found');
    });
    if(markers[id]){
      for(let m of markers[id]){
        m.setZIndexOffset(layerConfigs.getZIndexOffset(m.options.layerId, true));
      }
    }
  }

  // filter by settings.searchText. caching is unreliable, just perform a full search here
  let lookup = {}
  if (settings.searchText && searchControl) {
    for (const o of Object.values(searchControl._filterData(settings.searchText, searchControl._recordsFromLayer()))) {
      lookup[o.layer.options.alt] = true;
      // reveal layers on filter
      layers[o.layer.options.layerId].addTo(map);
    }
  }

  [].forEach.call(document.querySelectorAll('img.leaflet-marker-icon, path'), function(div) {
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
  for (const[id, value] of Object.entries(settings.markedItems)) {
    var divs = document.querySelectorAll('*[alt="' + id + '"]');
    [].forEach.call(divs, function(div) {
      div.classList.remove('found');
    });
    for(let m of markers[id]){
      m.setZIndexOffset(layerConfigs.getZIndexOffset(m.options.layerId));
    }  
  }


  settings.markedItems={};
  settings.coinsFound={};
  settings.playerPosition = playerStart;
  if (playerMarker) {
    playerMarker.setLatLng(new L.LatLng(playerStart[0], playerStart[1]));
    [playerMarker.options.o['lat'], playerMarker.options.o['lng'], playerMarker.options.o['alt']] = playerStart;
    playerMarker.title = `Player Position (${playerStart[1]},${playerStart[0]})` 
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
      evt.target.value = null;
    } catch(e) {
      //console.log(e);
      alert('Could not load file, incompatible format.');
      return;
    }

    settings.markedItems={};
    settings.coinsFound={};
    settings.playerPosition = playerStart;

    for (let section of ["ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever"]) {
      for (let o of loadedSave.Properties) {
        const propertyMap = {
          PlayerDoubleLoot: "Map:Juicer2", 
          PlayerDrankHealthPlusJuice: "Map:Juicer3", 
          PlayerStrong: "Map:Juicer_286"
        }
        if(o.name && propertyMap[o.name]){
          settings.markedItems[propertyMap[o.name]] = true;
        }

        if (o.name != section) {
          continue;
        }
        for(let x of o.value.value) {
          // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
          let name = x.split(".").pop();
          let area = x.split("/").pop().split('.')[0];
          if (name != "None") {

            // ok this is weird but looks like Shell2_1957 appears as shell2_1957 in the save file
            // so we better capitalize class names here
            name = name.charAt(0).toUpperCase() + name.slice(1);

            let id = area + ':' + name;
 
            let cs;
            if(name.startsWith('Coin') && (cs = coin2stack[id])){
              let csAlt = cs.area+':'+cs.name;
              if(!(csAlt in settings.coinsFound)){
                settings.coinsFound[csAlt] = new Set();
              }
              settings.coinsFound[csAlt].add(name);
              if(settings.coinsFound[csAlt].size == Object.keys(cs.old_coins).length) {
                settings.markedItems[csAlt] = true;
              }
              continue;
            }

            let found = true;
 
            // a little hack here about volcano spawners (EnemySpawn3_C, graves layer)
            // they are activated in ThingsToActivate but destroyed only in ThingsToOpenForever
            if ((o = objects[id])) {
              if (o.type=='EnemySpawn3_C') {
                found = section=='ThingsToOpenForever';
              }
              // another hack, DeadHeroIndy opens at ThingsToOpenForever
              // but doesn't count as 100% until it arrives at ThingsToActivate
              // it's barely visible (red on red) but the found flag gives it up
              if (name == 'DeadHeroIndy') {
                found = section=='ThingsToActivate';
              }

              // Skeletons get activated when they spawn but get removed when you collect the bones
              if(o.type == 'CrashEnemySpawner_C') {
                found = section=='ThingsToRemove';
              }
            }

            if (found) {
              settings.markedItems[id] = true;
            }
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
          [playerMarker.options.o['lat'], playerMarker.options.o['lng'], playerMarker.options.o['alt']] = settings.playerPosition;
          playerMarker.title = `Player Position (${p.x.toFixed(0)},${p.y.toFixed(0)})` 
        } else {
          console.log('cannot load player position from', JSON.stringify(o));
        }

      }
    }

    //setTimeout(function(){alert('Loaded successfully. Marked ' + Object.keys(settings.markedItems).length + ' items')},250);
    //console.log('Marked ' + Object.keys(settings.markedItems).length + ' items');

    markItems();
    saveSettings();

    ready = true;
  };

  if (file instanceof Blob) {
    reader.readAsArrayBuffer(file);
  }
}

window.onhashchange = function(e) { 
  //console.log(location.hash)
  if (location.hash.length > 1 && map) {
    let p = map.getCenter();
    mapParam = {mapId:mapId, lat:Math.round(p.lat), lng:Math.round(p.lng), zoom:map.getZoom()};
    for (const s of location.hash.slice(1).split('&')) {
      let [k,v] = s.split('=');
      mapParam[k] = v;
    }
    if(mapId != mapParam.mapId) {
      reloadMap(mapParam.mapId)
    }
    else {
      map.setView([mapParam.lat, mapParam.lng], mapParam.zoom);
    }
    mapParam = {}
    location.hash = '';
  }
}

window.onload = function(event) {
  if (location.hash.length > 1) {
    for (const s of location.hash.slice(1).split('&')) {
      let [k,v] = s.split('=');
      mapParam[k] = v;
    }
  }

  // clear location hash
  history.pushState('', document.title, window.location.pathname + window.location.search);

  Promise.all([gameClassesInit(), layerConfigs.init(), locStr.init()])
    .then(() => {
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

      document.querySelector('#map').addEventListener('blur', function(e) {
        pressed = {}; // prevent sticky keys
      });

      // When a key goes up remove it from the list 
      window.addEventListener('keyup', (e) => {
        delete pressed[e.code];
      });

      window.addEventListener("keydown",function (e) {
        //console.log(e, e.code);
        if (e.target.id.startsWith('searchtext')) {
          return;
        }
        if (settings.buildMode) { return; }
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
              map.flyTo(playerMarker ? playerMarker._latlng : mapCenter);
            } else if (e.altKey) {
              openLoadFileDialog();
            }
            break;
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
      //window.addEventListener('contextmenu', function(e) { e.stopPropagation()}, true); // enable default context menu
    }
  );
}
