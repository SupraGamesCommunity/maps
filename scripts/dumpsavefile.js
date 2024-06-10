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

function readSavFile(file) {
    let baseName = file.replace(/^.*[\\/]/, '').replace(/\..*$/, '')
    let data = fs.readFileSync(file);
    let buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    let loadedSave = new UESaveObject(buffer);
    let markers = new Set();
    let dupCount = 0;
    let sections = [
        //'ActorSaveData',
        //'ActorSaveDataStructs',
        //'AllNPCSettings',
        //'BackupSlots',
        'BodyType',
        'BoomeraxeStats',
        'EDLC2Area',
        'EOF',
        'ElectricityGunStats',
        'FireGunStats',
        'GunCriticalDamageChance',
        'HasBrokenPipeDetector',
        'Loop',
        //'None',
        'Percent',
        'Pickaxe',
        'Player Position',
        'PlayerAmmoRegenSpeed',
        'PlayerArea',
        'PlayerArmor',
        'PlayerBeamElastic',
        'PlayerBones',
        'PlayerCoinMagnet',
        'PlayerCoins',
        'PlayerComboDamage',
        'PlayerCrashLoop',
        'PlayerCritChance',
        'PlayerCrouchCount',
        'PlayerCubesSpawned',
        'PlayerCurrentMusic',
        'PlayerCurrentMusicVolumeV2',
        'PlayerDeathCount',
        'PlayerDoubleHealth',
        'PlayerDoubleLoot',
        'PlayerDrankHealthPlusJuice',
        'PlayerEndgame',
        'PlayerEnemiesLoot',
        'PlayerForceCubeStomp',
        'PlayerForceCubeStompJump',
        'PlayerGameTime',
        'PlayerGametime',
        'PlayerGrappleForceCube',
        'PlayerGrappleGold',
        'PlayerGunAltDamage',
        'PlayerGunKillGrave1',
        'PlayerGunKillGrave2',
        'PlayerGunPicksUpCoins',
        'PlayerGunRefireRate',
        'PlayerHappy',
        'PlayerHasBelt',
        'PlayerHasBoneDetector',
        'PlayerHasChestDetector',
        'PlayerHasCrouch',
        'PlayerHasDamageNumberRising',
        'PlayerHasElectricGun',
        'PlayerHasFireGun',
        'PlayerHasForceCube',
        'PlayerHasForceCubeTelefrag',
        'PlayerHasGrapple',
        'PlayerHasGraveDetector',
        'PlayerHasGun',
        'PlayerHasGunAlt',
        'PlayerHasGunCriticalDamage',
        'PlayerHasMultijump1',
        'PlayerHasMultijump2',
        'PlayerHasPickaxe',
        'PlayerHasSeeChestNum',
        'PlayerHasSeeGraveNum',
        'PlayerHasSmashDown',
        'PlayerHasSpeedx15',
        'PlayerHasSpeedx2',
        'PlayerHasSword',
        'PlayerHasSword2',
        'PlayerHasSwordCriticalDamage',
        'PlayerHasSwordKillGrave1',
        'PlayerHasSwordKillGrave2',
        'PlayerHasTranslocator',
        'PlayerHasTrophyDetector',
        'PlayerHealth',
        'PlayerHealthRegen',
        'PlayerHealthRegenSpeed',
        'PlayerHealthRegenToX',
        'PlayerJumpCount',
        'PlayerJumpHeightPlus',
        'PlayerKillCount',
        'PlayerKilledArchers',
        'PlayerKilledDemonBomb',
        'PlayerKilledDemonGrunts',
        'PlayerKilledFatty',
        'PlayerKilledGrunts',
        'PlayerKilledKings',
        'PlayerKilledMage',
        'PlayerKilledWarrior',
        'PlayerLootHealthLuck',
        'PlayerMagnetRepel',
        'PlayerMapUnlocks',
        'PlayerMaxChestRadius',
        'PlayerMaxCoins',
        'PlayerMaxHealth',
        'PlayerMaxJumps',
        'PlayerProgressPoints',
        'PlayerProjectile1Damage',
        'PlayerProjectile1Radius',
        'PlayerProjectile1Speed',
        'PlayerRedCoins',
        'PlayerScrap',
        'PlayerShieldBreaker',
        'PlayerShowHealthBar',
        'PlayerShowProgressPoints',
        'PlayerSilentFeet',
        'PlayerSkillKillGrave3',
        'PlayerSmashDownDamage',
        'PlayerSmashDownRadius',
        'PlayerStats',
        'PlayerStrong',
        'PlayerSwingCount',
        'PlayerSwordRange',
        'PlayerTranslocatorCooldown',
        'PlayerTranslocatorDamage',
        'PlayerTranslocatorMassFactor',
        'PlayerTranslocatorModule',
        'PlayerTranslocatorThrowForce',
        'PlayerTutorialDone',
        'PlayerTwistOver',
        'Quest',
        //'SavedVersions',
        'SwordCriticalDamageChance',
        'SwordDamage',
        'SwordRefireRate',
        //'ThingsToActivate',
        //'ThingsToOpenForever',
        //'ThingsToRemove',
        'bShowMenuEngagementCups',
        'playerBodyType',
    ];
    let newSections = new Set();

    for (const section of sections) {
        let inCount = 0;
        let outCount = 0;
        for (let o of loadedSave.Properties) {
            if (o.name != section) {
                if(!sections.includes(o.name))
                    newSections.add(o.name);
                continue;
            }
            if(!o.value) {
                continue;
            }
            if(!o.value.value || o.name == 'Quest' || o.value.innerType && o.value.innerType == 'StructProperty') {
                markers.add(section+':'+JSON.stringify(o.value));
                continue;
            }
            for(let x of o.value.value) {
                if(x == 'None')
                    continue;
                // map '/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete:PersistentLevel.Coin442_41' to 'DLC2_Complete:Coin442_41'
                let name = x.split(".").pop();
                let area = x.split("/").pop().split('.')[0];
                let alt = `${area}:${name}`;

                if(markers.has(section+':'+alt))
                    dupCount += 1;
                markers.add(section+':'+alt);
                if(alt in jsonMap){
                    inCount += 1;
                }
                else {
                    outCount += 1;
                }
            }
        }
        if(inCount > 0 || outCount > 0)
            console.log(`${baseName}:${section} in: ${inCount} out: ${outCount}`)
    }
    console.log(`Skipped Sections: ${Array.from(newSections)}`);
    console.log(`Duplicates count: ${dupCount}`);
    return markers;
}

function setDifference(a, b)
{
    return new Set([...a].filter(x => !b.has(x)));
}

let base_markers = readSavFile(saveFileName);
let dump_markers = base_markers;

let compare_markers;
if(args.values.compare)
{
    compare_markers = readSavFile(args.values.compare);
    const inbase = setDifference(base_markers, compare_markers);
    const incomp = setDifference(compare_markers, base_markers);
    console.log(`Base not Comp ${inbase.size}`);
    console.log(`Comp not Base ${incomp.size}`);
    let dump_markers = new Set([...inbase, ...incomp]);
}

const outputFileName = `$saveextract.{game}.txt`
let count = dump_markers.size;
fs.writeFileSync(outputFileName, Array.from(dump_markers).join('\r\n') + '\r\n')

console.log(`${count} object names written to "${outputFileName}"`)
