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
export function mapContextMenu(mapObject) {
  // Remove any existing items
  mapObject.contextmenu.removeAllItems();

  // Add Map Pin from context menu
  mapObject.contextmenu.addItem({
    text: 'Add Map Pin',
    iconCls: 'contextmenu-icon',
    iconHtml: fa_icon({ prefix: 'fa', iconName: 'map-pin' }).html,
    callback: function(data) {
      MapPins.add(this, { activateLayer: true, pos: data.latlng });
    },
  });
}

//-------------------------------------------------------------------------------------------------
// Setup context menu for a map pin
//
// marker:   MapObject marker object
// layerObj: leaflet layer object to bind menu to
// menuContent:
//   clearFound
//   setFound
//   movePlayerPosition
//   hideMarker
//   getMapObjectURL
//   layerObj2:  optional additional layer object to bind to
export function markerContextMenu(marker, layerObj, menuContent) {
  let contextMenuOptions = {
    contextmenu: true,
    contextmenuInheritItems: false,
    contextmenuItems: [],
  };

  if (menuContent.clearFound) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Clear found',
      iconHtml: fa_icon({ prefix: 'far', iconName: 'square' }).html,
      callback: function() {
        this.setFound(false);
        this.closePopup();
      },
      context: marker,
    });
  }

  if (menuContent.setFound) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Mark found',
      iconHtml: fa_icon({ prefix: 'far', iconName: 'square-check' }).html,
      callback: function(data) {
        this.setFound(true);
        data.relatedTarget._map.closePopup();
      },
      context: marker,
    });
  }

  if (menuContent.movePlayerPosition) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Move player to marker',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'location-crosshairs' }).html,
      callback: function() {
        MapObject.movePlayerPosition(this);
      },
      context: marker,
    });
  }

  if (menuContent.getMapObjectURL) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Copy URL to clipboard',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'link' }).html,
      callback: function(data) {
        const objectUrl = MapParam.getMapObjectURL(data.relatedTarget._map, this.alt, false);
        browser.copyTextToClipboard(objectUrl);
      },
      context: marker,
    });
  }

  if (menuContent.hideMarker) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Hide marker', // Be nice to have a tooltip 'toggle layer to show'
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'eye-slash' }).html,
      callback: function(data) {
        data.relatedTarget._map.removeLayer(data.relatedTarget);
      },
      context: marker,
    });
  }

  layerObj.bindContextMenu(contextMenuOptions);
  menuContent.layerObj2?.bindContextMenu(contextMenuOptions);
}

//-------------------------------------------------------------------------------------------------
// Setup context menu for a map pin
//
// mapPin   reference to pin being operated on
// layerObj: leaflet layer object to bind menu to
// menuContent:
//  hidePin:
//  deletePin:
export function mapPinContextMenu(mapPin, layerObj, menuContent) {
  let contextMenuOptions = {
    contextmenu: true,
    contextmenuInheritItems: false,
    contextmenuItems: [],
  };

  if (menuContent.hidePin) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Hide pin',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'eye-slash' }).html,
      callback: function(data) {
        data.relatedTarget.remove();
      },
      context: mapPin,
    });
  }

  if (menuContent.deletePin) {
    contextMenuOptions.contextmenuItems.push({
      iconCls: 'contextmenu-icon',
      text: 'Delete pin',
      iconHtml: fa_icon({ prefix: 'fa', iconName: 'thumbtack-slash' }).html,
      callback: function() {
        MapPins.deletePin(this);
      },
      context: mapPin,
    });
  }

  layerObj?.bindContextMenu(contextMenuOptions);
}
