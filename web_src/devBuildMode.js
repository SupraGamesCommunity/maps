/*eslint strict: ["error", "global"]*/
import { browser } from './utils.js';
import { MapObject } from './mapObject.jsx';
import { Settings } from './settings.js';
import { LatLng } from 'leaflet';

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
  MapObject.updateTitles();
}

// YouTube video id is an 11 character base 64 string following embed+{separator} or {separator}v=
// and followed by end of line or a separator. If there's a matrch we assign it to group id with (?<id>...)
function getYTUrlVideoId(url){
  return url.match(/(embed[/?#]|[/]|[/?#&]v=|^)(?<id>[0-9a-zA-Z_-]{11})($|[/?#&])/)?.groups.id;
}

// Try to extract the video id, start and end time from the string. If it doesn't find a video id
// returns undefined, otherwise returns { yt_video: {video id} ?start: {seconds} ?end: {seconds} }
function getYTUrlTime(url, end = false){
    const timeParts =
        url.match(
            new RegExp(
                  '[?&#]'
                + (end ? 'end=' : '(start|t)=')
                + '((?<h>[0-9]+)(h))?((?<m>[0-9]+)(m))?((?<s>[0-9]+)(s|[&?#]|$))?'
            )
        )?.groups;
    return timeParts ?
        ( Number(timeParts.h ?? 0) * 60 * 60
        + Number(timeParts.m ?? 0) * 60
        + Number(timeParts.s ?? 0)).toString() : undefined;
}

// If it's not a exactly just video id, see if it contains what looks like
// some youtube parameters for video id and timestemps and extract them.
function getVideoParams(url) {
    let params = {};
    params.yt_video ??= getYTUrlVideoId(url);
    if(params.yt_video) {
        if(url.length != 11) {
          params.yt_start ??= getYTUrlTime(url);
          params.yt_end ??= getYTUrlTime(url, {end: true} );
        }
      return params;
    }
    return { yt_video: url };
}

export function updateBuildModeValue(event) {
  let el = event.target;
  let value = '{["'.includes((el.value + ' ').charAt(0)) ? JSON.parse(el.value) : el.value;

  function buildModeSetValue(id, value) {
    buildMode.object[id] = value;
    buildMode.objectChanges[MapObject.makeAlt(buildMode.object.area, buildMode.object.name) + '|' + id] = value;
  }

  if(el.id == 'yt_video'){
    Object.entries(getVideoParams(value)).forEach(([id, value]) => {
      if(value)
        buildModeSetValue(id, value)
    });
  }
  else {
    buildModeSetValue(el.id, value);
  }
}
window.updateBuildModeValue = function (event) {
  updateBuildModeValue(event);
};

export function commitCurrentBuildModeChanges() {
  Object.getOwnPropertyNames(buildMode.objectChanges).forEach(function (i) {
    buildMode.changeList[i] = buildMode.objectChanges[i];
  });
  let newLat = buildMode.object.lat;
  let newLng = buildMode.object.lng;

  buildMode.marker.setLatLng(new LatLng(newLat, newLng));
  buildMode.objectChanges = [];
}

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
