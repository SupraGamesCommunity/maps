import { mergeDeep } from './utils.js';
import { L_arrowLine } from './arrowLine.js';
import { locStr } from './locStr.js';
import { Settings } from './settings.js';
import { Icons } from './icons.js';
import { GameClasses } from './gameClasses.js';
import { MapLayer } from './mapLayer.js';
import { SaveFileSystem } from './saveFileSystem.js';
import { MapParam } from './mapParam.js';
import { buildMode } from './devBuildMode.js';
import { createRoot } from 'react-dom/client';
import { PinContent } from './PinContent.jsx';
import { markerContextMenu } from './contextmenu/init.js';
import { marker as leaflet_marker, latLngBounds } from 'leaflet';
import * as fmt from './formatter.js';

import './css/MapObject.css';

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
//  updateTitles               - call if the state of the system has changed to refresh all the marker titles
//
//  addObjectFromJson          - called by load to instantiate or merge a MapObject
//  resetAll                   - called to reset us to initial state (also resets SaveFileSystem)
//  get                        - returns MapObject from id
//  showAlt                    - shows the map object specified

export class MapObject {
  static _mapObjects; // Map from id to a MapObject (or subclass)
  static _playerStartPosition;

  o = {}; // The json data loaded from the various marker files
  alt; // Our unique 'alt' name (normally area:name)

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
    } else {
      text = mapId != 'siu' ? o.name : MapObject.makeAlt(o.area, o.name); // Ensures non-friendly version is unique
      if (o.spawns) {
        text += ` (${o.spawns})`;
      }
    }

    const playerDeltaZ = this.getPlayerDeltaZ();
    if (!friendly) {
      text += ' of ' + o.type;
    }
    text += ` (${fmt.coord(o.lng)}, ${fmt.coord(o.lat)}, ${fmt.delta(playerDeltaZ)})`; // Ensures friendly version is unique

    return text;
  }

  // Creates and returns a marker.
  createMarker(map, layerId, cicon) {
    const mapLayer = MapLayer.get(layerId);
    if (!mapLayer?.isEnabled(map.mapId)) return;

    const iconName = (cicon && (this.o.icon || cicon)) || mapLayer.config.defaultIcon;
    const icon = Icons.get({ iconName: iconName, variant: this.o.variant, game: map.mapId }).addTo(map);
    const options = {
      icon: icon,
      zIndexOffset: mapLayer.getZIndexOffset(),
      title: this.getTooltipText(map.mapId),
      alt: this.alt,
      o: this.o,
      layerId: layerId,
    };

    const marker = leaflet_marker([this.o.lat, this.o.lng], options)
      .addTo(mapLayer.id == '_map' ? map : mapLayer.layerObj) // Add to relevant mapLayer (or the group)
      .bindPopup('', { minWidth: 300 })
      .on('popupopen', this.onPopupOpen, this) // We set popup text on demand
      .on('mouseover', this.onMouseOver, this) // We update tooltip text on demand
      .on('add', this.onAdd, this); // We may need to resize icons when they're layer is displayed

    return marker;
  }

  // Create 'no spoiler' marker if this class has one. Examples: Chests, Shop etc.
  createGroupMarker(map) {
    let c = GameClasses.get(this.o.type);

    const layerId = c.nospoiler;
    let cicon = c.noSpoilIcon || (this.o.spawns && c.icon);

    // Group marker uses icon from layer it is on (ignores class/spawns/object icon)
    let marker;
    if (layerId && (marker = this.createMarker(map, layerId, cicon))) {
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
    if (layerId && (marker = this.createMarker(map, layerId, icon))) {
      this.primeMarker = marker;
    }
  }

  // Add any lines to the map
  createLines(map) {
    const c = GameClasses.get(this.o.type);
    const o = this.o;
    const lineslayer = c.lines || this.primeMarker?.options.layerId;

    if (o.linetype && MapLayer.isEnabledFromId(lineslayer, map.mapId) && o.twoway != 2) {
      const mapLayer = MapLayer.get(lineslayer);
      let endxys = o?.target ? [o.target] : o.targets;

      // need to add title as a single space (leaflet search issue), but not the full title so it doesn't appear in search
      let options = {
        zIndexOffset: mapLayer.getZIndexOffset(),
        title: ' ',
        interactive: false,
        alt: this.alt,
        o: o,
        layerId: lineslayer,
        className: 'line-' + o.linetype + (o.linetype == 'jumppad' ? ' ' + o.variant : ''),
      };
      if (o.twoway) {
        options.arrow = 'none';
      }
      this.lines = [];
      for (let endxy of endxys) {
        let line = L_arrowLine([o.lat, o.lng], [endxy.y, endxy.x], options);
        line.addTo(mapLayer.id == '_map' ? map : mapLayer.layerObj).on('add', this.onAdd, this); // We may need to resize icons when they're layer is displayed

        this.lines.push(line);
      }
    }
  }

  // Initialise this MapObject by creating markers/lines and setting up for save loading
  init(map) {
    const c = GameClasses.get(this.o.type);

    // _foundLockedState is undefined in base class meaning object found state can be
    // loaded from a save file. This can be overridden by subclass, then gameClasses
    // and finally by instance data (as highest priority). We used to not allow override
    // if the previous one has set it, reversing the priority but it wasn't used and this
    // seems more useful.

    // Give subclass a chance to change things
    this.subclassInit?.(map);

    // If class has setfound property then apply it
    if ('setfound' in c) {
      this._foundLockedState = c.setfound;
    }

    // If instance has not saved property then apply it
    if (this.o.notsaved) {
      this._foundLockedState = this.o.notsaved;
    }

    // Set default save state if subclass hasn't done it
    if (this._foundLockedState === undefined && this._defaultSaveData === undefined) {
      this._defaultSaveData = false;
    }

    // Allow object or class to override save file id
    this._saveFileId = this.o.savefileid || c.savefileid || this._saveFileId || this.alt;
    this._decodeHandlerId = this._decodeHandlerId || this.o.type;

    if (
      (!MapLayer.isEnabledFromId(c.layer, map.mapId) && !MapLayer.isEnabledFromId(c.nospoiler, map.mapId)) ||
      !latLngBounds(MapLayer.get(map.mapId).viewLatLngBounds).contains([this.o.lat, this.o.lng])
    ) {
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

    this.addSaveDecodeHandler();

    this.addSaveListeners();

    // If this marker is findable then the contextmenu and found state will
    // be set up when the save state is dealt with, so only do it now if it's unfindable
    if (this._foundLockedState !== undefined) {
      this.markFound();
    }

    return this;
  }

  // Add a default decode handler
  addSaveDecodeHandler() {
    if (this.saveDecodeHandler) {
      SaveFileSystem.setDecodeHandler(
        this._decodeHandlerId,
        (id, saveDecoder) => this.saveDecodeHandler(saveDecoder),
        this,
        !!this._decodeHandlerIsOuter
      );
    }
  }

  // Release default save decode handler
  releaseSaveDecodeHandler() {
    if (this.saveDecodeHandler) {
      SaveFileSystem.clearDecodeHandler(this._decodeHandlerId, !!this._decodeHandlerIsOuter);
    }
  }

  // Default behaviour is to add a save file listener with 'alt' (or the _saveFileId member if set)
  // This default behaviour can be cancelled by setting _saveFileId to null
  // saveDecodeHandler, _saveFileId and _defaultSaveData may be set by subclasses
  addSaveListeners() {
    if (this._saveFileId == 'Player Position') {
      console.log('Adding player position listener');
    }
    if (this._saveFileId !== null || this._foundLockedState === undefined) {
      SaveFileSystem.setListener(
        this._saveFileId,
        (id, data) => this.onSaveEvent(id, data),
        this,
        this._defaultSaveData
      );
    }
  }

  // Release a listener if we've set one up
  releaseSaveListeners() {
    if (this._saveFileId !== null || this._foundLockedState === undefined) {
      SaveFileSystem.clearListener(this._saveFileId, this);
    }
  }

  // Callback from saveFileSystem when save data changes
  onSaveEvent(id, data) {
    if (this._foundLockedState === undefined) this.markFound(data);
  }

  // Returns true if MapObject is 'found'
  isFound() {
    if (this._foundLockedState !== undefined) {
      return this._foundLockedState;
    } else {
      return Boolean(Settings.map.saveData[this._saveFileId]);
    }
  }

  // Called to specify found state
  setFound(found) {
    if (this._foundLockedState !== undefined) {
      return;
    }
    if (found) {
      Settings.map.saveData[this._saveFileId] = true;
      this.markFound(true);
    } else {
      delete Settings.map.saveData[this._saveFileId];
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
      if ((!useLines && found) || (useLines && lineFound)) {
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
    this.updateContextMenuOptions();
  }

  onAdd() {
    this.markFound();
  }

  updateContextMenuOptions() {
    let menuContent = {};

    if (this.primeMarker && this.groupMarker) {
      menuContent.layerObj2 = this.groupMarker;
    }

    if (this._foundLockedState === undefined) {
      if (this.isFound()) {
        menuContent.clearFound = true;
      } else {
        menuContent.setFound = true;
      }
    }

    if (this._disableMovePlayerPosition != true) {
      menuContent.movePlayerPosition = true;
    }

    if (!(this.primeMarker?.options.layerId == '_map' || this.groupMarker?.options.layerId == '_map')) {
      menuContent.hideMarker = true;
    }

    menuContent.getMapObjectURL = true;

    markerContextMenu(this, this.primeMarker || this.groupMarker, menuContent);
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

  setLatLng(latLng) {
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

    const playerDeltaZ = this.getPlayerDeltaZ();
    const popUpContentDiv = document.createElement('div');
    const sidepanelRoot = createRoot(popUpContentDiv);
    const leafletMap = e.target._map;
    const closePopup = () => {
      sidepanelRoot.unmount();
      leafletMap.closePopup();
    };
    const content = {
      o,
      mapId,
      closePopup,
      hasFoundState: this._foundLockedState === undefined,
      isFound: this.isFound(),
      foundAlt: this.alt,
      buildMode: Settings.global.buildMode,
      playerDeltaZ,
    };

    sidepanelRoot.render(<PinContent {...content} />);
    e.popup.setContent(popUpContentDiv);
  }

  getPlayerDeltaZ() {
    const playerZ = MapObject._mapObjects?.PlayerPosition?.o.alt;
    let playerDeltaZ = this.o.alt - (playerZ !== undefined ? playerZ : 0);
    return playerDeltaZ;
  }

  // Activate all layers the MapObject is on
  activateTopLayer(map) {
    if (this.primeMarker) {
      const layerId = this.primeMarker.options.layerId;
      MapLayer.get(layerId).addTo(map);
    } else if (this.groupMarker) {
      const layerId = this.groupMarker.options.layerId;
      MapLayer.get(layerId).addTo(map);
    }
  }

  // Constructs new object or merges data into existing one
  static addObjectFromJson(obj) {
    let mapObject;
    if ('area' in obj && 'name' in obj) {
      const alt = MapObject.makeAlt(obj.area, obj.name);
      mapObject = MapObject._mapObjects[alt];
      if (mapObject) {
        mapObject.mergeJson(obj);
      } else if ('type' in obj) {
        mapObject = new objectToSubclass(obj)(alt, obj);
      }

      // Delete any flagged properties completely
      for (const [prop, value] of Object.entries(obj)) {
        if (value == '!') delete mapObject.o[prop];
      }

      // Delete object if that key is present
      if (mapObject && 'delete' in obj) {
        mapObject.release();
        mapObject = null;
      }
    } else {
      ('Warning: Marker JSON entry area:name must both be specified in all markers*.json');
    }
    return mapObject;
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

  // Get the instance's type and use that as to find the decoder
  // Handler for: 'PersistentLevel.'
  static instanceDecodeHandler(saveDecoder) {
    const listenerId = MapObject.makeAlt(saveDecoder.area, saveDecoder.postmatch);
    if (SaveFileSystem.hasListener(listenerId)) {
      saveDecoder.handlerId = MapObject.get(listenerId)?.o.type;
      saveDecoder.listenerId = listenerId;
      if (!SaveFileSystem.callDecodeHandler(saveDecoder)) {
        // There's no decode handler but there is an instance listener so
        // just add true to the save data
        SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
      }
    }
  }

  // Called after loadObjects to add all the markers to the map
  static initObjects(map) {
    // Initialise all the objects we've constructed
    for (const mapObject of Object.values(this._mapObjects)) {
      // Use values so object can release itself if required
      mapObject.init(map);
    }

    SaveFileSystem.setDecodeHandler(
      'PersistentLevel.',
      (id, saveDecoder) => {
        saveDecoder.listenerId = id;
        this.instanceDecodeHandler(saveDecoder);
      },
      MapObject,
      true
    );

    // Allows popup to toggle found state
    window.mapObjectFound = mapObjectFound;

    // Triggers save load events from any save data in settings
    SaveFileSystem.LoadSettings();
  }

  // Release all objects created and references to MapObjects
  static resetAll() {
    SaveFileSystem.reset();
    this._mapObjects = [];
    this._playerStartPosition = undefined;
    delete window.mapObjectFound;
  }

  // Refresh the titles for all markers
  static updateTitles() {
    // This could be done by calling map.eachLayer and checking if layer is a marker
    for (const mapObject of Object.values(this._mapObjects)) {
      const title = mapObject.getTooltipText(Settings.mapId);
      if (mapObject.primeMarker) mapObject.primeMarker.options.title = title;
      if (mapObject.groupMarker) mapObject.groupMarker.options.title = title;
    }
  }

  // Move player position marker / altitude reference to specified object
  static movePlayerPosition(mapObject) {
    const p = MapObject._mapObjects.PlayerPosition;
    if (p) {
      p.o.lat = mapObject.o.lat;
      p.o.lng = mapObject.o.lng;
      p.o.alt = mapObject.o.alt;
      p.setLatLng({ lat: p.o.lat, lng: p.o.lng });
      MapObject.updateTitles();
    }
  }

  static get(id) {
    return this._mapObjects[id];
  }

  static get_ignorecase(id) {
    id = id.toLowerCase();
    return this._mapObjects[Object.keys(this._mapObjects).find((k) => k.toLowerCase() === id)];
  }

  // Return alt id from string arguments (normally area, name)
  static makeAlt(...args) {
    return args.filter((a) => a).join(':'); // Join all truthy arguments (a !== null && a !== undefined && a !== '') might by better?
  }

  // Move view point to object specified and optionally show popup
  static showAlt(alt, showPopup = false) {
    const mapObj = MapObject.get_ignorecase(alt);
    if (mapObj) {
      const map = MapLayer._map;
      map.closePopup();
      map.setView([mapObj.o.lat, mapObj.o.lng], map._loaded ? map.getZoom(0) : 0);
      mapObj.activateTopLayer(map);
      if (showPopup) {
        (mapObj.primeMarker || mapObj.groupMarker)?.openPopup();
      }
    }
  }
}

// Handler for found checkbox on MapObject popup
export const mapObjectFound = function (id, found = true) {
  MapObject._mapObjects[id].setFound(found);
};

//=================================================================================================
// MapObject subclasses

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='PlayerStart' or o.type=='SupraworldPlayerStart_C'
//
// First one created stores it's position as static member of MapObject and spawns an _PlayerPosition
class MapPlayerStart extends MapObject {
  _foundLockedState = false;

  subclassInit(map) {
    if (!MapObject._playerStartPosition) {
      const objJson = Object.assign({}, this.o);
      objJson.type = map.mapId == 'sw' ? '_SWPlayerPosition' : '_PlayerPosition';
      objJson.area = '';
      objJson.name = 'PlayerPosition';
      MapObject.addObjectFromJson(objJson).init(map);
    }
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='_PlayerPosition'
//
// Instantiated by first 'PlayerStart' it tracks the 'Player Position' save property, moving
// whenever it changes and updating mouse over and popup text.
class MapPlayerPosition extends MapObject {
  _saveFileId = 'Player Position';
  _foundLockedState = false;
  _disableMovePlayerPosition = true;

  subclassInit(map) {
    MapObject._playerStartPosition = { lat: this.o.lat, lng: this.o.lng, alt: this.o.alt };
    this._defaultSaveData = { ...MapObject._playerStartPosition };
    if (map.mapId == 'sw') {
      this.saveDecodeHandler = MapPlayerPosition.lastCheckpointDecodeHandler;
      this._decodeHandlerId = 'LastCheckpointActor';
      this._decodeHandlerIsOuter = true;
    } else {
      this.saveDecodeHandler = MapPlayerPosition.playerPositionDecodeHandler;
      this._decodeHandlerId = this._saveFileId;
    }
  }

  static lastCheckpointDecodeHandler(saveDecoder) {
    saveDecoder.nextInstance({ require: true });
    const instanceName = saveDecoder.postmatch;
    if (instanceName) {
      const id = MapObject.makeAlt('Supraworld', instanceName);
      const checkPoint = MapObject.get(id);
      saveDecoder.listenerId = 'Player Position';
      saveDecoder.data = { lat: checkPoint.o.lat, lng: checkPoint.o.lng, alt: checkPoint.o.alt };
      SaveFileSystem.defaultDecodeHandler(saveDecoder);
    } else {
      console.log('Warning: last checkpoint was not recognised (OOB?)');
    }
  }

  static playerPositionDecodeHandler(saveDecoder) {
    if (saveDecoder.data) {
      saveDecoder.listenerId = saveDecoder.handlerId;
      saveDecoder.data = saveDecoder.data.Translation?.value || saveDecoder.data.value || saveDecoder.data;
      saveDecoder.data = { lat: saveDecoder.data.y, lng: saveDecoder.data.x, alt: saveDecoder.data.z };
      SaveFileSystem.defaultDecodeHandler(saveDecoder);
    }
  }

  // We're listening for a saveLoadEvent of Player Position. We will be called with a position
  // if one has been loaded, otherwise the save state must be cleared.
  onSaveEvent(id, data) {
    if (data) {
      Object.assign(this.o, data);
    } else {
      console.log('MapPlayerPosition.onSaveEvent called with null data');
      Object.assign(this.o, MapObject._playerStartPosition);
    }
    this.setLatLng({ lat: this.o.lat, lng: this.o.lng });

    // Contents of popup may change
    (this.primeMarker || this.groupMarker)?.closePopup();

    // Mouse over / search titles which include the relative altitude may have changed
    MapObject.updateTitles();
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='DetectiveCase_.*'
//
// The detective cases need to check if someone has been arrested to be considered found
class MapDetectiveCase extends MapObject {
  saveDecodeHandler(saveDecoder) {
    if (saveDecoder.nextFString('DetainedCharacter')) {
      SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
    }
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for o.type=='PuzzleCloud_C'
//
// Puzzle cloud's must have had their state set to post puzzle to be considered found
class MapPuzzleCloud extends MapObject {
  saveDecodeHandler(saveDecoder) {
    // Value is from enumeration blueprint EPuzzleCloudState
    const EPuzzleCloudState_PostPuzzle = 2;
    if (saveDecoder.nextByteProperty() && saveDecoder.data == EPuzzleCloudState_PostPuzzle) {
      SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
    }
  }
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
    } else {
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
    super.onSaveEvent(id, data);
    if (this._triggerOtherPipe) {
      MapObject._mapObjects[this.o.other_pipe].onSaveEvent(this.o.other_pipe, data);
    }
  }
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
      if (div.getAttribute('class').includes('line-jumppad')) {
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
    if (found == undefined) {
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
      } else {
        // Twoway pad, secondary end, get line updated for other end, and super will do the rest
        MapObject._mapObjects[o.other_pad]?.updateLineFound(found);
      }
    }
    super.markFound(found, lineFound);
  }
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
      SaveFileSystem.setListener(id, (id, data) => this.onSaveEvent(id, data), this, false);
    }
  }

  // Release the listeners for the coins that are part of this stack
  releaseSaveListeners() {
    for (const coin in this.o.old_coins) {
      const id = MapObject.makeAlt(this.o.area, coin);
      SaveFileSystem.clearListener(id, this);
    }
  }

  // Overload save event handler. Track the coins we're listening for
  onSaveEvent(id, data) {
    const oldFound = this.isFound();

    const coin = id.after(':');
    this._coinsFound = this._coinsFound || new Set();
    if (data) {
      this._coinsFound.add(coin);
    } else {
      this._coinsFound.delete(coin);
    }
    const found = this.isFound();

    if (found != oldFound) {
      this.markFound(found);
    }
  }

  // Checks the set of coins found rather than normal settings
  isFound() {
    return this._coinsFound.size == Object.keys(this.o.old_coins).length;
  }

  // Changes the saveData for all the coins we're attached to
  setFound(found) {
    if (found) {
      for (const coin in this.o.old_coins) {
        Settings.map.saveData[MapObject.makeAlt(this.o.area, coin)] = true;
        this._coinsFound.add(coin);
      }
    } else {
      for (const coin in this.o.old_coins) {
        delete Settings.map.saveData[MapObject.makeAlt(this.o.area, coin)];
      }
      this._coinsFound.clear();
    }
    Settings.commit();
    this.markFound(!this.found());
  }
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
      'Map:Juicer_286': 'PlayerStrong',
    };
    const id = saveIdMap[this.alt];
    if (id !== undefined) {
      this._saveFileId = id;
    }
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'EnemySpawn3_C' in SL
//
// Only mark found if the parent array is ThingsToOpenForever
class MapGraveVolcano extends MapObject {
  saveDecodeHandler(saveDecoder) {
    if (saveDecoder.parent == 'ThingsToOpenForever') {
      SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
    }
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for type 'CrashEnemySpawner_C' in SLC
//
// Only mark found if the parent array is ThingsToRemove
class MapBonesSpawner extends MapObject {
  saveDecodeHandler(saveDecoder) {
    if (saveDecoder.parent == 'ThingsToRemove') {
      SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
    }
  }
}

//-------------------------------------------------------------------------------------------------
// MapObject subclass for dead hero named 'DeadHeroIndy' in SL
//
// Only mark found if the parent array is ThingsToActivate
class MapDeadHeroIndy extends MapObject {
  saveDecodeHandler(saveDecoder) {
    if (saveDecoder.parent == 'ThingsToActivate') {
      SaveFileSystem.defaultDecodeHandler(saveDecoder, true);
    }
  }
}

// Returns class to instantiate given
function objectToSubclass(o) {
  // Object types that have MapObject an exact match
  const typeMap = {
    _PlayerPosition: (...args) => new MapPlayerPosition(...args),
    _SWPlayerPosition: (...args) => new MapPlayerPosition(...args),
    PlayerStart: (...args) => new MapPlayerStart(...args),
    SupraworldPlayerStart_C: (...args) => new MapPlayerStart(...args),
    EnemySpawn3_C: (...args) => new MapGraveVolcano(...args),
    CrashEnemySpawner_C: (...args) => new MapBonesSpawner(...args),
    _CoinStack_C: (...args) => new MapCoinStack(...args),
    Juicer_C: (...args) => new MapJuicer(...args),
    PuzzleCloud_C: (...args) => new MapPuzzleCloud(...args),
  };

  let cls = typeMap[o.type];
  if (cls) {
    return cls;
  }

  // Types identified by substring of their type
  const typeIncludes = {
    Pipesystem: (...args) => new MapPipesystem(...args),
    Jumppad: (...args) => new MapJumppad(...args),
    DetectiveCase_: (...args) => new MapDetectiveCase(...args),
  };
  for (const [typeSubStr, cls] of Object.entries(typeIncludes)) {
    if (o.type.includes(typeSubStr)) {
      return cls;
    }
  }

  // Object names that have MapObject subclass
  const nameMap = {
    DeadHeroIndy: (...args) => new MapDeadHeroIndy(...args),
  };
  cls = nameMap[o.name];
  if (cls) {
    return cls;
  }

  // Every other object type/name
  return (...args) => new MapObject(...args);
}
