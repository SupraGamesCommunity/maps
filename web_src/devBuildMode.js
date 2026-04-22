/*eslint strict: ["error", "global"]*/
/*global L, map */

import { browser } from './utils.js';
import { MapObject } from './mapObject.jsx';
import { Settings } from './settings.js';

const skipConfirms = browser.isCode;

export const buildMode = {
  marker: undefined, // Current marker we're editing in Build Mode
  object: undefined, // Current object we're editing in Build Mode
  objectChanges: [], // Current object's changed values before they are committed to the list
  changeList: [], // Changes made in the current Build Mode session
};

export function setDevMode(newDevMode) {
  Settings.globalSetDefault('devMode', false);
  Settings.global.devMode = newDevMode;
  Settings.commit();
}

export function setBuildMode(newBuildMode) {
  Settings.globalSetDefault('buildMode', false);
  Settings.global.buildMode = newBuildMode;
  Settings.commit();
}

export function updateBuildModeValue(event) {
  let el = event.target;
  let value = '{["'.includes((el.value + ' ').charAt(0)) ? JSON.parse(el.value) : el.value;
  buildMode.object[el.id] = value;
  buildMode.objectChanges[MapObject.makeAlt(buildMode.object.area, buildMode.object.name) + '|' + el.id] = value;
}
window.updateBuildModeValue = function (event) {
  updateBuildModeValue(event);
};

function commitCurrentBuildModeChanges() {
  Object.getOwnPropertyNames(buildMode.objectChanges).forEach(function (i) {
    buildMode.changeList[i] = buildMode.objectChanges[i];
  });
  let newLat = buildMode.object.lat;
  let newLng = buildMode.object.lng;

  buildMode.marker.setLatLng(new L.LatLng(newLat, newLng));
  buildMode.objectChanges = [];
  map.closePopup();
}

window.commitCurrentBuildModeChanges = function () {
  commitCurrentBuildModeChanges();
};

export function exportBuildChanges() {
  // It might be worth accummulating the changes in this structure as we make them, but this works
  let jsonobj = {};
  Object.getOwnPropertyNames(buildMode.changeList)
    .filter((e) => e !== 'length')
    .forEach((k) => {
      let alt, prop, area, name;
      [alt, prop] = k.split('|');
      [area, name] = alt.split(':');
      if (!jsonobj[alt]) {
        jsonobj[alt] = {};
      }
      jsonobj[alt]['name'] = name;
      jsonobj[alt]['area'] = area;
      jsonobj[alt][prop] = buildMode.changeList[k];
    });
  jsonobj = Object.values(jsonobj);

  console.log(buildMode.changeList);
  let t = JSON.stringify(jsonobj, null, 2);
  browser.copyTextToClipboard(t);
  skipConfirms || alert('Build mode changes have been placed on the clipboard.');
}
