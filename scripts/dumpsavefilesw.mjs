"use strict";

import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path';
import { parseArgs } from 'util';
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const filename = path.basename(__filename);

const env = process.env;
const scriptname = path.basename(filename);

const args = parseArgs({
    options: {
        file: { type: 'string', short: 'f' },
        game: { type: 'string', short: 'g', default: 'siu'},
        slot: { type: 'string', short: 's', default: '1'},
        help: { type: 'boolean', short: 'h', default: false},
    },
});

if(args.values.help) {
    console.log(`Usage: node ${scriptname}.js --game {siu|sl|slc} --slot {n} -f {save file} -c {compare file}`);
    process.exit();
}

// run with: node dumpsavefile.js
let game = args.values.game;            // One of sl, slc or siu
let saveSlot = args.values.slot;        // Slot to load

let localAppData = env.LOCALAPPDATA;

const saveFileBaseDirs = {
    sl: 'Supraland',
    slc: 'Supraland',
    siu: 'SupralandSIU',
    sw: 'Supraworld',
}
const saveFileBaseNames = {
    sl: 'Save',
    slc: 'CrashSave',
    siu: 'SixInchesSave',
    sw: 'Supraworld',
}

let saveFileName;
if(args.values.file){
    saveFileName = args.values.file;
}
else {
    if(game == 'sw')
        saveFileName = `${localAppData}\\${saveFileBaseDirs[game]}\\Saved\\SaveGames\\${saveFileBaseNames[game]}\\${saveSlot}\\SaveGame.sav`;
    else
        saveFileName = `${localAppData}\\${saveFileBaseDirs[game]}\\Saved\\SaveGames\\${saveFileBaseNames[game]}${saveSlot}.sav`;
}

let markerFileName = `..\\data\\markers.${game}.json`;
const jsonData = JSON.parse(fs.readFileSync(markerFileName));
var jsonMap = {};
for(const o of jsonData) {
    let alt = `${o['area']}:${o['name']}`;
    jsonMap[alt] = o;
}

function readSavFile(game, file) {
    let data = fs.readFileSync(file);
    let dataview = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let strview = new TextDecoder("latin1").decode(dataview);

    let notOnMap = [];
    const srchStr = '\0PersistentLevel.'
    const re_match = new RegExp(srchStr, 'gi');
    let m;
    while ((m = re_match.exec(strview)) != null) {
        let namelen = dataview.getInt32(m.index+1-4, true)-srchStr.length+1;
        let nameidx = m.index + srchStr.length;
        let name = strview.slice(nameidx, nameidx+namelen);
        let alt = 'Supraworld:'+name;
        if(name.startsWith('SecretVolume_C')) {
            if(alt in jsonMap) {
                jsonMap[alt].found = true;
            }
            else {
                notOnMap.push(name);
            }
        }
    }

    let foundSecrets = { 'all': { 'total': 0, 'found': 0, missed: [] }}
    for(const o of jsonData) {
        if(o.type == 'SecretVolume_C'){
            const area = o?.area_tag || "none";
            foundSecrets.all.total += 1;
            foundSecrets[area] ??= { 'total': 0, 'found': 0, missed: [] }
            foundSecrets[area].total += 1;
            if(o?.found){
                foundSecrets.all.found += 1;
                foundSecrets[area].found += 1;
            }
            else {
                foundSecrets[area].missed.push(o.name);
            }
        }
    }
    function capitalise(s){return s.charAt(0).toUpperCase()+s.slice(1)}
    function camel2ui(s){return capitalise(s).replace(/([A-Z])/g, ' $1').trim()}
    function snake2ui(s){return s.split('_').map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' ')}
    console.log(`${foundSecrets.all.total - foundSecrets.all.found} missed of ${foundSecrets.all.total} (${(((foundSecrets.all.found * 100)/foundSecrets.all.total)).toFixed()}% found)`)
    for(const [area, secrets] of Object.entries(foundSecrets)) {
        console.log(`${camel2ui(area)}: ${secrets.total - secrets.found} missed of ${secrets.total} (${(((secrets.found * 100)/secrets.total)).toFixed()}% found)`)
        for(const secret of secrets.missed)
            console.log(`  ${secret}`)
    }
    console.log(`${Object.entries(notOnMap).length} secrets not found on map`);
    for(const secret of notOnMap){
        console.log(`  ${secret}`)
    }
    //console.log(`Duplicates count: ${dupCount}`);
    //console.log(`Entries found in JSON extract: ${inCount} not found: ${outCount}`)
    return {};
}

let dump_markers = readSavFile(game, saveFileName);

let json = JSON.stringify(dump_markers, null, 2);
let count = json.split(/\r\n|\r|\n/).length;
//fs.writeFileSync(outputFileName, json);

//console.log(`${count} lines written to "${outputFileName}"`)
