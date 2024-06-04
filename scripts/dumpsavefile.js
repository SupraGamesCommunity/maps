"use strict";

const UESaveObject = require ('../js/lib/UE4Reader.js');
const fs = require('node:fs');
const process = require('node:process');
const env = process.env;
const parseArgs = require('node:util').parseArgs;

const args = parseArgs({
    options: {
        game: { type: 'string', short: 'g', default: 'siu'},
        slot: { type: 'string', short: 's', default: '1'},
        help: { type: 'boolean', short: 'h', default: false},
    },
});

if(args.values.help) {
    console.log('Usage: node dumpsavefile.js --game {siu|sl|slc} --slot {n}');
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

const saveFileName = `${localAppData}\\${saveFileBaseDirs[game]}\\Saved\\SaveGames\\${saveFileBaseNames[game]}${saveSlot}.sav`;

let markerFileName = `markers.${game}.json`;
const jsonData = JSON.parse(fs.readFileSync(markerFileName))
console.log(`${jsonData.length} objects read from "${markerFileName}"`)
let jsonMap = {}
for(const o of jsonData) {
    let alt = `${o['area']}:${o['name']}`;
    jsonMap[alt] = o;
}

let data = fs.readFileSync(saveFileName);
let buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
let loadedSave = new UESaveObject(buffer);

let marker_names = []
let stats = {}
let count = 0
for (const section of ["ThingsToRemove", "ThingsToActivate", "ThingsToOpenForever"]) {
    let inCount = 0
    let outCount = 0
    for (let o of loadedSave.Properties) {
        if (o.name != section) {
            continue;
        }
        for(let x of o.value.value) {
            if(x == 'None')
                continue;
            // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
            let name = x.split(".").pop();
            let area = x.split("/").pop().split('.')[0];
            let alt = `${area}:${name}`;

            if(!['Achievement', 'Cardboard', 'Stalagmite', 'SecretFound', 'Baron'].some(v => alt.includes(v)))
            {
                marker_names.push(name);
                count += 1;
                if(alt in jsonMap){
                    inCount += 1;
                }
                else {
                    outCount += 1;
                }
            }
        }
    }
    stats[section] = {in: inCount, out: outCount};
}

const outputFileName = `${game}.marker_names.txt`
marker_names = marker_names.join('\r\n') + '\r\n'
fs.writeFileSync(outputFileName, marker_names)

console.log(`${count} object names written to "${outputFileName}"`)
console.log(stats)

