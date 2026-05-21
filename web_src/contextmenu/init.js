// Map, marker and map pin context menu initialisation / setup

import '../css/contextmenu.css';

import { browser } from '../utils.js';
import { MapParam } from '../mapParam.js';
import { MapObject } from '../mapObject.jsx';
import { MapPins } from '../mapPins.js';

import '../css/lib/leaflet.contextmenu.css';
import { ContextMenu } from '../lib/leaflet.contextmenu.js';

import { icon as fa_icon } from '@fortawesome/fontawesome-svg-core';

// Context menu callbacks are called with:
//  this = contextMenuOptions.context or the map object
//  data = {
//    containerPoint: the point clicked on within window frame
//    layerPoint: the point clicked on within the map layer
//    latlng: the map coordinates of the point clicked on
//    relatedTarget: the marker (or other object) clicked on
//    relatedEvent: the original event for the click
//  };

//-------------------------------------------------------------------------------------------------
// Setup context menu for the leaflet map
export function mapContextMenu(mapObject, { addPin = true }) {
  // Remove any existing items
  mapObject.contextmenu.removeAllItems();

  if (addPin) {
    // Add Map Pin from context menu
    mapObject.contextmenu.addItem({
      text: 'Add Map Pin',
      iconCls: 'contextmenu-icon',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'map-pin' }).html,
      callback: function (data) {
        MapPins.add(this, { activateLayer: true, pos: data.latlng });
      },
    });
  }
}

//-------------------------------------------------------------------------------------------------
// Setup context menu for a map pin
export function markerContextMenu(
  marker, // MapObject instance pointer
  layerObj, // leaflet layer object
  {
    clearFound = false,
    setFound = false,
    movePlayerPosition = false,
    hideMarker = false,
    getMapObjectURL = false,
    layerObj2 = undefined,
  } = {}
) {
  let contextMenuOptions = {
    contextmenu: true,
    contextmenuInheritItems: false,
    contextmenuItems: [],
  };

  if (clearFound) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Clear found',
      iconHtml: fa_icon({ prefix: 'far', iconName: 'square' }).html,
      callback: function () {
        this.setFound(false);
        this.closePopup();
      },
      context: marker,
    });
  }

  if (setFound) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Mark found',
      iconHtml: fa_icon({ prefix: 'far', iconName: 'square-check' }).html,
      callback: function (data) {
        this.setFound(true);
        data.relatedTarget._map.closePopup();
      },
      context: marker,
    });
  }

  if (movePlayerPosition) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Move player to marker',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'location-crosshairs' }).html,
      callback: function () {
        MapObject.movePlayerPosition(this);
      },
      context: marker,
    });
  }

  if (getMapObjectURL) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Copy URL to clipboard',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'link' }).html,
      callback: function (data) {
        const objectUrl = MapParam.getMapObjectURL(data.relatedTarget._map, this.alt, false);
        browser.copyTextToClipboard(objectUrl);
      },
      context: marker,
    });
  }

  if (hideMarker) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Hide marker', // Be nice to have a tooltip 'toggle layer to show'
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'eye-slash' }).html,
      callback: function (data) {
        data.relatedTarget._map.removeLayer(data.relatedTarget);
      },
      context: marker,
    });
  }

  layerObj.bindContextMenu(contextMenuOptions);
  layerObj2?.bindContextMenu(contextMenuOptions);
}

//-------------------------------------------------------------------------------------------------
// Setup context menu for a map pin
export function mapPinContextMenu(
  mapPin, // mapPin reference
  layerObj, // leaflet layer object
  { hidePin = false, deletePin = false } = {}
) {
  let contextMenuOptions = {
    contextmenu: true,
    contextmenuInheritItems: false,
    contextmenuItems: [],
  };

  if (hidePin) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Hide pin',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'eye-slash' }).html,
      callback: function (data) {
        data.relatedTarget.remove();
      },
      context: mapPin,
    });
  }

  if (deletePin) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Delete pin',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'thumbtack-slash' }).html,
      callback: function () {
        MapPins.deletePin(this);
      },
      context: mapPin,
    });
  }

  layerObj?.bindContextMenu(contextMenuOptions);
}
