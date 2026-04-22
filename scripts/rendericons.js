"use strict";

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { parseArgs } from 'util';

import { createCanvas,  CanvasRenderingContext2D, Image  } from 'canvas';
import { Path2D,  applyPath2DToCanvasRenderingContext } from "path2d";

applyPath2DToCanvasRenderingContext(CanvasRenderingContext2D);

import * as FontAwesome from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'

FontAwesome.library.add(fas, far)

const supraColors = {
  "aqua":        "#00FFFF",
  "black":       "#030303",
  "blue":        "#0000FF",
  "brown":       "#964B00",
  "custom":      "#FFFFFF",
  "cyan":        "#00FFFF",
  "green":       "#49FF00",
  "grey":        "#898989",
  "lightorange": "#FFD680",
  "lime":        "#00FF00",
  "magenta":     "#FF00FF",
  "orange":      "#FF7700",
  "pink":        "#FFB6C1",
  "purple":      "#800080",
  "red":         "#FF0000",
  "white":       "#FFFFFF",
  "yellow":      "#ffe731",
  "yellowblack": "#8f8f00",
  "gold":        "#FFD700", // #EEE8AA, #FFD700, #EFBF04, #FFBF00, #DAA520, #CFB53B, #B8860B
}

const toSupraColor = (col) => { return supraColors[col] || col } 

const env = process.env;
let localAppData = env.LOCALAPPDATA;

const args = parseArgs({
    options: {
        path: { type: 'string', short: 'p', default: '..\\source' },
        help: { type: 'boolean', short: 'h', default: false}
    },
});

if(args.values.help) {
    console.log('Usage: node rendericons.js -p {read/write path}');
    process.exit();
}


function renderFAIconToImageURL(fa_class, bg, fg=toSupraColor('white'), size=48) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  function drawFAIcon(prefix, iconName, color, pixelSize, dy = 0) {
    let icon = FontAwesome.icon({ prefix, iconName });

    if (!icon) icon = FontAwesome.icon({ prefix:'fa', iconName: 'question-circle' });

    const [w, h, , , path] = icon.icon;
    const scale = pixelSize / h;
    const iconWidthPx = w * scale;
    const dx = (size - iconWidthPx) / 2;
    const dyPx = (size - pixelSize) / 2 + dy;
    ctx.setTransform(scale, 0, 0, scale, dx, dyPx);

    ctx.fillStyle = toSupraColor(color);
    const path2d = new Path2D(path);
    ctx.fill(path2d);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function parseFAClass(faClass) {
    const parts = faClass.trim().split(/\s+/);
    const prefix = parts.find(p => p.startsWith('fa-') || p === 'fa')?.replace('fa-', '') || 'solid';
    const iconName = parts.find(p => p.startsWith('fa-') && p !== 'fa' && p !== `fa-${prefix}`)?.replace('fa-', '');
    const prefixMap = { solid: 'fas', regular: 'far', light: 'fal', thin: 'fat', duotone: 'fad', brands: 'fab' };
    return { prefix: prefixMap[prefix] || 'fas', iconName };
  }

  fg = toSupraColor(fg || 'white');
  bg = toSupraColor(bg || 'grey');
  let t = parseFAClass(fa_class);
/*
  drawFAIcon('fas', 'circle', toSupraColor('black'), size * 1.0);
  drawFAIcon('fas', 'circle', bg, size * 0.976);
  drawFAIcon(t.prefix, t.iconName, fg, size * 0.55, 0);
*/

  drawFAIcon('fas', 'location-pin', toSupraColor('black'), size * 1.0);
  drawFAIcon('fas', 'location-pin', bg, size * 0.976);
  drawFAIcon(t.prefix, t.iconName, fg, size * 0.45, -size/8);

/*

  let img = new Image();
  img.src = "..\\img\\markers\\brick.obsidian.png";
  ctx.drawImage(img, size / 2 * (1 - 0.55), size/8, size * 0.55, size * 0.55);
*/
  return canvas.toBuffer('image/png'); 
}

const iconsPath = path.join(args.values.path, 'icons.json');
const iconData = JSON.parse(fs.readFileSync(iconsPath))

iconData['misc'] = {"class": "fa-solid fa-circle-question", "bg": "grey"};

for (const [k, v] of Object.entries(iconData)) {
    const buffer = renderFAIconToImageURL(v.class, v.color, v.background, 48);
    const outPNG = path.join(args.values.path, 'icons', k + '_pin.png');
    fs.writeFileSync(outPNG, buffer)
}

console.log(`${Object.keys(iconData).length} icon files written to "${path.join(args.values.path, 'icons')}"`)
