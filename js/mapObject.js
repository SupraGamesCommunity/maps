/* globals L */

import { buildMode } from './main.js';
import { mergeDeep } from './utils.js';
import { L_arrowLine } from './arrowLine.js';
import { locStr } from './locStr.js';
import { Settings } from './settings.js';
import { Icons } from './icons.js';
import { GameClasses } from './gameClasses.js';
import { MapLayer } from './mapLayer.js';
import { SaveFileSystem } from './saveFileSystem.js';

//=================================================================================================
// MapObject class
//
// Static data members:
//
// _mapObjects                - Map id(alt) -> MapObject instance
// 
// Instance data members:
//
// o                          - object description data from markers json files
// alt                        - unique id of object (normally o.area:o.name)
//
// Optional instance data members that can be set by subclasses:
//
//  _saveFileId                - optional id listened to for save listener (not set => alt)
//  _saveFilter                - optional filter to apply for save listener
//  _defaultSaveValue          - optonal default value for save listener (normally false)
//  _foundLockedState          - optional, if set found will be locked to this value
//
// Instance functions:
//
//  constructor                - sets alt and o, adds instance to _mapObjects
//  mergeJson                  - used to merge additional data into o prior to init
//  release                    - releases everything and removes instance from _mapObjects
//
//  getTooltipText             - called to get mouseover text by init or whenever it may need updating
//
//  createMarker               - utility used to create each marker
//  createPrimeMarker          - called by init to create the primary marker for this map object
//  createGroupMarker          - called by init to create a generic layer marker for this map object
//  createLines                - called by init to create any lines for this map object
//
//  init                       - complete initialisation, make leaflet markers/lines, add to controls/map etc
//
//  addSaveListeners           - called by init to add any save load listeners
//  releaseSaveListeners       - called by release to remove any save load listeners
//  onSaveEvent                - callback from saveFileSystem when save data changes
//
//  isFound                    - returns current value (if supported)
//  setFound                   - called when external user needs to specify new found state (if supported)
//  toggleFound                - called when external user needs to toggle found state (if supported)
//
//  markFound                  - called to apply current found state to the markers/lines
//
//  onContextMenu              - callback when marker is left clicked on
//  onPopupOpen                - callback before popup displayed when marker is clicked on
//
// Static member functions:
//
//  loadObjects                - called to load/construct/init all MapObjects from the various Json files
//  initObjects                - called after loadObjects to add all the markers to the map
//
//  addObjectFromJson          - called by load to instantiate or merge a MapObject
//  resetAll                   - called to reset us to initial state (also resets SaveFileSystem)
//  get                        - returns MapObject from id

export class MapObject {
  static _mapObjects;               // Map from id to a MapObject (or subclass)

  o = {};     // The json data loaded from the various marker files
  alt;        // Our unique 'alt' name (normally area:name)

  // Constructor just stores reference to the json object data and our alt name
  constructor(alt, obj) {
    this.o = obj;
    this.alt = alt;
    MapObject._mapObjects[alt] = this;
  }

  // Merge in additional json object data from marker files
  mergeJson(obj) {
    mergeDeep(this.o, obj);
    return this;
  }

  // Remove this object from the lookup table
  release() {
    delete MapObject._mapObjects[this.alt];
    this.releaseSaveListeners();
  }

  // Retrieves unique mouser over text for this map object depending on friendly mode (or dev mode) 
  // Includes a name, what it spawns, 
  getTooltipText(mapId) {
    const friendly = !Settings.global.buildMode;
    const o = this.o;

    let text;
    if (friendly) {
      text = locStr.friendly(this, o.type, mapId);
      if (o.spawns) {
        text += ` (${locStr.friendly(null, o.spawns, mapId)})`;
      }
    }
    else {
      text = MapObject.makeAlt(o.area, o.name);                    // Ensures non-friendly version is unique
      if (o.spawns) {
        text += ` (${o.spawns})`;
      }
    }

    // spawns and coins should be mutally exclusive
    if (o.coins) {
      text += ` (${o.coins} coin${o.coins > 1 ? "s" : ""})`;
    }

    if (o.cost) {
      text += ` [${locStr.cost(o.price_type, o.cost)}]`;
    }

    if (friendly) {
      text += ` (${o.lng.toFixed(0)},${o.lat.toFixed(0)})`;   // Ensures friendly version is unique
    } else {
      text += ' of ' + o.type;
    }

    return text;
  }

  // Creates and returns a marker.
  createMarker(map, layerId, cicon) {
    const mapLayer = MapLayer.get(layerId);
    if (!mapLayer?.isEnabled(map.mapId))
      return;

    const iconName = (cicon && (this.o.icon || cicon)) || mapLayer.config.defaultIcon;
    const icon = Icons.get({ iconName: iconName, variant: this.o.variant, game: map.mapId }).addTo(map);
    const options = { icon: icon, zIndexOffset: mapLayer.getZIndexOffset(), title: this.getTooltipText(map.mapId), alt: this.alt, o: this.o, layerId: layerId }

    const marker = L.marker([this.o.lat, this.o.lng], options)
      .addTo(mapLayer.id == '_map' ? map : mapLayer.layerObj)                 // Add to relevant mapLayer (or the group)
      .bindPopup('')
      .on('popupopen', this.onPopupOpen, this)  // We set popup text on demand 
      .on('mouseover', this.onMouseOver, this)  // We update tooltip text on demand
      .on('add', this.onAdd, this)              // We may need to resize icons when they're layer is displayed
      .on('contextmenu', this.onContextMenu, this);

    return marker;
  }

  // Create 'no spoiler' marker if this class has one. Examples: Chests, Shop etc.
  createGroupMarker(map) {
    let c = GameClasses.get(this.o.type);

    // I feel like this is a bit of a hack because it requires awareness of the layer names which
    // is supposed to be just data but I can't currently think of a better way to do it.
    // TODO: reverse sense - make collectable but if it has a price then put it in shop
    const layerId = c.nospoiler != 'shop' || (this.o.cost && this.o.price_type != 7) ? c.nospoiler : 'collectable';

    // Group marker uses icon from layer it is on (ignores class/spawns/object icon)
    let marker;
    if ((marker = this.createMarker(map, layerId))) {
      this.groupMarker = marker;
    }
  }

  // Create the primary marker for this class instance
  createPrimeMarker(map) {
    const c = GameClasses.get(this.o.type);
    const sc = GameClasses.get(this.o.spawns, null);
    const layerId = sc?.layer || c.layer;
    const icon = sc?.icon || c.icon;
    let marker;
    if ((marker = this.createMarker(map, layerId, icon))) {
      this.primeMarker = marker;
    }
  }

  // Add any lines to the map 
  createLines(map) {
    const c = GameClasses.get(this.o.type);
    const o = this.o;

    if (o.linetype && MapLayer.isEnabledFromId(c.lines, map.mapId) && o.twoway != 2) {
      const mapLayer = MapLayer.get(c.lines);
      let endxys = o.linetype != 'trigger' ? [o.target] : o.targets;

      // need to add title as a single space (leaflet search issue), but not the full title so it doesn't appear in search
      let options = {
        zIndexOffset: mapLayer.getZIndexOffset(), title: ' ', interactive: false, alt: this.alt, o: o,
        layerId: c.lines, className: 'line-' + o.linetype + (o.linetype == 'jumppad' ? ' ' + o.variant : ''),
      }
      if (o.twoway) {
        options.arrow = 'none';
      }
      this.lines = [];
      for (let endxy of endxys) {
        let line = L_arrowLine([o.lat, o.lng], [endxy.y, endxy.x], options);
        line.addTo(mapLayer.id == '_map' ? map : mapLayer.layerObj)
          .on('add', this.onAdd, this);             // We may need to resize icons when they're layer is displayed

        this.lines.push(line);
      }
    }
  }

  // Initialise this MapObject by creating markers/lines and setting up for save loading
  init(map) {
    // If subclass hasn't set default set it based on notsaved
    if (this._foundLockedState === undefined && this.o.notsaved) {
      this._foundLockedState = true;
    }

    // Give subclass a chance to change things
    this.subclassInit?.(map);

    const c = GameClasses.get(this.o.type);
    if (!MapLayer.isEnabledFromId(c.layer, map.mapId) && !MapLayer.isEnabledFromId(c.nospoiler, map.mapId)
      || !L.latLngBounds(MapLayer.get(map.mapId).viewLatLngBounds).contains([this.o.lat, this.o.lng])) {
      this.release();
      return;
    }

    this.createGroupMarker(map);
    this.createPrimeMarker(map);

    // If we didn't create either marker then self-destruct
    if (!this.primeMarker && !this.groupMarker) {
      this.release();
      return;
    }

    this.createLines(map);

    this.addSaveListeners();

    if(this._foundLockedState){
      this.markFound(true);
    }

    return this;
  }

  // Default behaviour is to add a save file listener with 'alt' (or the _saveFileId member if set)
  // This default behaviour can be cancelled by setting _saveFileId to null
  // _saveFileId, _filter and _defaultSaveData may be set by subclasses 
  addSaveListeners() {
    if (this._saveFileId !== null && this._foundLockedState === undefined) {
      SaveFileSystem.setListener(this._saveFileId || this.alt, this.onSaveEvent, this, this._saveFilter, this._defaultSaveData);
    }
  }

  // Release a listener if we've set one up
  releaseSaveListeners() {
    if (this._saveFileId !== null) {
      SaveFileSystem.clearListener(this._saveFileId || this.alt);
    }
  }

  // Callback from saveFileSystem when save data changes
  onSaveEvent(id, data) {
    this.markFound(data);
  }

  // Returns true if MapObject is 'found'
  isFound() {
    if (this._foundLockedState !== undefined) {
      return this._foundLockedState;
    }
    else {
      return Boolean(Settings.map.saveData[this._saveFileId || this.alt]);
    }
  }

  // Called to specify found state
  setFound(found) {
    if (this._foundLockedState !== undefined) {
      return;
    }
    if (found) {
      Settings.map.saveData[this._saveFileId || this.alt] = true;
      this.markFound(true);
    }
    else {
      delete Settings.map.saveData[this._saveFileId || this.alt];
      this.markFound(false);
    }
    Settings.commit();
  }

  // Called to toggle found state
  toggleFound() {
    this.setFound(!this.isFound());
  }

  // Called to mark this object's found state on the map (skipLines normally not passed)
  markFound(found, lineFound) {
    if (found === undefined) {
      found = this.isFound();
    }
    var divs = document.querySelectorAll('*[alt="' + this.alt + '"]');
    [].forEach.call(divs, function (div) {
      // If linesFound has been passed in and this is a line then we want to use lineFound instead of found
      const useLines = lineFound !== undefined && div.getAttribute('class').includes('line-');
      if (!useLines && found || useLines && lineFound) {
        div.classList.add('found');
      } else {
        div.classList.remove('found');
      }
    });

    if (this.primeMarker) {
      this.primeMarker.setZIndexOffset(MapLayer.getZIndexOffsetFromId(this.primeMarker.options.layerId, found));
    }
    if (this.groupMarker) {
      this.groupMarker.setZIndexOffset(MapLayer.getZIndexOffsetFromId(this.groupMarker.options.layerId, found));
    }
  }

  onAdd() {
    this.markFound();
  }

  // Called when the user left clicks on the marker for this map object
  onContextMenu(e) {
    // If 'found' isn't locked then context menu toggles found
    if (this._foundLockedState === undefined) {
        this.toggleFound();
        e.target.closePopup();
      }
  }

  // Called before tooltip is displayed
  onMouseOver(e) {
    const title = this.getTooltipText(e.target._map.mapId);
    if (this.groupMarker?._icon) {
      this.groupMarker._icon.title = title;
    }
    if (this.primeMarker?._icon) {
      this.primeMarker._icon.title = title;
    }
  }

  setLatLng(latLng){
    [this.o.lat, this.o.lng] = [latLng.lat, latLng.lng];

    if (this.groupMarker?._icon) {
      this.groupMarker.setLatLng(latLng).update();
    }
    if (this.primeMarker?._icon) {
      this.primeMarker.setLatLng(latLng).update();
    }
    return this;
  }

  // Called just before the popup dialog for this marker is displayed
  onPopupOpen(e) {
    const o = this.o;
    const mapId = e.target._map.mapId;

    buildMode.marker = this;
    buildMode.object = o;

    let text = ''
    text += `<div class="marker-popup-heading">${locStr.friendly(o, o.type, mapId)}</div>`
    text += '<div class="marker-popup-text">'
    if (o.spawns) {
      text += `<br><span class="marker-popup-col">Contains:</span><span class="marker-popup-col2">${locStr.friendly(null, o.spawns, mapId)}</span>`;
    }
    if (o.coins) {
      text += `<br><span class="marker-popup-col">Coins:</span>${o.coins} coin${o.coins > 1 ? "s" : ""}`;
    }
    if (o.scrapamount) {
      text += `<br><span class="marker-popup-col">Amount:</span>${o.scrapamount} scrap`;
    }
    if (o.cost) {
      text += `<br><span class="marker-popup-col">Price:</span>${locStr.cost(o.price_type, o.cost)}`;
    }
    for (let f of ['variant', 'loop']) {
      if (o[f]) {
        text += `<br><span class="marker-popup-col">${f.charAt(0).toUpperCase() + f.slice(1)}:</span>${o[f]}`;
      }
    }
    if (o.description || GameClasses.get(o.type).description) {
      text += `<br><span class="marker-popup-col">Description:</span><span class="marker-popup-col2">${locStr.description(o, o.type, mapId)}</span>`;
    }
    if (o.comment) {
      text += `<br><span class="marker-popup-col">Comment:</span><span class="marker-popup-col2">${o.comment}</span>`;
    }
    text += `<br><span class="marker-popup-col">XYZ pos:</span>(${o.lng.toFixed(0)}, ${o.lat.toFixed(0)}, ${o.alt.toFixed(0)})`

    text += '<br><br></div>'

    if (o.yt_video) {
      let ytSrc = 'https://www.youtube-nocookie.com/embed/' + o.yt_video + '?controls=0';
      if (o.yt_start) ytSrc += '&start=' + o.yt_start;
      if (o.yt_end) ytSrc += '&end=' + o.yt_end;

      text = text + '<iframe width="300" height="169" src="' + ytSrc
        + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
    }

    //text += '<div class="marker-popup-subheading">' + o.area + '</div><br>'
    //text += '<br><br><div class="marker-popup-footnote">Lat: ' + o.lat + '<br>Lng: ' + o.lng + '<br>Alt: ' + o.alt + '</div>'
    //<p><span class="a">foo</span>  <span class="b">=</span>  <span class="c">"abcDeveloper"</span>

    if (this._foundLockedState === undefined) {
      let value = this.isFound() ? 'checked' : '';
      text += '<div class="marker-popup-found">';
      text += `<input type="checkbox" id="${this.alt}" ${value} onclick=window.mapObjectFound("${this.alt}",this.checked)><label for="${this.alt}">`
      text += 'Found</label></div>';
    }

    //let base = window.location.href.replace(/#.*$/,'');
    //let vars = {mapId:mapId, lat:Math.round(map.getCenter().lat), lng:Math.round(map.getCenter().lng), zoom:map.getZoom()};
    //let url = base +'#' + Object.entries(vars).map(e=>e[0]+'='+encodeURIComponent(e[1])).join('&');
    //let a = '<a href="'+url+'" onclick="return false">Map URL</a>';

    if (Settings.global.buildMode) {
      let json = JSON.stringify(o, null, 2)
      json = json.substring(json.indexOf('\n'), json.lastIndexOf('}'));
      json = json.replaceAll('\n', '<br>').replaceAll(' ', '&nbsp;');
      text += '<div class="marker-popup-debug">' + json + '</div><br>'
    }

    if (Settings.global.buildMode) {
      text += '<hr>';
      Object.getOwnPropertyNames(o).forEach(
        function (propName) {
          if (propName != 'name' && propName != 'area')
            text += '<br>' + propName + ': <input type="text" id="' + propName + '" onchange="updateBuildModeValue();" value="' + o[propName] + '"></input>';
        }
      );
      if (!o.yt_video) { text += '<br>yt_video: <input type="text" id="yt_video" onchange="updateBuildModeValue();" value=""></input>'; };
      if (!o.yt_start) { text += '<br>yt_start: <input type="text" id="yt_start" onchange="updateBuildModeValue();" value=""></input>'; };
      text += '<button onclick="commitCurrentBuildModeChanges();">Save</button>';
    }

    e.popup.setContent(text);
  }

  // Activate all layers the MapObject is on
  activateTopLayer(map) {
    if (this.primeMarker) {
      const layerId = this.primeMarker.options.layerId;
      MapLayer.get(layerId).addTo(map);
    }
    else if (this.groupMarker) {
      const layerId = this.groupMarker.options.layerId;
      MapLayer.get(layerId).addTo(map);
    }
  }

  // Constructs new object or merges data into existing one
  static addObjectFromJson(obj) {
    if ('area' in obj && 'name' in obj) {
      const alt = MapObject.makeAlt(obj.area, obj.name);
      const mapObject = MapObject._mapObjects[alt];
      if (mapObject) {
        return mapObject.mergeJson(obj);
      }
      else if ('type' in obj) {
        return new objectToSubclass(obj)(alt, obj);
      }
    }
    else {
        ("Warning: Marker JSON entry area:name must both be specified in all markers*.json")
    }
  }

  // Load all markers for current map
  static async loadObjects(mapId) {
    this.resetAll();

    const markersJsonArray = await Promise.all([
      fetch(`data/markers.${mapId}.json`).then((r) => r.json()),
      fetch(`data/ytdata.${mapId}.json`).then((r) => r.json()),
      fetch(`data/custom-markers.${mapId}.json`).then((r) => r.json()),
    ]);

    // Create instances / merge details from the three marker files
    for (const markersJson of markersJsonArray) {
      for (const objectJson of markersJson) {
        this.addObjectFromJson(objectJson);
      }
    }
  }

  // Called after loadObjects to add all the markers to the map
  static initObjects(map) {

    // Initialise all the objects we've constructed
    for (const mapObject of Object.values(this._mapObjects)) {   // Use values so object can release itself if required
      mapObject.init(map);
    }

    // Allows popup to toggle found state
    window.mapObjectFound = mapObjectFound;

    // Triggers save load events from any save data in settings
    SaveFileSystem.LoadSettings();
  }

  // Release all objects created and references to MapObjects
  static resetAll() {
    SaveFileSystem.reset();
    this._mapObjects = [];
    delete window.mapObjectFound;
  }

  static get(id) {
    return this._mapObjects[id];
  }

  // Return alt id from string arguments (normally area, name)
  static makeAlt(...args) {
    return args.filter(a => a).join(':');   // Join all truthy arguments (a !== null && a !== undefined && a !== '') might by better?
  }
}

function mapObject(...args) {
  return new MapObject(...args);
}

// Handler for found checkbox on MapObject popup 
export const mapObjectFound = function (id, found = true) {
  MapObject._mapObjects[id].setFound(found);
}

//=================================================================================================
// MapObject subclasses

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='PlayerStart'
//
// First one created stores it's position as static member of MapObject and spawns an _PlayerPosition 
class MapPlayerStart extends MapObject {
  _foundLockedState = false;

  subclassInit(map) {
    if (!this._playerStartPosition) {

      const objJson = Object.assign({}, this.o);
      objJson.type = '_PlayerPosition';
      objJson.area = '';
      objJson.name = 'PlayerPosition';
      MapObject.addObjectFromJson(objJson).init(map);
    }
  }
}

function mapPlayerStart(...args) {
  return new MapPlayerStart(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='_PlayerPosition'
//
// Instantiated by first 'PlayerStart' it tracks the 'Player Position' save property, moving
// whenever it changes and updating mouse over and popup text.
class MapPlayerPosition extends MapObject {
  _saveFileId = 'Player Position';
  _foundLockedState = false;

  subclassInit() {
    this._startPosition = { lat: this.o.lat, lng: this.o.lng, alt: this.o.alt };
  }

  // We're listening for a saveLoadEvent of Player Position. We will be called with a position
  // if one has been loaded, otherwise the save state must be cleared.
  onSaveEvent(id, data) {
    if (!data) {
      Object.assign(this.o, this._startPosition);
    }
    else {
      let value;
      if ('Translation' in data) {
        value = data.value['Translation'].value;
      }
      else {
        value = data.value;
      }
      if (value) {
        [this.o.lng, this.o.lat, this.o.alt] = [value.x, value.y, value.z];
      }
      else {
        return;
      }
    }

    if (this.primeMarker) {
      this.primeMarker.closePopup();
    }
    if (this.groupMarker) {
      this.groupMarker.closePopup();
    }
  }
}
function mapPlayerPosition(...args) {
  return new MapPlayerPosition(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for any type starting with 'Pipesystem'
//
// Save id is based on PipeCap_C object nearest_cap, and twoway pipes where the other end doesn't
// have a nearest_cap we send the other end all the found events.
class MapPipesystem extends MapObject {
  subclassInit() {
    const otherPipe = MapObject._mapObjects[this.o.other_pipe];
    if (this.o.nearest_cap) {
      this._saveFileId = this.o.nearest_cap;

      // If the other end of the pipe doesn't have a pipecap then it's status should match ours
      if (this.o.twoway && otherPipe && otherPipe.o.nearest_cap == undefined) {
        this._triggerOtherPipe = true;
      }
    }
    else {
      // If oneway and no pipecap or twoway both ends no pipecap then notsaved should be set, so _foundLockedState should be true
      // (we could do a cross-check here for notsaved)
      //
      // However, if twoway and the other end does have a pipecap then we want to let the other end handle save file events 
      if (this.o.twoway && otherPipe && otherPipe.o.nearest_cap !== undefined) {
        this._saveFileId = null;
      }
    }
  }

  _setFound(found) {
    super.setFound(found);
  }

  // For two way pipes where the other end doesn't have a nearest_cap it should match found
  setFound(found) {
    this._setFound(found);

    // Feels like we should test this._triggerOtherPipe but actually if the user marks one end we should
    // just mark the other
    const otherPipe = MapObject._mapObjects[this.o.other_pipe];
    otherPipe?._setFound.call(otherPipe, found);
  }

  // For two way pipes where the other end doesn't have a nearest_cap it should match found
  onSaveEvent(id, data) {
    super.onSaveEvent()
    if (this._triggerOtherPipe) {
      MapObject._mapObjects[this.o.other_pipe].onSaveEvent(this.o.other_pipe, data);
    }
  }
}
function mapPipesystem(...args) {
  return new MapPipesystem(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'Jumppad_C'
//
// For twoway jumppads we special case the line found behaviour, to be found if either end is found.
// Plus, if only one end found, the line gains an arrow pointing at the unfound end
class MapJumppad extends MapObject {

  // This is only called by other end of line on markFound
  updateLineFound(found2) {
    const found = this.isFound();

    // Just add/remove found from the line elements
    var divs = document.querySelectorAll('*[alt="' + this.alt + '"]');
    [].forEach.call(divs, function (div) {
      if (div.getAttribute("class").includes('line-jumppad')) {
        if (found || found2) {
          div.classList.add('found');
        } else {
          div.classList.remove('found');
        }
      }
    });

    this.lines[0].setArrow(found == found2 ? 'none' : found ? 'tip' : 'back');
  }

  // Overloading of markFound to handle special line behaviour
  markFound(found) {
    if(found == undefined){
      found = this.isFound();
    }

    const o = this.o;
    let lineFound;
    if ('other_pad' in o) {
      if (o.twoway == 1) {
        // Twoway pad - primary end, just update the arrow tip and let super do the rest
        const found2 = Boolean(MapObject._mapObjects[o.other_pad]?.isFound());

        this.lines[0].setArrow(found == found2 ? 'none' : found ? 'tip' : 'back');
        lineFound = found || found2;
      }
      else {
        // Twoway pad, secondary end, get line updated for other end, and super will do the rest
        MapObject._mapObjects[o.other_pad]?.updateLineFound(found);
      }
    }
    super.markFound(found, lineFound);
  }
}

function mapJumppad(...args) {
  return new MapJumppad(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type '_CoinStack_C'
//
// Coin stack's found status is true if all the coins it contains are found, so we need to listen
// for all coins save data, plus if the found is toggled we need to update the save data for them.
class MapCoinStack extends MapObject {

  subclassInit() {
    this._coinsFound = new Set();
  }

  // Listen for the coins that are part of this stack
  addSaveListeners() {
    for (const coin in this.o.old_coins) {
      const id = MapObject.makeAlt(this.o.area, coin);
      SaveFileSystem.setListener(id, this.onSaveEvent, this);
    }
  }

  // Release the listeners for the coins that are part of this stack
  releaseSaveListeners() {
    for (const coin in this.o.old_coins) {
      const id = MapObject.makeAlt(this.o.area, coin);
      SaveFileSystem.clearListener(id);
    }
  }

  // Overload save event handler. Track the coins we're listening for 
  onSaveEvent(id, data) {
    const oldFound = this.isFound();

    const coin = id.after(':');
    this._coinsFound = this._coinsFound || new Set();
    if (data) {
      this._coinsFound.add(coin);
    }
    else {
      this._coinsFound.delete(coin);
    }
    const found = this.isFound();

    if (found != oldFound) {
      this.markFound(found);
    }
  }

  // Checks the set of coins found rather than normal settings
  isFound() {
    return (this._coinsFound.size == Object.keys(this.o.old_coins).length)
  }

  // Changes the saveData for all the coins we're attached to
  setFound(found) {
    if (found) {
      for (const coin in this.o.old_coins) {
        Settings.map.saveData[MapObject.makeAlt(this.o.area, coin)] = true;
        this._coinsFound.add(coin);
      }
    }
    else {
      for (const coin in this.o.old_coins) {
        delete Settings.map.saveData[MapObject.makeAlt(this.o.area, coin)];
      }
      this._coinsFound.clear();
    }
    Settings.commit();
    this.markFound(!this.found());
  }
}
function mapCoinStack(...args) {
  return new MapCoinStack(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'Juicer_C'
//
// The save file property is based on player property flag values instead of the object alt id 
class MapJuicer extends MapObject {
  // Juicer's use player properties for their found/unfound state
  subclassInit() {
    const saveIdMap = {
      'Map:Juicer2': 'PlayerDoubleHealth',
      'Map:Juicer3': 'PlayerDrankHealthPlusJuice',
      'Map:Juicer_286': 'PlayerStrong'
    };
    const id = saveIdMap[this.alt];
    if (id !== undefined) {
      this._saveFileId = id;
    }
  }
}
function mapJuicer(...args) {
  return new MapJuicer(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'EnemySpawn3_C' in SL
//
// Only mark found if the alt id is on ThingsToOpenForever
class MapGraveVolcano extends MapObject {
  _saveFilter = 'ThingsToOpenForever';
}
function mapGraveVolcano(...args) {
  return new MapGraveVolcano(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'CrashEnemySpawner_C' in SLC
//
// Only mark found if the alt id is on ThingsToRemove
class MapBonesSpawner extends MapObject {
  _saveFilter = 'ThingsToRemove';
}
function mapBonesSpawner(...args) {
  return new MapBonesSpawner(...args);
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for dead hero named 'DeadHeroIndy' in SL
//
// Only mark found if the alt id is on ThingsToActivate
class MapDeadHeroIndy extends MapObject {
  _saveFilter = 'ThingsToActivate';
}
function mapDeadHeroIndy(...args) {
  return new MapDeadHeroIndy(...args);
}

// Returns class to instantiate given 
function objectToSubclass(o) {

  // Object types that have MapObject subclass
  const typeMap = {
    '_PlayerPosition': mapPlayerPosition,
    'PlayerStart': mapPlayerStart,
    'EnemySpawn3_C': mapGraveVolcano,
    'CrashEnemySpawner_C': mapBonesSpawner,
    '_CoinStack_C': mapCoinStack,
    'Juicer_C': mapJuicer
  };
  let cls = typeMap[o.type];
  if (cls) {
    return cls;
  }

  // Object names that have MapObject subclass
  const nameMap = {
    'DeadHeroIndy': mapDeadHeroIndy
  }
  cls = nameMap[o.name];
  if (cls) {
    return cls;
  }

  // Types identified by substring that have 
  const typeIncludes = [
    ['Pipesystem', mapPipesystem],
    ['Jumppad', mapJumppad],
  ];
  for (const entry of typeIncludes) {
    if (o.type.includes(entry[0])) {
      return entry[1];
    }
  }

  // Every other object type/name
  return mapObject;
}
