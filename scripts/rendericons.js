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

let dataPath = path.join(__dirname, '../public/data');
let iconsPath = path.join(__dirname, '../public/img/markers');
let outPath = path.join(__dirname, '../public/img/rendered');
let games = ['all'];
let loggingLevelName = 'info';

//---------------------------------------------------------------------------------------------------------------------
// Parse Command Line Options

const cliOptions = {
  game: {
    type: 'string',
    short: 'g',
    default: games,
    help: '{sl|siu|sw|all} game to run icon generation for [' + games.join(',') + ']',
    multiple: true,
  },
  datapath: {
    type: 'string',
    short: 'd',
    default: dataPath,
    help: '{path} to config JSONs [' + dataPath + ']',
  },
  iconspath: {
    type: 'string',
    short: 'i',
    default: iconsPath,
    help: '{path} to find icon images [' + iconsPath + ']',
  },
  outpath: {
    type: 'string',
    short: 'o',
    default: outPath,
    help: '{path} to write generated icons to [' + outPath + ']',
  },
  logging: {
    type: 'string',
    short: 'l',
    default: loggingLevelName,
    help: 'set logging level (quiet, error, info, debug) [' + loggingLevelName + ']',
  },
  help: { type: 'boolean', short: 'h', default: false, help: 'display usage text' },
};
const args = parseArgs({ options: cliOptions, allowPositionals: true, strict: false });
args.unrecognisedOptions = Object.keys(args.values).some((x) => !(x in cliOptions));

// Set up based on arguments
games = args.values.game.includes('all') ? ['sl', 'siu', 'slc', 'sw'] : args.values.game;
iconsPath = args.values.iconspath;
dataPath = args.values.datapath;
outPath = args.values.outpath;
loggingLevelName = args.values.logging;

//---------------------------------------------------------------------------------------------------------------------
// Setup logging functions
const loggingLevelNames = { quiet: 1, fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
function getLoggingLevel(levelName) {
  return loggingLevelNames[levelName] ?? loggingLevelNames.info;
}
const loggingLevel = getLoggingLevel(loggingLevelName);
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
log_trace('games:', games);
log_trace('loggingLevel:', args.values.logging, loggingLevel);
log_trace('datapath:', dataPath);
log_trace('iconspath:', iconsPath);

//---------------------------------------------------------------------------------------------------------------------
// Read Json File
function readJsonFile(jsonPath) {
  if (fs.existsSync(jsonPath)) {
    log_debug('Reading JSON "' + jsonPath + '"');
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
const gameClasses = readJsonFile(path.join(dataPath, 'gameClasses.json'));

// Figure out what variants are used across all instances in our marker data and add them to game classes
for (const game of games) {
  const markers = loadMarkers(game, dataPath);
  markers.forEach((marker) => {
    if (marker.type in gameClasses) {
      gameClasses[marker.type].variants = (gameClasses[marker.type].variants ?? new Set()).add(marker.variant ?? '');
    }
  });
}

//---------------------------------------------------------------------------------------------------------------------
// Read iconConfigs
const iconConfigs = readJsonFile(path.join(dataPath, 'iconConfigs.json'));

// Add a set of variants we need for each class to each iconConfig
for (const classConfig of Object.values(gameClasses)) {
  if (classConfig.icon) {
    // Get the icon name and flags this class uses
    const [iconName, flags] = [...classConfig.icon.split(':'), ''];

    // Get a list of games and variants we need based on the flags and defaults
    const games = flags.includes('g') ? [...(classConfig.games ?? ['sl', 'slc', 'siu'])] : [''];
    const variants = flags.includes('v') ? [...(classConfig.variants ?? [])] : [];

    // Should never be empty list
    games.forEach((g) => {
      const gname = iconName + (g ? '.' + g : '');

      // If the class has no markers variants could be empty, if it contains
      // an empty string then we need the default variant
      variants.forEach((v) => {
        const gvname = gname + (v ? '.' + v : '');
        if (iconName in iconConfigs) {
          iconConfigs[gname].variants = (iconConfigs[gname].variants ?? new Set()).add(gvname);
        } else if (!v) {
          log_info(gname, 'not found in iconConfigs.json (', gvname, ')');
        }
      });
    });
  }
}

// Convert supraColor to the hex colour code
function toSupraColor(col) {
  return supraColors[col] || col;
}

const iconSizePx = 48; // Size in pixels of the rendered icons

const pinConfig = {
  bgIcon: 'location-pin', // Outline/background FA icon name
  outlineIconSize: iconSizePx, // Size in pixels to draw the outline icon
  bgIconSize: iconSizePx * 0.976, // Size in pixels to draw the background icon
  fgIconSize: iconSizePx * 0.45, // Size in pixels to draw the foreground icon
  fgIconYOffset: iconSizePx * 0.5 * -0.25, // Y offset to draw the foreground icon compared to background
};

const circleConfig = {
  bgIcon: 'circle', // Outline/background FA icon name
  outlineIconSize: iconSizePx, // Size in pixels to draw the outline icon
  bgIconSize: iconSizePx * 0.976, // Size in pixels to draw the background icon
  fgIconSize: iconSizePx * 0.7, // Size in pixels to draw the foreground icon
  fgIconYOffset: 0, // Y offset to draw the foreground icon compared to background
};

const faDefault = 'question-circle';

// This function draws one of the icon layers in some colour
function drawFAIcon(
  ctx, // Canvas context
  prefix, // FA icon prefix (fa, fas...)
  iconName, // FA icon name
  color, // Colour to draw the icon
  drawSize, // Size to draw the FA Icon
  canvasSize, // Size of the target canvas
  dy // Y offset to apply
) {
  // Get a font awesome icon specified by prefix and icon name
  let icon = fa_icon({ prefix, iconName }) || fa_icon({ prefix: 'fa', iconName: faDefault });

  // Extract the width/height and SVG path data from the icon
  const [w, h, , , path] = icon.icon;

  // Centre FA icon and scale it to fill the target
  const scale = drawSize / h; // scale to apply to FA icon to reach desired size vertically
  const iconWidthPx = w * scale; // Width the icon will be given scale
  const dxPx = (canvasSize - iconWidthPx) / 2; // Offset to put in the middle
  const dyPx = (canvasSize - drawSize) / 2 + dy; // Offset to put it in the middle plus delta y passed in

  ctx.setTransform(scale, 0, 0, scale, dxPx, dyPx);

  // Draw the path of the icon in the specified color
  ctx.fillStyle = toSupraColor(color);
  const path2d = new Path2D(path);
  ctx.fill(path2d);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Draw a PNG as the Icon instead of an FA icon
function drawImageIcon(ctx, iconPath, drawSize, canvasSize, dy) {
  let img = new Image();
  img.src = iconPath;
  const dx = (canvasSize - drawSize) * 0.5;
  ctx.drawImage(img, dx, dx + dy, drawSize, drawSize);
}


// Render a Font Awesome Icon and return an Image URL
function renderFAIconToImageURL(
  isPin, // Boolean true for pin, false for point
  style, // FA prefix (fas=solid, far=regular, fal=light, fat=thin, dad=duotone, fab=brands)
  iconName, // Name of an FA Icon
  fgCol, // Foreground colour
  bgCol // Background colour
) {
  // We're going to draw the icon onto a square canvas
  //const canvas = document.createElement('canvas');
  //canvas.width = canvas.height = iconSizePx;
  const canvas = createCanvas(iconSizePx, iconSizePx);
  const ctx = canvas.getContext('2d');

  const c = isPin ? pinConfig : circleConfig;

  // We draw FA icons in three layers, an outline, a slightly smaller background,
  // and then some centred icon to actually represent it.
  drawFAIcon(ctx, 'fas', c.bgIcon, 'black', c.outlineIconSize, iconSizePx, 0);
  drawFAIcon(ctx, 'fas', c.bgIcon, bgCol, c.bgIconSize, iconSizePx, 0);

  // Draw an image icon or an FA icon as the foreground icon
  if (style == 'fapng' || style == 'fasvg') {
    drawImageIcon(ctx, path.join(iconsPath, iconName + '.' + style.slice(2)), c.fgIconSize, iconSizePx, c.fgIconYOffset);
  } else {
    drawFAIcon(ctx, style, iconName, fgCol, c.fgIconSize, iconSizePx, c.fgIconYOffset);
  }

  return canvas.toBuffer('image/png');
}

// Make sure icons path exists
if (!fs.existsSync(outPath)) {
  fs.mkdirSync(outPath, { recursive: true });
}

let iconCount = 0;

// Go through all the icon configurations that have 'fa' in their style
for (const [configName, config] of Object.entries(iconConfigs)) {
  if (config.style?.startsWith('fa')) {
    // Go through all the variants we've found in our instance/class data
    // If we didn't find any variants do the default version anyway
    for (let variantConfigName of config.variants ?? [configName]) {
      let variant = variantConfigName.split('.')[1] || '';
      if (['sl', 'slc', 'siu', 'sw'].includes(variant))
        // make sure we're not confusing game for a variant
        variant = '';

      // If this variant isn't specifically specified elsewhere then create a PNG for it
      if (variantConfigName == configName || !(variantConfigName in iconConfigs)) {
        // Split bg and fg values into colour and flags
        const [fg = 'white', fgFlag = ''] = config.fg?.split(':') || [];
        let [bg = 'grey', bgFlag = ''] = config.bg?.split(':') || [];

        // If neither is explicitly set to then make bg default to variant
        if (fgFlag == '' && bgFlag == '') bgFlag = 'v';

        const buffer = renderFAIconToImageURL(
          config.type == 'pin',
          config.style,
          config.iconName,
          fgFlag == 'v' && variant ? variant : fg,
          bgFlag == 'v' && variant ? variant : bg,
          48
        );
        const outPNG = path.join(outPath, variantConfigName + '.png');
        log_trace('Config: ', configName, ' => ', outPNG);
        fs.writeFileSync(outPNG, buffer);
        iconCount++;
      }
    }
  }
}

log_info('Generated', iconCount, 'icons in', outPath);
