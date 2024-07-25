import { SaveObjectToJsonFile } from './utils.js';

//=================================================================================================
// settings.js
//
// Holds user data about the map status, configuration and other properties. We should really
// have a save dialog and a clear button for it. Read from/written to localStorage.
//
// Current mapId can be accessed via getter/setter
//
// Settings can be accessed with:
//
//  Settings.global.{name}      - Value of global called {name}
//  Settings.map.{name}         - Value of current map setting called {name}
//
// Defaults should generally be set once during initialisation before a setting is used for first time
//
// TODO: Could add a load of assertions to check for misuse

export class Settings {

  // Key used for localStorage API
  static _localDataName = 'supragamescommunity_maps';

  // Default map id - should really be specified as argument to init
  static _defaultMapId = 'sl';

  static _localData = { mapId: Settings._defaultMapId, maps: { [Settings._defaultMapId]: {} } };

  // Save default values as they are passed in
  static _defaults = { mapId: Settings._defaultMapId };
  static _mapDefaults = {};

  // Accessors for global settings and current map settings
  static _global = Settings._localData;
  static _map = Settings._localData[Settings._defaultMapId];

  static get global() { return Settings._global; }
  static get map() { return Settings._map; }

  // Specify default Map Id and load settings from local storage
  static init(defaultMapId) {
    Settings._defaults.mapId = defaultMapId;
    Settings._localData = { mapId: defaultMapId, maps: { [defaultMapId]: {} } };
    this._localData = Object.assign(Settings._localData, JSON.parse(localStorage.getItem(Settings._localDataName)));

    Settings._global = Settings._localData;
    Settings._map = Settings._localData.maps[Settings.mapId];
  }

  // Get/Set current map (ie what map settings are associated with)
  static get mapId() {
    return Settings._global.mapId;
  }
  static set mapId(mapId) {
    Settings._global.mapId = mapId;
    if (!(mapId in Settings._global.maps)) {
      Settings._global.maps[mapId] = Object.assign({}, Settings._mapDefaults);
    }
    Settings._map = Settings._global.maps[mapId];

    // Current map is always default map
    Settings._defaults.mapId = Settings._global.mapId;
  }

  // Specify the default value for global setting
  static globalSetDefault(name, value) {
    Settings._defaults[name] = value;
    if (!(name in Settings._global))
      Settings._global[name] = value;
  }

  // Specify the default value for global setting.
  static mapSetDefault(name, value) {
    Settings._mapDefaults[name] = value;
    if (!(name in Settings._map)) {
      Settings._map[name] = value;
    }
  }

  // Restore settings to default values (or empty if no default set), only restores defaults
  // for current map unless allMaps is true.
  static restoreDefaults(allMaps) {
    Settings._global = Object.assign({}, Settings._defaults);
    if (allMaps) {
      for (const id in Settings._global.maps) {
        Settings._global.maps[id] = Object.assign({}, Settings._mapDefaults);
      }
    }
    else {
      Settings._global.maps[Settings.mapId] = Object.assign({}, Settings._mapDefaults);
    }
  }

  // Commit current settings to storage (should be called after any change)
  static commit() {
    localStorage.setItem(this._localDataName, JSON.stringify(this._localData));
  }

  // Returns formatted Json text for current settings (can be large if save file loaded)
  static getJson() {
    return JSON.stringify(Settings._localData, null, 2);
  }

  // Saves formatted Json to specified local file (downloads directory)
  static saveSettingsToFile(fileName) {
    SaveObjectToJsonFile(Settings._localData, fileName);
  }
}


/*
Don't think these are needed unless we want to auto-commit on every change

    // Returns value of a global setting
    static globalGet(name){
        return Settings._global[name];
    }

    // Update the value for a global setting
    static globalSet(name, value){
        Settings._global[name] = value;
    }

    // Returns value of a map specific setting
    static mapGet(name){
        return Settings._map[name];
    }

    // Update the value for a map specific setting
    static mapSet(name, value){
        Settings._map[name] = value;
    }

    // Update the specified property of a map setting
    static mapSetProp(name, prop, value){
        Settings._map[name][prop] = value;
    }

Settings.globalSetDefault('buildMode', false);
Settings.globalSetDefault('language', 'en')

Settings.mapSetDefault('searchText', '');

Settings.mapSetDefault('activeLayers', layerConfigs.getDefaultActive());

*/