import { UESaveObject } from './lib/UE4Reader.js';
import { browser } from './utils.js';
import { Settings } from './settings.js';
import { MapObject } from './mapObject.js';

// Tracks a set of listeners for specific Id's from the save data (one listener per id)
// Id's are either area:name or property name
// For array properties listeners can provide a filter for the array property name
// Properties are assumed to default to false if no other default is provided
// Handles saving of property states to Settings for any properties with listeners

export class SaveFileSystem {
  static _listeners = {};

  static _falseFn = () => { return false; };

  static hasListener(id) {
    return id in this._listeners;
  }

  static hasAnyData() {
    for (const id in Settings.map.saveData) {
      return true;
    }
    return false;
  }

  // Add function/context to be called when event fired. Overwrites any previous listener
  // Note: default defaultValue is false
  static setListener(id, fn, context, filter, defaultValue) {
    const listener = this._listeners[id] = { fn };
    if (context !== undefined) {
      listener.ctx = context;
    }
    if (typeof filter === 'string') {
      listener.flt = filter;
    }
    if (defaultValue !== undefined) {
      listener.def = defaultValue;
    }
  }

  // Remove function/context to be removed as listener to specified event
  static clearListener(id) {
    if (id in this._listeners) {
      this._listeners[id].fn = this._falseFn;
      delete this._listeners[id];
    }
  }

  // Returns true if there is a listener and filter passes
  static _testFire(id, filter) {
    const listener = this._listeners[id];
    return listener && (listener.flt === undefined || listener.flt == filter);
  }

  // Call all functions listening for event
  static _fire(id, data) {
    const listener = this._listeners[id];
    if (listener) {
      listener.fn.call(listener.ctx, id, data);
    };
  }

  // Clear all listeners (without calling)
  static reset() {
    for (const listener of Object.values(this._listeners)) {
      listener.fn = this._falseFn;
    }
    this._listeners = {};
  }

  // Retrieve current value of property 'name'
  static getData(id) {
    let data = Settings.map.saveData[id];
    if (data !== undefined) {
      return data;
    }
    const defaultValue = this._listeners[id]?.def;
    return defaultValue !== undefined ? defaultValue : false;
  }

  // Called to set property to a specific value (commits Settings so inefficient for multiple calls)
  static setData(id, data) {
    const listener = this._listeners[id];
    if (!listener) {
      return;
    }

    const defaultValue = (listener.def !== undefined ? listener.def : false);
    if (data === defaultValue) {
      delete Settings.map.saveData[id];
    }
    else {
      Settings.map.saveData[id] = data;
    }
    Settings.commit();

    this._fire(id, data);
  }

  // Should be called after all listeners are established. Listeners are presumed to be
  // in default state already.
  static LoadSettings() {
    Settings.mapSetDefault('saveData', {});

    for (const id in this._listeners) {
      const data = Settings.map.saveData[id];
      if (data) {
        this._fire(id, data);
      }
    }
  }

  // Clear all callees to default values (or false)
  static ClearAll() {
    Settings.map.saveData = {};
    Settings.commit();

    for (const id in this._listeners) {
      const defaultValue = this._listeners[id].def;
      this._fire(id, defaultValue !== undefined ? defaultValue : false);
    }
  }

  // Read array data loaded from UE4 save file and call any listeners set up with data, saving it to settings if listener 
  static _processLoadedArray(arrayData) {
    const loadedSave = new UESaveObject(arrayData);

    this.ClearAll();

    const addToSaveData = (area, name, filter, data = true) => {
      const id = MapObject.makeAlt(area, name);
      if (this._testFire(id, filter)) {
        Settings.map.saveData[id] = data;
      }
    }

    for (const o of loadedSave.Properties) {
      // Skip things we don't knoww how to deal with
      if (!o.type || !o.name || o.name == 'None' || o.name == 'EOF'
        || (o.type == 'ObjectPropetty')   // Only player music uses this so skip it
        || (o.type == 'ArrayProperty' && o.value.innerType && o.value.innerType == 'StructProperty')
        || (o.type == 'MapProperty' && (this.mapId != 'siu' || o.name != 'ActorSaveData'))) {
        continue;
      }

      if (o.name == 'ActorSaveData') {  // This is for SIU PipeCap's
        const actorSaveData = o.value.innerValue;
        const re_match = new RegExp('([^.:]*):PersistentLevel.([^\\0]*?pipecap[^\\0]*)', 'gi');
        let m;
        while ((m = re_match.exec(actorSaveData)) != null) {
          addToSaveData(m[1], m[2], o.name);
        }
      }
      else if (o.type == 'ArrayProperty') {  // One of 'ThingsToRemove', 'ThingsToActivate', 'ThingsToOpenForever'
        for (let x of o.value.value) {
          // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
          let area = x.split("/").pop().split('.')[0];
          let name = x.split(".").pop();
          if (name != 'None') {
            name = name.charAt(0).toUpperCase() + name.slice(1);  // Shell2_1957 appears as shell2_1957 in the save file
            addToSaveData(area, name, o.name);
          }
        }
      }
      else {    // Mostly Player upgrade and other properties
        addToSaveData('', o.name, null, o.value);
      }
    }

    Settings.commit();
    for (const id in Settings.map.saveData) {
      this._fire(id, Settings.map.saveData[id]);
    }
  };

  // Load save file given by Blob (taken from UI)
  static loadFile(blob, mapId) {
    if (!(blob instanceof Blob)) {
      return;
    }
    if(mapId){
      this.mapId = mapId;
    }

    const reader = new FileReader();

    reader.onloadend = (evt) => {
      try {
        this._processLoadedArray(evt.target.result);
      } catch (e) {      // eslint-disable-line no-unused-vars
        alert(`Could not load file, incompatible format: ${blob.name}`);
      }
    }

    reader.onerror = () => {
      alert(`Error reading file, ${reader.error.message}: ${blob.name}`)
    }

    reader.readAsArrayBuffer(blob);
  }
  
  // Prompt user to select '.sav' file and then load it
  static loadFileDialog(mapId) {
    this.mapId = mapId;
    browser.openLoadFileDialog('.sav', SaveFileSystem.loadFile, SaveFileSystem);
  }

}
