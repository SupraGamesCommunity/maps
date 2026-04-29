'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';

import { createCanvas, CanvasRenderingContext2D, Image } from 'canvas';
import { Path2D, applyPath2DToCanvasRenderingContext } from 'path2d';

import { library, icon as fa_icon } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

import { supraColors } from '../web_src/supraDefs.js';
import { mergeDeep } from '../web_src/utils.js';

applyPath2DToCanvasRenderingContext(CanvasRenderingContext2D);
library.add(fas, far);

//---------------------------------------------------------------------------------------------------------------------
// Set up default directories

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataPath = path.join(__dirname, '..\\public\\data');
const iconsPath = path.join(__dirname, '..\\public\\img\\markers');

//---------------------------------------------------------------------------------------------------------------------
// Parse Command Line Options

const cliOptions = {
  game: {
    type: 'string',
    short: 'g',
    default: ['sw'],
    help: '{sl|siu|sw|all} game to run icon generation for',
    multiple: true,
  },
  datapath: {
    type: 'string',
    short: 'd',
    default: dataPath.toString(),
    help: '{path} to config JSONs [' + dataPath + ']',
  },
  iconspath: {
    type: 'string',
    short: 'i',
    default: iconsPath.toString(),
    help: '{path} to icons images [' + iconsPath + ']',
  },
  logging: { type: 'string', short: 'l', default: 'info', help: 'set logging level (quiet, error, info, debug)' },
  help: { type: 'boolean', short: 'h', default: false, help: 'display usage text' },
};
const args = parseArgs({ options: cliOptions, allowPositionals: true, strict: false });
args.unrecognisedOptions = Object.keys(args.values).some((x) => !(x in cliOptions));

// Fix up 'all' to all the games
if ('all' in args.values.game) {
  args.values.game = ['sl', 'siu', 'slc', 'sw'];
}

//---------------------------------------------------------------------------------------------------------------------
// Setup logging functions
const loggingLevelNames = { quiet: 1, fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
function getLoggingLevel(levelName) {
  return loggingLevelNames[levelName] ?? loggingLevelNames.info;
}
const loggingLevel = getLoggingLevel(args.values.logging);
function log() {
  console.log.apply(null, arguments);
}
function log_error() {
  if (loggingLevelNames.error <= loggingLevel) console.log.apply(null, arguments);
}
function log_info() {
  if (loggingLevelNames.info <= loggingLevel) console.log.apply(null, arguments);
}
function log_debug() {
  if (loggingLevelNames.debug <= loggingLevel) console.log.apply(null, arguments);
}
function log_trace() {
  if (loggingLevelNames.trace <= loggingLevel) console.log.apply(null, arguments);
}

//---------------------------------------------------------------------------------------------------------------------
// Usage information
if (args.values.help || args.positionals.length > 0 || args.unrecognisedOptions) {
  log('Usage: node rendericons.js [options]\noptions:');
  for (const [name, opt] of Object.entries(cliOptions)) {
    log(`--${name}, -${opt.short}\t${opt.help}`);
  }
  if (!args.values.help) {
    log_error('\nError: unrecognised arguments:', process.argv.slice(2).join(' '));
  }
  process.exit();
}

//---------------------------------------------------------------------------------------------------------------------
// Log the command line
log_trace('games:', args.values.game);
log_trace('loggingLevel:', args.values.logging, loggingLevel);
log_trace('datapath:', args.values.datapath);
log_trace('iconspath:', args.values.iconspath);

//---------------------------------------------------------------------------------------------------------------------
// Read Json File
function readJsonFile(jsonPath) {
  if (fs.existsSync(jsonPath)) {
    log_info('Reading JSON "' + jsonPath + '"');
    return JSON.parse(fs.readFileSync(jsonPath));
  } else {
    log_error('Error: file does not exist "' + jsonPath + '"');
    process.exit();
  }
}

//---------------------------------------------------------------------------------------------------------------------
// Load all marker data
function loadMarkers(game, dataPath) {
  // Read the base marker file
  const markers = readJsonFile(path.join(dataPath, 'markers.' + game + '.json'));

  log_trace(markers.length, ' markers read');

  // Make a map from marker area:name to the marker objects
  function makeAlt(marker) {
    return marker.area + ':' + marker.name;
  }
  let markerMap = {};
  markers.forEach((marker) => {
    markerMap[makeAlt(marker)] = marker;
  });

  // Merge custom marker data into base markers
  function mergeCustomMarkers(markerMap, path) {
    const customMarkers = readJsonFile(path);
    log_trace(customMarkers.length, ' custom markers merged');
    customMarkers.forEach((marker) => {
      mergeDeep(markerMap[makeAlt(marker)], marker);
    });
  }

  // Custom-markers and custom youtube data
  mergeCustomMarkers(markerMap, path.join(dataPath, 'custom-markers.' + game + '.json'));
  mergeCustomMarkers(markerMap, path.join(dataPath, 'ytdata.' + game + '.json'));

  return markers;
}

//---------------------------------------------------------------------------------------------------------------------
// Read gameClasses and work out all variants used by them
const gameClasses = readJsonFile(path.join(args.values.datapath, 'gameClasses.json'));

// Figure out what variants are used across all instances in our marker data and add them to game classes
for (const game of args.values.game) {
  const markers = loadMarkers(game, args.values.datapath);
  markers.forEach((marker) => {
    if ('variant' in marker) {
      gameClasses[marker.type].variants = (gameClasses[marker.type].variants ?? new Set()).add(marker.variant);
    }
  });
}

//---------------------------------------------------------------------------------------------------------------------
// Read iconConfigs
const iconConfigs = readJsonFile(path.join(args.values.datapath, 'iconConfigs.json'));

// Add a set of variants we need for each class to each iconConfig
for (const classConfig of Object.values(gameClasses)) {
  if (classConfig.icon) {
    // Get the icon name and flags this class uses
    const [iconName, flags] = [...classConfig.icon.split(':'), ''];

    // Get a list of games and variants we need based on the flags and defaults
    const games = flags.includes('g') ? [...(classConfig.games ?? ['sl', 'slc', 'siu'])] : [];
    const variants = flags.includes('v') ? [...(classConfig.variants ?? [])] : [];

    // Add the icon variations to a set of icons we should have
    if (iconName in iconConfigs) {
      iconConfigs[iconName].variants = new Set([iconName]);
      games.forEach((g) => {
        iconConfigs[iconName].variants.add(iconName + '.' + g);
      });
      variants.forEach((v) => {
        iconConfigs[iconName].variants.add(iconName + '.' + v);
        games.forEach((g) => {
          iconConfigs[iconName].variants.add(iconName + '.' + v + '.' + g);
        });
      });
    } else {
      log_info(iconName, 'not found in iconConfigs.json');
    }
  }
}

// Convert supraColor to the hex colour code
function toSupraColor(col) {
  return supraColors[col] || col;
}

// Maps style to file extension
const imgExt = {
  fapng: '.png',
  fasvg: '.svg',
  png: '.png',
  svg: '.svg',
};
const defaultIconName = 'question_mark';

// Render a Font Awesome Icon and return an Image URL
function renderFAIconToImageURL(
  isPin, // Boolean true for pin, false for point
  style, // FA prefix (fas=solid, far=regular, fal=light, fat=thin, dad=duotone, fab=brands)
  iconName, // Name of an FA Icon
  bg, // Background colour
  fg = 'white' // Foreground colour
) {
  const faPin = 'location-pin'; // FA icon used for map pin marker background
  const faPoint = 'circle'; // FA icon used for map point marker background
  const faDefault = 'question-circle'; // FA icon used if asked for unknown icon
  const size = 48; // Size to render icons
  const outlineSize = size * 0.976; // Scale adjustment between shadow and background
  const pinIconSize = size * 0.5; // Size to draw the FA icon on a pin marker
  const pinCentreYOffset = pinIconSize * -0.25; // Y offset from centre of icon to centre for a pin
  const ptIconSize = size * 0.7; // Size to draw the FA icon on a point marker
  const ptCentreYOffset = ptIconSize * -0.2; // Y offset from centre of icon to centre for a pin

  // We're going to draw the icon to a canvas
  const canvas = createCanvas(size, size);
  //const canvas = document.createElement('canvas');

  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // This function draws one of the icon layers in some colour
  function drawFAIcon(prefix, iconName, color, pixelSize, dy = 0) {
    // Get a font awesome icon specified by prefix and icon name
    let icon = fa_icon.icon({ prefix, iconName }) || fa_icon.icon({ prefix: 'fa', iconName: faDefault });

    // Extract the width/height and SVG path data from the icon
    const [w, h, , , path] = icon.icon;

    // Centre FA icon and scale it to fill the target
    const scale = pixelSize / h;
    const iconWidthPx = w * scale;
    const dx = (size - iconWidthPx) / 2;
    const dyPx = (size - pixelSize) / 2 + dy;
    ctx.setTransform(scale, 0, 0, scale, dx, dyPx);

    // Draw the path of the icon in the specified color
    ctx.fillStyle = toSupraColor(color);
    const path2d = new Path2D(path);
    ctx.fill(path2d);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Draw a PNG as the Icon instead of an FA icon
  function drawImageIcon(iconName, tgtSize, iconSize, dy = 0) {
    ctx.drawImage(iconName, (size - iconSize) * 0.5, 0 - dy, iconSize, iconSize);
  }

  bg = toSupraColor(bg) || 'grey';
  fg = toSupraColor(fg) || 'white';

  // We draw FA icons in three layers, a shadow, a slightly smaller background,
  // and then some centred icon to actually represent it.
  drawFAIcon('fas', isPin ? faPin : faPoint, 'black', size);
  drawFAIcon('fas', isPin ? faPin : faPoint, bg, outlineSize);

  if (style == 'fapng' || style == 'fasvg')
    drawImageIcon(iconName, size, isPin ? pinIconSize : ptIconSize, isPin ? pinCentreOfs : ptCentreOfs);
  else
    drawFAIcon(
      style,
      iconName,
      toSupraColor(fg || 'white'),
      isPin ? pinIconSize : ptIconSize,
      isPin ? pinCentreYOffset : ptCentreYOffset
    );

  return canvas.toDataURL('image/png');
}

// Go through iconConfigs
// For each icon name in variant:
//  See if specific config exists - skip
//  Otherwise: if its a generate config (FAPNG/FASVG/FA)
//    Generate icon variant:
//      Look for image file with variant
//      Set foreground colour based on variant
//    Write PNG to output directory
// Note: Configure size of icon

for(const [icon, config] of Object.entries(iconConfigs)){
  for(const variant of config.variants){
    // If variant is explicitly configured somewhere else skip it
    if(iconConfigs.includes(variant) && iconConfigs[variant] !== config){
      continue;
    }
    if(config.style.startsWith('fa'))

    
    const isPin = (config.type == 'pin');
    const style = config.style;
    const iconName = ; 
    const bg = variant;
    const fg = ;
//  isPin, // Boolean true for pin, false for point
//  style, // FA prefix (fas=solid, far=regular, fal=light, fat=thin, dad=duotone, fab=brands)
//  iconName, // Name of an FA Icon
//  bg, // Background colour
//  fg = 'white' // Foreground colour


  for(const variant of config.variants){
    const buffer = renderFAIconToImageURL(v.class, v.color, v.background, 48);
    const outPNG = path.join(args.values.iconspath, 'icons', variant + '.png');

    fs.writeFileSync(outPNG, buffer);
  }
}
