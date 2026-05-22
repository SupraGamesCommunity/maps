import { UESaveObject } from './lib/UE4Reader.js';
import { browser } from './utils.js';
import { Settings } from './settings.js';
import { MapObject } from './mapObject.jsx';
import { UE5SaveDecoder } from './UE5SaveDecoder.js';

// Tracks a set of listeners for specific Id's from the save data (one listener per id)
// Id's are either area:name or property name
// For array properties listeners can provide a filter for the array property name
// Properties are assumed to default to false if no other default is provided
// Handles saving of property states to Settings for any properties with listeners

export class SaveFileSystem {
  static _listeners = {};

  static _falseFn = () => {
    return false;
  };

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
  // id: string: identifies instance this listener is for '{area}:{name}'
  // fn: function(ctx: any, id: string, data: varies): called when save data for instance changes
  // filter: string: if string passed in, will be used to filter data
  // context: object: used as this pointer for callbacks
  // defaultValue: any: data specific to listener instance class [false]
  // decodeData: function(ctx, ?): called to allow custom save data decoding,
  static setListener(id, fn, context, filter, defaultValue) {
    const listener = (this._listeners[id] = { fn });
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
    }
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

    const defaultValue = listener.def !== undefined ? listener.def : false;
    if (data === defaultValue) {
      delete Settings.map.saveData[id];
    } else {
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

  // If there is a listener for this object then add it as found (data)
  static _addToSaveData = (area, name, filter, data = true) => {
    const id = MapObject.makeAlt(area, name);
    if (this._testFire(id, filter)) {
      Settings.map.saveData[id] = data;
    }
  };

  // TODO: Complete Refactor
  // At the moment the special behaviour for classes is handled by the processLoadedArray but
  // this can be moved into the MapObject subclasses by adding a decoder callback to the listener,
  // whose job would be to do any further decoding required to get the state before calling the
  // add function.
  //
  // The decoder callback would be passed the UE5SaveDecoder, the default decode being
  // just calling with true if the instance is found in the file.
  //
  // Similarly the LastcheckpointActor string should be being added as a listener for the
  // _PlayerPosition object, which would just move pass the listener the instance and
  // which would then move itself to the new location.
  //
  // The old SL save handling will likely require some tweaking, if it uses the decode
  // pattern it would probably make most sense to just set the filter string as a property
  // and let the handlers query it.

  // Read array data loaded from Suprworld UE5 save file and call any listeners
  // to filter the data and save to settiings
  static _processLoadedArray_sw(arrayData) {
    const self = this;

    this.ClearAll();

    const outerStrings = [UE5SaveDecoder.INSTANCE_PATTERN, 'LastCheckpointActor'];
    const saveDecoder = new UE5SaveDecoder(arrayData, outerStrings);

    let m;
    while ((m = saveDecoder.nextOuterString()).found) {
      if (m.isInstance) {
        const map = 'Supraworld',
          name = m.found;
        const type = MapObject.get(MapObject.makeAlt(map, name))?.o.type;
        if (
          type &&
          ((type == 'PuzzleCloud_C' && saveDecoder.nextByteProperty().found != 2) ||
            (type.startsWith('DetectiveCase_') && saveDecoder.nextFString('DetainedCharacter').found == undefined))
        ) {
          continue;
        }
        self._addToSaveData(map, name);
      } else {
        // LastCheckpointActor
        m = saveDecoder.nextFString(UE5SaveDecoder.INSTANCE_PATTERN, { required: true });
        const saveObj = MapObject.get('Supraworld:' + m.found);
        self._addToSaveData('', 'Player Position', null, {
          value: { x: saveObj.o.lng, y: saveObj.o.lat, z: saveObj.o.alt },
        });
      }
    }

    Settings.commit();
    for (const id in Settings.map.saveData) {
      this._fire(id, Settings.map.saveData[id]);
    }
  }

  // Read array data loaded from Suprworld UE4 save file and call any listeners
  // to filter the data and save to settiings
  static _processLoadedArray_sl(arrayData) {
    this.ClearAll();

    const loadedSave = new UESaveObject(arrayData);

    for (const o of loadedSave.Properties) {
      // Skip things we don't knoww how to deal with
      if (
        !o.type ||
        !o.name ||
        o.name == 'None' ||
        o.name == 'EOF' ||
        o.type == 'ObjectPropetty' || // Only player music uses this so skip it
        (o.type == 'ArrayProperty' && o.value.innerType && o.value.innerType == 'StructProperty') ||
        (o.type == 'MapProperty' && (this.mapId != 'siu' || o.name != 'ActorSaveData'))
      ) {
        continue;
      }

      if (o.name == 'ActorSaveData') {
        // This is for SIU PipeCap's
        const actorSaveData = o.value.innerValue;
        const re_match = new RegExp('([^.:]*):PersistentLevel.([^\\0]*?pipecap[^\\0]*)', 'gi');
        let m;
        while ((m = re_match.exec(actorSaveData)) != null) {
          this._addToSaveData(m[1], m[2], o.name);
        }
      } else if (o.type == 'ArrayProperty') {
        // One of 'ThingsToRemove', 'ThingsToActivate', 'ThingsToOpenForever'
        for (let x of o.value.value) {
          // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
          let area = x.split('/').pop().split('.')[0];
          let name = x.split('.').pop();
          if (name != 'None') {
            name = name.capitalised(); // Shell2_1957 appears as shell2_1957 in the save file
            this._addToSaveData(area, name, o.name);
          }
        }
      } else {
        // Mostly Player upgrade and other properties
        this._addToSaveData('', o.name, null, o.value);
      }
    }

    Settings.commit();
    for (const id in Settings.map.saveData) {
      this._fire(id, Settings.map.saveData[id]);
    }
  }

  // Load save file given by Blob (taken from UI)
  static loadFile(blob, mapId) {
    if (!(blob instanceof Blob)) {
      return;
    }
    if (mapId) {
      this.mapId = mapId;
    }

    const reader = new FileReader();

    reader.onloadend = (evt) => {
      try {
        if (this.mapId == 'sw') {
          this._processLoadedArray_sw(evt.target.result);
        } else {
          this._processLoadedArray_sl(evt.target.result);
        }
      } catch {
        alert(`Could not load file, incompatible format: ${blob.name}`);
      }
    };

    reader.onerror = () => {
      alert(`Error reading file, ${reader.error.message}: ${blob.name}`);
    };

    reader.readAsArrayBuffer(blob);
  }

  // Prompt user to select '.sav' file and then load it
  static loadFileDialog(mapId) {
    this.mapId = mapId;
    browser.openLoadFileDialog('.sav', SaveFileSystem.loadFile, SaveFileSystem);
  }
}
