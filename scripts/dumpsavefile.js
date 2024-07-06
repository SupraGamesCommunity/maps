"use strict";

const UESaveObject = require ('../js/lib/UE4Reader.js');
const fs = require('node:fs');
const process = require('node:process');
const env = process.env;
const parseArgs = require('node:util').parseArgs;

const args = parseArgs({
    options: {
        file: { type: 'string', short: 'f' },
        game: { type: 'string', short: 'g', default: 'siu'},
        slot: { type: 'string', short: 's', default: '1'},
        help: { type: 'boolean', short: 'h', default: false},
        compare: { type: 'string', short: 'c'}
    },
});

if(args.values.help) {
    console.log('Usage: node dumpsavefile.js --game {siu|sl|slc} --slot {n} -f {save file} -c {compare file}');
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
}
const saveFileBaseNames = {
    sl: 'Save',
    slc: 'CrashSave',
    siu: 'SixInchesSave',
}

let saveFileName;
if(args.values.file){
    saveFileName = args.values.file;
}
else {
    saveFileName = `${localAppData}\\${saveFileBaseDirs[game]}\\Saved\\SaveGames\\${saveFileBaseNames[game]}${saveSlot}.sav`;
}

let markerFileName = `markers.${game}.json`;
const jsonData = JSON.parse(fs.readFileSync(markerFileName));
let jsonMap = {};
for(const o of jsonData) {
    let alt = `${o['area']}:${o['name']}`;
    jsonMap[alt] = o;
}

function fileBaseName(f){
    return f.replace(/^.*[\\/]/, '').replace(/\..*$/, '')
}

function readSavFile(game, file) {
    let baseName = fileBaseName(file);
    let data = fs.readFileSync(file);
    let buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    let loadedSave = new UESaveObject(buffer);
    let markers = {};
    let pj = {pipes: new Set(), pads: new Set()};

    console.log(`Reading ${baseName}`);

    // Explicit list of pipecaps that can be found in an SIU save file and the corresponding pipes
    const pipecaps = {
        'A1FastTravelPipeCap':  ['DLC2_Complete:Area1_FastTravelPipe'],
        'A1FastTravelPipeCap2': ['DLC2_Complete:PipeToArea1'],
        'A2FastTravelPipeCap':  ['DLC2_Complete:Area2ShortcutPipe'],
        'A2FastTravelPipeCap2': ['DLC2_Complete:PipeToArea2'],
        'A3FastTravelPipeCap':  ['DLC2_Complete:DLC3_upstairsPipe'],
        'A3FastTravelPipeCap3': ['DLC2_Complete:PipeToArea3'],
        'A4FastTravelPipeCap4': ['DLC2_Complete:PipeToArea4'],
        'A4FastTravelPipeCap':  ['DLC2_Complete:Pipesystem_Area4'],
        'A5FastTravelPipe_ExitCombatFinale': ['DLC2_Complete:PipeToAreaBoss2', 'DLC2_Complete:PipesystemNewDLC_CombatExitPipe'],
        'A5FastTravelPipeCap5': ['DLC2_Complete:PipeToAreaSpecial', 'DLC2_Complete:RainbowTownShortcutPipe'],
        'PipeCap_FastTravelLavaToBeam1': ['DLC2_Complete:PipesystemNewDLC_FastTravelLavaToBeam1'],
        'PipeCap_FastTravelLavaToBeam2': ['DLC2_Complete:PipesystemNewDLC_FastTravelLavaToBeam2'],
        'PipeCap12_2': ['DLC2_FinalBoss:BossArea_BaronPipe1', 'DLC2_FinalBoss:BossArea_BaronPipe2'],
    };

    // At the moment we don't need the area as the PipeCap_C names are unique to SIU, however they can be found
    // 50-60 characters earlier in the data, potentially using '/Maps/{area}\..*?PersistentLevel\.(?:{pipe cap name})'
    // The pipecaps appear more than once and can be found in ActorSaveDataStructs too but that section is larger.
    for(let p of loadedSave.Properties){
        if(p.name == 'ActorSaveData'){
            const actorSaveData = p.values;
            const str = new TextDecoder("latin1").decode(buffer);
            let re_match = new RegExp('(?:'+Object.keys(pipecaps).join('\x00)|(?:')+'\x00)', 'g');
            let m;
            let found = [];
            while((m = re_match.exec(str)) != null){
                let name = m[0].slice(0,-1);
                if(!found.includes(name)){
                    found.push(name);
                    pipecaps[name].forEach((p) => pj.pipes.add(p));
                }
            }
            break;
        }
    }

    let dupCount = 0;
    let inCount = 0;
    let outCount = 0;

    for (let o of loadedSave.Properties) {
        // Skip things we don't understand
        if(!o.type || !o.name || o.name == 'None' || o.name == 'EOF')
        {
            console.log(`Skipping: No name or type: ${Object.entries(o)}`)
            continue;
        }
        if(o.type == 'MapProperty') {
            console.log(`Skipping: ${o.name}: MapProperty: entries: ${o.length} `)
            continue;
        }
        if(o.type == 'ArrayProperty' && o.value.innerType && o.value.innerType == 'StructProperty') {
            console.log(`Skipping: ${o.name}: Array of StructProperty: Entries: ${o.length} `)
            continue;
        }
        o.name.replace(' ', '_');

        // No value it's type is it's value - likely enumeration
        if(!o.value) {
            if(markers[o.name]) {
                dupCount += 1;
            }
            markers[o.name] = o.type;
            continue;
        }       

        // Value is just the area/object name
        if(o.type == 'ObjectProperty') {
            let name = o.value.split(".").pop();
            let area = o.value.split("/").pop().split('.')[0];
            let alt = `${area}:${name}`;

            if(markers[o.name]) {
                dupCount += 1;
            }

            markers[o.name] = alt;
            if(alt in jsonMap){
                inCount += 1;
            }
            else {
                outCount += 1;
            }
            if(alt.includes(':Pipe')){
                pj.pipes.add(alt);
            }
            if (alt.includes(':Jumppad')){
                pj.pads.add(alt);
            }
            continue;
        }

        // Any type but array it's an int or bool or similar
        // Note: PlayerArea is a ByteProperty and comes out blank
        if(o.type != 'ArrayProperty')
        {
            if(markers[o.name]) {
                dupCount += 1;
            }
            markers[o.name] = o.value;
            continue;
        }

        for(let x of o.value.value) {
            if(x == 'None')
                continue;
            if(!markers[o.name])
                markers[o.name] = [];

            // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
            let name = x.split(".").pop();
            let area = x.split("/").pop().split('.')[0];

            // For some reason capitalisation is inconsistent for Shell2_1957
            name = name.charAt(0).toUpperCase() + name.slice(1)
            let alt = `${area}:${name}`;

            if(markers[o.name].includes(alt)) {
                dupCount += 1;
                continue;
            }
            markers[o.name].push(alt);

            if(alt in jsonMap){
                inCount += 1;
            }
            else {
                outCount += 1;
            }
            if(alt.includes(':Pipe')){
                pj.pipes.add(alt);
            }
            if (alt.includes(':Jumppad')){
                pj.pads.add(alt);
            }
        }
    }
    pj.pads = Array.from(pj.pads).sort();
    pj.pipes = Array.from(pj.pipes).sort();

    // Write out pads/pipes to json
    console.log(`Writing pads/pipes to savedpadpipes.${game}.json...`)
    fs.writeFileSync(`savedpadpipes.${game}.json`, JSON.stringify(pj, null, 2));

    console.log(`Duplicates count: ${dupCount}`);
    console.log(`Entries found in JSON extract: ${inCount} not found: ${outCount}`)
    return markers;
}

function compareMarkers(a, b)
{
    let c = {}
    for(const [k,v] of Object.entries(a)) {
        if(!Array.isArray(v)) {
            if(b[k] && JSON.stringify(b[k]) != JSON.stringify(v)) {
                c[k] = v;
            }
        }
        else {
            if(!Array.isArray(b[k])){
                c[k] = v;
            }
            else {
                c[k] = [];
                for(const e of v){
                    if(!b[k].includes(e)){
                        c[k].push(e);
                    }
                }
                if(c[k].length == 0)
                    delete c[k];
            }
        }
    }
    return c;
//    return a.filter(x => !b.includes(x));
}

const outputFileName = `saveextract.${game}.txt`

let base_markers = readSavFile(game, saveFileName);
let dump_markers = base_markers;

if(args.values.compare)
{
    let compare_markers = readSavFile(game, args.values.compare);
    dump_markers = {};
    dump_markers [fileBaseName(saveFileName)] = compareMarkers(base_markers, compare_markers);
    dump_markers [fileBaseName(args.values.compare)] = compareMarkers(compare_markers, base_markers);
}

let json = JSON.stringify(dump_markers, null, 2);
let count = json.split(/\r\n|\r|\n/).length;
fs.writeFileSync(outputFileName, json);

console.log(`${count} lines written to "${outputFileName}"`)
