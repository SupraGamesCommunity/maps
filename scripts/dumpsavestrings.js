'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';

//---------------------------------------------------------------------------------------------------------------------
// Set up default directories

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dataPath = path.join(__dirname, '../public/data');
let savesPath = path.join(process.env.LOCALAPPDATA, '/Supraworld/Saved/SaveGames/Supraworld');
let saveDirName = '1';
let outPath = path.join(__dirname, '../source/sw/');
let saveName = 'SaveGame.sav';
let loggingLevelName = 'info';
let config = {
  minLength: 5,
  sort: false,
  stripGenerics: true,
  deDupe: false,
  stripInst: true,
};

//---------------------------------------------------------------------------------------------------------------------
// Parse Command Line Options

const cliOptions = {
  dataPath: {
    type: 'string',
    short: 'd',
    default: dataPath,
    help: '{path} to config JSONs [' + dataPath + ']',
  },
  savesPath: {
    type: 'string',
    short: 'i',
    default: savesPath,
    help: '{path} to saves directory [' + savesPath + ']',
  },
  saveDirName: {
    type: 'string',
    short: 'n',
    default: saveDirName,
    help: '{name} of directory containing save [' + saveDirName + ']',
  },
  saveName: {
    type: 'string',
    short: 's',
    default: saveName,
    help: '{name} of save file [' + saveName + ']',
  },
  outPath: {
    type: 'string',
    short: 'o',
    default: outPath,
    help: '{path} to write generated icons to [' + outPath + ']',
  },
  minLength: {
    type: 'string',
    default: `${config.minLength}`,
    help: `length shortest string to dump (3-50) [${config.minLength}]`,
  },
  sort: {
    type: 'boolean',
    default: config.sort,
    help: `sort strings before writing [${config.sort}]`,
  },
  stripGenerics: {
    type: 'boolean',
    default: config.stripGenerics,
    help: `strip type and structural strings [${config.stripGenerics}]`,
  },
  deDupe: {
    type: 'boolean',
    default: config.deDupe,
    help: `remove duplicate strings [${config.stripGenerics}]`,
  },
  stripInst: {
    type: 'boolean',
    default: config.stripInst,
    help: `remove UAID_* from end of instance names [${config.stripGenerics}]`,
  },
  logging: {
    type: 'string',
    short: 'l',
    default: loggingLevelName,
    help: 'set logging level (quiet, error, info, debug) [' + loggingLevelName + ']',
  },
  help: { type: 'boolean', short: 'h', default: false, help: 'display usage text' },
};
const args = parseArgs({ options: cliOptions, allowPositionals: false, strict: false, allowNegative: true });
args.unrecognisedOptions = Object.keys(args.values).some((x) => !(x in cliOptions));

// Set up based on arguments
dataPath = args.values.dataPath;
savesPath = args.values.savesPath;
saveDirName = args.values.saveDirName;
saveName = args.values.saveName;
outPath = args.values.outPath;
config.minLength = Number(args.values.minLength, 10);
config.sort = args.values.sort;
config.stripGenerics = args.values.stripGenerics;
config.deDupe = args.values.deDupe;
config.stripInst = args.values.stripInst;
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
  if (loggingLevelNames.error <= loggingLevel) console.error.apply(null, arguments);
}
function log_warn() {
  if (loggingLevelNames.error <= loggingLevel) console.warn.apply(null, arguments);
}
function log_info() {
  if (loggingLevelNames.info <= loggingLevel) console.info.apply(null, arguments);
}
function log_debug() {
  if (loggingLevelNames.debug <= loggingLevel) console.debug.apply(null, arguments);
}
function log_trace() {
  if (loggingLevelNames.trace <= loggingLevel) console.log.apply(null, arguments);
}

function error_exit(msg) {
  log_error(msg);
  process.exit(-1);
}

//---------------------------------------------------------------------------------------------------------------------
// Usage information
if (args.values.help || args.positionals.length > 0 || args.unrecognisedOptions) {
  log('Usage: node rendericons.js [options]\noptions:');
  for (const [name, opt] of Object.entries(cliOptions)) {
    const optStr = `--${name}` + (opt.short ? `, -${opt.short}` : '');
    log(optStr, ' '.repeat(17 - optStr.length), opt.help);
  }
  if (!args.values.help) {
    log_error('\nError: unrecognised arguments:', process.argv.slice(2).join(' '));
  }
  process.exit();
}

//---------------------------------------------------------------------------------------------------------------------
// Log the command line
log_trace('loggingLevel:', args.values.logging, loggingLevel);
log_trace('dataPath:', dataPath);
log_trace('savesPath:', savesPath);
log_trace('saveDirName:', saveDirName);
log_trace('saveName:', saveName);
log_trace('outPath:', outPath);
log_trace('config', config);

// Check the minLength makes sense
if (isNaN(config.minLength) || config.minLength < 4 || config.minLength > 50) {
  error_exit('Error: minLength must be a number in the range 4-50');
}

//---------------------------------------------------------------------------------------------------------------------
// Confirm the save file and output path exist
const saveFile = path.join(savesPath, saveDirName, saveName);
if (!fs.existsSync(saveFile)) {
  error_exit(`Error: '${saveFile}' does not exist`);
}

if (!fs.existsSync(outPath)) {
  fs.mkdirSync(outPath, { recursive: true });
}

// These are strings that were identified by extracting the strings from a save file
// and identifying the strings that seemed unlikely to provide any meaningful information.
// Mostly structural or types ie explaining how to read/write the data.
const genericStrings = [
  '/Script/AnyValue',
  '/Script/AnyValue.SingleValueStruct_Bool',
  '/Script/AnyValue.SingleValueStruct_Byte',
  '/Script/AnyValue.SingleValueStruct_Double',
  '/Script/AnyValue.SingleValueStruct_Float',
  '/Script/AnyValue.SingleValueStruct_Int32',
  '/Script/AnyValue.SingleValueStruct_Int64',
  '/Script/AnyValue.SingleValueStruct_Name',
  '/Script/AnyValue.SingleValueStruct_SoftObjectPtr',
  '/Script/AnyValue.SingleValueStruct_String',
  '/Script/CoreUObject',
  '/Script/CoreUObject.InstancedPropertyBag',
  '/Script/CoreUObject.LinearColor',
  '/Script/CoreUObject.Object',
  '/Script/CoreUObject.Rotator',
  '/Script/CoreUObject.Vector',
  '/Script/CoreUObject.Vector2D',
  '/Script/DynamicSave',
  '/Script/DynamicSave.DynamicSaveArray_int32',
  '/Script/DynamicSave.DynamicSaveGame',
  '/Script/DynamicWildcardModule',
  '/Script/DynamicWildcardModule.DynamicWildcard',
  '/Script/LyraGame',
  '/Script/SupraCore.DynamicSpawnData',
  '/Supraworld/Core/Structs/AttachedMeshStruct',
  '/Supraworld/Maps/Supraworld',
  'AnyValue',
  'Array',
  'ArrayProperty',
  'Arrays',
  'AttachedMeshStruct',
  'BoolProperty',
  'ButtonState',
  'ByteProperty',
  'ClassProperty',
  'ContainerType',
  'DoubleProperty',
  'DynamicSaveData',
  'DynamicSaveData_Container',
  'DynamicSave_ArrayContainer',
  'DynamicWildcardType',
  'EDynamicContainerType',
  'EDynamicContainerType::Array',
  'EDynamicContainerType::Single',
  'EnumProperty',
  'FloatProperty',
  'Int64Property',
  'IntProperty',
  'LyraInventoryItemDefinition',
  'MapProperty',
  'NameProperty',
  'NamedData',
  'Number',
  'ObjectData',
  'ObjectProperty',
  'Output_Get',
  'PropertyType',
  'Rotation',
  'SaveData',
  'Scale3D',
  'ScriptClass',
  'SoftClassPath',
  'SoftClassProperty',
  'SoftObjectProperty',
  'StrProperty',
  'StructProperty',
  'Supraworld',
  'Transform',
  'Types',
  'Value',
  'ValueAsObject',
  'ValueAsString',
  'Values',
  'Vector',
];
function isGenericString(s) {
  return genericStrings.includes(s);
}

//---------------------------------------------------------------------------------------------------------------------
// Dump the fstrings in the file
function readSaveFStrings(
  fileName,
  { minLength = 5, deDupe = false, stripInst = false, sort = false, stripGenerics = false } = {}
) {
  let data = fs.readFileSync(fileName);
  let dataview = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let strview = new TextDecoder('latin1').decode(dataview);

  const re_fstring = new RegExp(`[\\s\\S]{2}\\0\\0(?<fstring>[\\w ./:']{${minLength},})`, 'g');
  let m;

  const fstrings = deDupe ? new Set() : [];

  while ((m = re_fstring.exec(strview)) != null) {
    const length = dataview.getInt32(m.index, true);
    let fstring = m.groups.fstring;

    if (length >= fstring.length && length <= fstring.length + 5) {
      fstring = fstring.slice(0, Math.max(length, fstring.length));
      if (stripInst) {
        fstring = fstring.replace(/UAID_[0-9A-F_]*/, '');
      }
      if (!stripGenerics || !isGenericString(fstring)) {
        if (Array.isArray(fstrings)) {
          fstrings.push(fstring);
        } else {
          fstrings.add(fstring);
        }
      }
    }
  }

  const fstrings_return = Array.isArray(fstrings) ? fstrings : Array.from(fstrings);
  if (sort) {
    fstrings_return.sort();
  }
  return fstrings_return;
}

log_info('Reading: ', saveFile);
const fstrings = readSaveFStrings(saveFile, config);

const saveData = fstrings.join('\n');

const outFilePath = path.join(outPath, `${saveDirName}.${saveName}.txt`.replace(/[/\\]/, '-'));
log_info(`Writing ${fstrings.length} strings to: ${outFilePath}`);
fs.writeFileSync(outFilePath, saveData);
