/* globals L */

import { Settings } from './settings.js';
import { MapObject } from './mapObject.js';
import { MapLayer } from './mapLayer.js';

//=================================================================================================
// L.Control.SupraSearch
//
// Various customisations to the behaviour of stfanocudini's leaflet-search control.
//
//   https://github.com/stefanocudini/leaflet-search
//
// Fairly reliant on the internals of that plugin.
//
// Amongst the customisations:
//  Build own list of layers to search from MapLayer with optional filter
//  Clicking on search tips takes you to item
//  Handles saving of search text to Settings
//  When opening with search text, show list

const _super = L.Control.Search.prototype;

L.Control.SupraSearch = L.Control.Search.extend({
  myDefaults: {
    marker: false,          // no red circle
    initial: false,         // search any substring
    tipAutoSubmit: false,   // auto map panTo when click on tooltip
    textPlaceholder: 'Search (Enter to save search phrase)'
  },

  // Get all marker layers and give caller the chance to skip some
  createSearchLayer: function (layerFilter) {
    let searchLayers = [];
    MapLayer.forEachMarkers((id, layer) => {
      if (!layerFilter || layerFilter(id, layer)) {
        searchLayers.push(layer.layerObj);
      }
    });
    return L.layerGroup(searchLayers);
  },

  // Slightly changes default options plus creates a LayerGroup containing a filtered version of 'our' layers
  initialize: function (options) {
    options = Object.assign({}, this.myDefaults, options);

    options.layer = this.createSearchLayer(options.layerFilter);

    _super.initialize.call(this, options);
  },

  // Called from onAdd when control added to map
  // When text input gets focus, select any 'text' so typing will overwrite it 
  _createInput: function (text, className) {
    const input = _super._createInput.call(this, text, className);

    L.DomEvent.on(input, 'focus', function (e) { setTimeout(function (e) { e.target.select(); }, 50, e); }, this);
    return input;
  },

  // Called when finding matches via showTooltip to create the list of options
  // We gray out the tool tips for found objects 
  // and when the user clicks on a tip, go to that location like _handleSubmit
  _createTip: function (text, value) {
    const tip = _super._createTip.call(this, text, value);
    // Grey out tip items that have been found (TODO: fix to be more reliable)
    if (Settings.map.saveData[value.layer.options.alt]) {
      tip.style.color = '#bbb';
    }

    // When user clicks on the tip store the text, go to the tip location
    L.DomEvent
      .disableClickPropagation(tip)
      .on(tip, 'click', L.DomEvent.stop, this)
      .on(tip, 'click', function (e) {
        Settings.map.searchText = this._input.value;
        Settings.commit();

        const text = e.target.innerText
        let loc;
        if ((loc = this._getLocation(text))) {
          this.showLocation(loc, text);
          this.fire('search:locationfound', { latlng: loc, text: text, layer: loc.layer });
        }
      }, this);

    return tip;
  },

  // When user hits the magnifier button or hits enter save the input text
  // TODO: Consider whether we should always save the text when shrinking or showing location
  _handleSubmit: function () {
    // When user hits enter or otherwise confirms text from input field, save it
    if (this._input.style.display !== 'none') {
      Settings.map.searchText = this._input.value;
      Settings.commit();
    }
    _super._handleSubmit.call(this);
  },

  // Don't add the search layers to the map, that's handled when showing a location
  setLayer: function (layer) {
    this._layer = layer;
    return this;
  },

  // Close any other pop ups and activate the relevant layer
  showLocation: function (loc, title) {
    _super.showLocation.call(this, loc, title);
    this._map.closePopup();
    const mapObject = MapObject.get(loc.layer.options.alt);
    if (mapObject) {
      mapObject.activateLayers();
      loc.layer.openPopup();
    }
  },

  // When expanding set the input text to our value 
  expand: function (toggle) {
    _super.expand.call(this, toggle);

    // We can't just set _input.value as searchText also does other things
    // like adding the cancel button to wipe the text and triggering tip generation
    this.searchText(Settings.map.searchText);
  },

  // Called when cancel button is clicked or control is collapsed
  // If called from click on cancel button clear the search text
  cancel: function (e) {
    _super.cancel.call(this);
    if (e && e.currentTarget.className == 'search-cancel') {
      Settings.map.searchText = '';
      Settings.commit();
    }
  },
});

// Leaflet style wrapper for constructor
export const L_Control_supraSearch = function (options) {
  return new L.Control.SupraSearch(options);
};