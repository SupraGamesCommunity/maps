# install UE4Parse module: pip install UE4Parse[tex]@git+https://github.com/joric/pyUE4Parse.git
# This was previously: pip install UE4Parse[tex]@git+https://github.com/MinshuG/pyUE4Parse.git
# install dependencies: pip install mathutils aes numpy scikit-learn libpysal

from UE4Parse.Assets.Objects.FGuid import FGuid
from UE4Parse.Provider import DefaultFileProvider, MappingProvider
from UE4Parse.Versions import EUEVersion, VersionContainer
from UE4Parse.Encryption import FAESKey
from UE4Parse.Assets.PackageReader import LegacyPackageReader
from UE4Parse.BinaryReader import BinaryStream

import glob
from itertools import groupby
from mathutils import Vector, Matrix, Euler, Quaternion
from math import radians
import logging, gc, json, gc, os, sys, csv, re, argparse, tempfile
import numpy as np
from sklearn.neighbors import KDTree
import networkx as nx
from libpysal import weights

stripUnusedClasses = False      # strip any instances that have a type we don't explicitly support in gameClasses.js  
stripUnusedProperties = True    # strip any properties we don't explicitly require from all objects (defined in exported_properties)

config = {
    'sl': {
        'path': 'C:/Program Files (x86)/Steam/steamapps/common/Supraland/Supraland/Content/Paks/',
        'prefix': 'Supraland/Content/FirstPersonBP/Maps/',
        'blueprints': 'Supraland/Content/Blueprints/Levelobjects/',
        'maps': [
            'Map'
        ],
        'images': [
            'Supraland/Content/Blueprints/PlayerMap/Textures/T_Downscale0',
            'Supraland/Content/Blueprints/PlayerMap/Textures/T_Downscale1',
            'Supraland/Content/Blueprints/PlayerMap/Textures/T_Downscale2',
            'Supraland/Content/Blueprints/PlayerMap/Textures/T_Downscale3',
        ],
    },
    'slc': {
        'path': 'C:/Program Files (x86)/Steam/steamapps/common/Supraland/Supraland/Content/Paks/',
        'prefix': 'Supraland/Content/FirstPersonBP/Maps/',
        'blueprints': 'Supraland/Content/Blueprints/Levelobjects',
        'maps': [
            'Crash'
        ],
        'images': [
        ],
    },
    'siu': {
        'path': 'C:/Program Files (x86)/Steam/steamapps/common/Supraland Six Inches Under/SupralandSIU/Content/Paks/',
        'prefix': 'SupralandSIU/Content/FirstPersonBP/Maps/',
        'blueprints': '/Game/Blueprints/Levelobjects/',
        'maps': [
            'DLC2_Complete',
            'DLC2_FinalBoss',
            'DLC2_Area0',
            'DLC2_SecretLavaArea',
            'DLC2_PostRainbow',
            'DLC2_Area0_Below',
            'DLC2_RainbowTown',
            'DLC2_Menu_Splash',
            'DLC2_Splash',
            'DLC2_Menu',
            'DLC2_LateChanges',
        ],
        'images': [
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q0',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q1',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q2',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q3',
        ],
    },
    'sw': {
        'maps': [
            'Supraworld'
        ],
    }
}



#ESupraColors::Custom		0xFFFFFF
#ESupraColors::Red			0xFF0000
#ESupraColors::Green		0x49FF00
#ESupraColors::Blue			0x0000FF
#ESupraColors::Yellow		0xFFFF00
#ESupraColors::White		0xFFFFFF
#ESupraColors::Black		0x030303
#ESupraColors::Brown		0x964B00
#ESupraColors::Purple		0x800080
#ESupraColors::Orange		0xFF7700
#ESupraColors::Cyan			0x00FFFF
#ESupraColors::Lime			0x00FF00
#ESupraColors::Aqua			0x00FFFF
#ESupraColors::LightOrange	0xFFD680
#ESupraColors::Grey			0x898989
#ESupraColors::Magenta		0xFF00FF
#ESupraColors::Pink			0xA74472

marker_types = {
  'PlayerStart','Jumppad_C','Bones_C','Chest_C','BarrelColor_C', 'BarrelRed_C','Battery_C',
  'BP_A3_StrengthQuest_C','Lift1_C', 'DeadHero_C','ExplodingBattery_C', 'GoldBlock_C',
  'GoldNugget_C', 'Jumppillow_C', 'MoonTake_C', 'Plumbus_C','Stone_C', 'ValveCarriable_C',
  'ValveSlot_C', 'Valve_C','MatchBox_C','Shell_C','BarrelClosed_Blueprint_C','MetalBall_C',
  'Supraball_C','Key_C','KeyLock_C','KeycardColor_C','PipeCap_C','Sponge_C','Juicer_C','Seed_C',
  'Anvil_C','Map_C','NomNomFlies_C','CarrotPhysical_C','RingColorer_C','RespawnActor_C',
  'CarryStones_Heavy_C','CarryStones_C','Crystal_C','RingRusty_C','SecretFound_C',
  # slc
  'Scrap_C','TalkingSpeaker_C','Sponge_Large_C',
  # siu
  'HealingStation_C','BP_EngagementCup_Base_C','SlumBurningQuest_C','Trash_C',
  'BP_Area2_Uncloged_Quest_C', 'BathGuyVolume_C', 'BP_A3_RobBoss_C', 'BP_Area2_FatGuyQuest_C',
  'BP_ParanoidQuest_C', 'BP_A3_BBQ_C', 'BP_RebuildSlum_C'         
}

starts_with = {
    'Pipesystem','Buy','BP_Buy','BP_Purchase','BP_Unlock', 'Purchase','Upgrade','Button','Smallbutton','Coin',
    'Lighttrigger','LotsOfCoins','EnemySpawn','Destroyable','BP_Pickaxe','Door','Key','ProjectileShooter',
    'MinecraftBrick', # can be MinecraftBrick_C and MinecraftBrickRespawnable_C
    'CrashEnemySpawner_C',
}

ends_with = {
    'Chest_C','Button_C','Lever_C','Meat_C','Loot_C','Detector_C','Door_C','Flower_C','Coin_C','Guy_C',
    'TriggerVolume_C', # opens pipes in SIU
}

properties = [
    'IsInShop','canBePickedUp', 'PriceType', # BP_UnlockMap_C, etc.
    'Coins','CoinsInGold','Cost','Value', # Chest_C
    'HitsToBreak','bObsidian', 'HitsTaken', 'BrickType', # Minecraftbrick_C
    'AllowEnemyProjectiles','RequiresPurpleShot?', 'ButtonType', 'Shape', # Button_C
    'Color', 'OriginalColor', # Seed_C/*Flower_C/Keycard*_C (0 - white, 1 - yellow, 2 - red, 5 - green)
    'RelativeVelocity', 'AllowStomp', 'DisableMovementInAir', 'RelativeVelocity?', 'CenterActor', # jumpppad_c
    'Achievement?','Achievement Name', # trigger volumes
    'Contains Coin', # DestroyablePots_C
    'bDoesntRotate', # Coin_C, CoinBig_C
    'Scrapamount', # Scrap_C
]

actions = {
    'OpenWhenTake','Actor','Actors','ActivateActors','Actor To Move','More Actors to Turn On','ActorsToActivate',
    'Actors to Open','Actors To Enable/Disable','ObjectsToInvert','ActivateThese','Actors to Activate',
    'ActorsToOpen','ObjectsToDestroy','OpenOnDestroy','ActorsToOpenOnOpen','PostTownCelebration_Open','ActionsOnOpen',
    'openWhenPlayerEnters', 'UniqueActorBeginOverlap',
    'Objects', # used by TriggerVolume_C in SL/SLC
}


# Unreal mostly uses PascalCase / UpperCamelCase for its naming. This function converts a string of this form
# to snake case ie all lower case with underscores. It has special handling for flags converting 'bMyVar' to
# 'is_my_var' and 'MyVar?' to 'my_var_flag'
def camel_to_snake(s):
    if s[-1]=='?': s = s[:-1] + 'Flag'
    if s.startswith('b'): s = 'Is' + s[1:]
    s = s.replace(' ','')
    return ''.join(['_'+c.lower() if c.isupper() else c for c in s]).lstrip('_')

# Returns list of numbers in the specified string (ie "a1b98" return ["1", "98"])
get_ints = lambda s:[''.join(group) for key, group in groupby(s, lambda e:e.isdigit()) if key]

# Returns last number in the specified string or empty string if it isn't one
# Note: we could do this more simply with a regexp but it seems inefficient
# get_last_int = lamda s: m.group() if (m := re.search('\d+$', s)) else ''
get_last_int = lambda s: get_ints(s)[-1] if s and s[-1].isdigit() else ''  


# isenum / isenum_unreal
# enum.to_source_attr(s) "EnumType::NewEnumeratorNN" -> "EnumType::SourceAttrName"
# Comparison "EnumType::SourceAttrName" == "EnumType::NewEnumeratorNN" / "EnumType::SourceAttrName"
# helper: get_enumtype
# helper: find filenames


    # values = { 'EnumType::NewEnumeratorNN': 'EnumType::SourceAttrValue' }
    # convert():
    #    isenum_unreal() then lookup
    # comparison
    #    do they match, convert and try again

# Return True if this string looks like some kind of enumeration
def isenum(s):
    return (isinstance(s, str)
        and '::' in s 
        and set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:0123456789"))

# Return True if this string looks like an Unreal renamed enumeration
def isueenum(s):
    return (isinstance(s, str)
        and '::NewEnumerator' in s 
        and set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:0123456789"))

class UEEnums:
    def __init__(self):
        self.map = {}
        self.types = set()

    def loadenumbp(self, filename):
        # Read the file as a JSON
        j = json.load(open(filename, 'r'))

        # Check that it is formatted as we expect
        if (   not isinstance(j, list) or not j             # We have a non empty list
            or not isinstance(j[0], dict)                   # containing a dictionary
            or not j[0].get('Type') == 'UserDefinedEnum'    # of the right type
            or not (name := j[0].get('Name'))               # which has Name
            or not (p := j[0].get('Properties'))            #           Properties
            or not (emap := p.get('DisplayNameMap'))        #           DisplayNameMap
            or not emap):                                   # which is non empty
            print(f"Warning: {filename} does not meet expectations for an Unreal enumeration")
            return None

        #name = j[0].get('Name')
        #emap = j[0]['Properties']['DisplayNameMap']

        for i, e in enumerate(emap):
            k, v = e['Key'], e['Value']
            if k != f'NewEnumerator{i}' or not (s := v.get('SourceString')):
                print(f"Warning: in {filename} key is '{k}' when expecting 'NewEnumerator{i}'")
                return False
            self.map[name+'::'+k] = name+'::'+s

        self.types.add(name)

    # If s is an enumeration name we're aware of convert it to the source form
    def ue2source(self, s):
        return self.map.get(s, s)

    # Returns true if the two enum strings match. First may be a UE renamed enum
    # or a source enum, second should be an untranslated source name
    def match(self, ue, s):
        return (ue == s or self.ue2source(ue) == s)

    # If first argument is a UE enum then add it
    def addueattr(self, ue, s=None):
        if isueenum(ue):
            self.map[ue] = s or ue
            self.types.add(ue.split("::").pop())



# Walk through the map and generate a list of types we're interested in
def get_bp_file_list():
# We want a way to convert enums of the form "ELaunchMode::NewEnumerator1" or an index to the friendly name




def export_levels(game, cache_dir):
    path = os.environ.get(game+'dir',config[game]['path'])
    prefix = config[game]['prefix']
    logging.getLogger("UE4Parse").setLevel(logging.INFO)
    aeskeys = { FGuid(0,0,0,0): FAESKey('0x'+'0'*64), }
    gc.disable()
    provider = DefaultFileProvider(path, VersionContainer(EUEVersion.GAME_UE4_27))
    provider.initialize()
    provider.submit_keys(aeskeys)
    provider.load_localization("en")
    gc.enable()
    for asset_name in config[game]['maps']:
        filename = os.path.join(cache_dir, asset_name) + '.json'
        if os.path.exists(filename):
            print(filename, 'exists')
            continue
        package_path = prefix + asset_name
        package = provider.try_load_package(package_path)
        if package is not None:
            package_dict = package.get_dict()
            print('writing "%s" ...' % filename)
            json.dump(package_dict, open(filename, 'w'), indent=2)


def export_class_loc(cache_dir):

    game_classes = read_game_classes();

    for game in ['sl', 'siu']:
        path = os.path.join(cache_dir, 'blueprints.'+game+'.json')
        blueprints = json.load(open(path, 'r'))

        def optKey(l, cls, k, v):
            if v:
                if cls not in l:
                    l[cls] = {}
                if k not in l[cls]:
                    l[cls][k] = v

        for cls, bps in blueprints.items():
            if cls in game_classes:
                for bp in bps:
                    t = bp.get("Type"); 
                    if (t == 'TextRenderComponent' or t == cls) and bp.get('Properties'):
                        props = bp['Properties']
                        for gcls in game_classes:
                            if cls in gcls:
                                if props.get('Text'):
                #                    optKey(game_classes, gcls, 'Invariant',       props['Text'].get('CultureInvariantString'))
                                    optKey(game_classes, gcls, 'friendly',        props['Text'].get('SourceString'))
                                    optKey(game_classes, gcls, 'friendly_key',    props['Text'].get('Key'))
                                if props.get('UpgradeName'):
                                    optKey(game_classes, gcls, 'friendly',        props['UpgradeName'].get('SourceString'))
                                    optKey(game_classes, gcls, 'friendly_key',    props['UpgradeName'].get('Key'))
                                if props.get('UpgradeDescription'):
                                    optKey(game_classes, gcls, 'description',     props['UpgradeDescription'].get('SourceString'))
                                    optKey(game_classes, gcls, 'description_key', props['UpgradeDescription'].get('Key'))

    with open("gameClasses.json", 'w') as f:
        print("Writing loc data to gameClasses.json...")
        json.dump(game_classes, f, indent = 2)

def export_loc_files(cache_dir):

    # Merge custom-loc.json into gameClasses.json
    print('Merging custom-loc.json into gameClasses.json...')
    classes = json.load(open('../data/gameClasses.json', 'r', encoding='utf-8'))
    customLoc = json.load(open('../data/custom-loc.json', 'r', encoding='utf-8'))
    for c, d in customLoc.items():
        classes[c] = classes[c] | d
    json.dump(classes, open('gameClasses.json', 'w', encoding='utf-8'), indent = 2)
    
    # Make a list of the keys that are referenced in the various files
    keys = set()
    key_files = ['gameClasses.json', 'layerConfigs.json', 'custom-loc.json',
        'markers.sl.json', 'markers.slc.json', 'markers.siu.json',
        'custom-markers.sl.json', 'custom-markers.slc.json', 'custom-markers.siu.json',
    ]
    print('Reading files to determine loc keys required...')
    for fn in key_files:
        path = '../data/'+fn
        if os.path.exists(path):
            data = json.load(open(path, 'r'));
            for entry in data if type(data) is list else data.values():
                for k in ['friendly_key', 'name_key', 'description_key', 'key']:
                    if entry.get(k):
                        keys.add(entry[k])

    print(f'Found {len(keys)} keys')

    loc_names = ['en', 'de', 'es', 'fi', 'fr', 'hu', 'it-IT', 'ja', 'ko', 'pl', 'pt-PT', 'ru', 'sr', 'tr', 'zh-Hans', 'zh-Hant'] 
    print('Writing loc files to data directory')
    for loc in loc_names:
        newlocstr = {}
        for game in ['sl', 'siu']:
            fn = os.path.join(cache_dir, f'LOC/{game}/{loc}/Game.json')
            locstr = json.load(open(fn, 'r', encoding='utf-8'))
            for k in locstr.keys():
                if k in keys:
                    #if newlocstr.get(k) and newlocstr[k] != locstr[k]:
                    #    print(f'SL  {newlocstr[k]}')
                    #    print(f'SIU {locstr[k]}')
                    newlocstr[k] = locstr[k]
        print(f'Writing to ../data/loc/locstr-{loc}.json')
        json.dump(newlocstr, open(f'../data/loc/locstr-{loc}.json', 'w', encoding='utf-8'), indent = 2)


def export_sw_markers(game, cache_dir, marker_types=marker_types, marker_names=[]):
    maps = {}       # dictionary from map name to json data list
    objects = {}    # dictionary from map name to dictionary of outer.name to object
                    # key is {type}'{area}:{outer}.{name}
    area_mtx = {}   # Transform for each area map geometry
    pipes = {}      # Mapping from pipe to targets

    optEnum= lambda s:int(s[len(s.rstrip('0123456789')):]or 0) if type(s) is str and '::' in s else s
    optArea= lambda a,k,v: v if a==k else ':'.join((k,v))
    optColor=lambda p:p and '#'+''.join(hex(int(p[c]))[2:] for c in 'RGB')
    optKey = lambda d,k,v: v is not None and d.__setitem__(k,optEnum(v))
    getVec = lambda d,v=0: Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v,v,v))
    getRot = lambda d,v=0: Euler(( radians(d['Roll']), radians(d['Pitch']), radians(d['Yaw'])) ) if d else Euler((v,v,v))
    getQuat= lambda d,v=0: Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v,v,v,v))
    getXYZ = lambda v:{'x':v.x, 'y': v.y, 'z': v.z}


    # The Map JSON read in has referenced between objects and their components, either
    # ObjectName/ObjectPath in in the same map file or AssetPathName/SubPathString if
    # in a separate map file. This function comes up with the object.
    # RootComponent":
    #    "ObjectName": "SceneComponent'Map:PersistentLevel.PipesystemNew10.DefaultSceneRoot'", type'area:*.*.outer.name'}
    #    "ObjectPath": "Supraland/Content/FirstPersonBP/Maps/Map.28893" /area.index
    # Pickup Class
    #    "ObjectName": "BlueprintGeneratedClass'Pickup_SolversGuidePage_C'",    -> 'class$
    #    "ObjectPath": "/Supraworld/Levelobjects/Collectible/Pickup_SolversGuidePage.0" not a map object just a class
    # RequiredAbilities (array)
    #    "AssetPathName": "/Supraworld/Abilities/Dash/Inventory_Dash.Inventory_Dash_C",
    #    "SubPathString": ""
    # InventoryItem
    #    "AssetPathName": "/Supraworld/Abilities/ThoughtReading/Inventory_ThoughtReading.Inventory_ThoughtReading_C",
    #    "SubPathString": ""
    # CustomShopItem
    #    "AssetPathName": "/Supraworld/Systems/Shop/ShopItems/ShopItemAbility_MindReading.ShopItemAbility_MindReading_C",
    #    "SubPathString": ""  <- It's not a map obect, so basically just extract the class ie .class$
    # otherPipeInOtherLevel: {
    #    "AssetPathName": "/Game/FirstPersonBP/Maps/DLC2_Area0_Below.DLC2_Area0_Below", -> /area.area$
    #    "SubPathString": "PersistentLevel.PipesystemNew_IntoSewer" -> Outer.Name$

    # Expects a dictionary containing SubPathString and AssetPathName or containing
    # ObjectName and ObjectPath. If we have an object loaded from JSON corresponding
    # to the reference object then it is returned, otherwise a string containing
    # it's class or the name of the object. if type(getObject(p) is dict: can be
    # used to check which has been returned.
    def getObject(p):
        if (sps := p.get('SubPathString')) is None:
            if (op := p.get('ObjectPath')) is None:
                return ""
            if '/Maps/' in op:
                area = op.split("/Maps/")[1].split('/')[0].split(".")[0]
                index = int(op.split(".").pop())
                if area in maps:
                    object = maps[area][int(index)]
                else:
                    object = op.split("/").pop().split('.')[0]
            else:
                on = p.get('ObjectName')
                object = on.split("'")[1]   # Just extract class
        else:
            apn = p.get('AssetPathName', '').split('.').pop() 
            # If the SubPathString is empty then just return the last bit of the asset path name (normally type)
            if sps == '':
                object = apn
            elif not (object := objects.get(apn, {}).get(sps)):
                # elif not (areaobjects := objects.get(apn)) or not (object := areaobjects.get(sps)):
                # See if we have referenced object in our look up table, if not return string
                object = apn + '.' + sps.split('.').pop()   # We could remove pop to include Outer

        return object
    
    # Phase 1: Read all the map json files in and build a look up table for references
    # Also get any area/map file matrices 
    for area in config[game]['maps']:
        path = os.path.join(cache_dir, area + '.json')
        print('loading "%s" ...' % path)

        # Store the map data
        maps[area] = json.load(open(path, encoding="utf-8-sig"))

        # Go through all objects in the map data and store lookups for later
        objects[area] = {}
        for o in maps[area]:
            # Store a unique reference to this object for later access
            outer = o.get('Outer', '')
            objects[area]['.'.join((outer, o['Name']))] = o

            # Get reference to properties (or empty if this object doesn't have any)
            p = o.get('Properties', {})

            # For maps that are divided into multiple files, there may be a LevelTransform for entities in that
            # file relative to the persistent world that is handled by the streaming system. To correct for this
            # we construct a matrix from the Translation/Rotation members if they exit
            if (a := p.get('WorldAsset',{}).get('AssetPathName')) and (t := p.get('LevelTransform')):
                area_mtx[a.split('.').pop()] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

    # "ActorLabel": "PickupSpawner" -> PickupSpawnerSolversGuide0?


    # Phase 2: Go through all the objects which have types we're interested in
    # and
    types = set()
    props = set()
    properties = set()
    enumprops = set()
    enumvalues = set()
    def isenum(s):
        return (isinstance(s,str) and "::" in s and set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:0123456789"))

    for area in maps:
        for o in maps[area]:

                def checkitems(d):
                    for k,v in d.items():
                        if isinstance(v, (list,dict, tuple)):
                            checkitems(v)
                        elif isinstance(v, str):
                            if "::" in v:
                                enum, member = v.split("::")
                                idx = member.



            for k in o.keys():
                props.add(k+":"+(o[k].split('::').pop() if isenum(o[k]) else type(o[k]).__name__))
                if type(s := o[k]) is str:
                    if isenum(s):
                        ek, ev = s.split("::")
                        enumprops.add(k+"="+ek)
                        enumvalues.add(ek+"::"+ev)

            if (p := o.get('Properties')):
                for k in p.keys():
                    properties.add(k+":"+(p[k].split('::').pop() if isenum(p[k]) else type(p[k]).__name__))
                    if type(s := p[k]) is str:
                        if isenum(s):
                            ek, ev = s.split("::")
                            enumprops.add(k+"="+ek)
                            enumvalues.add(ek+"::"+ev)

            # We're only interested in objects with a world position and custom class
            if not o['Type'].endswith("_C") or not (p := o.get('Properties')) or not (r := p.get('RootComponent')):
                continue

            # Remember all the custom classes we find
            types.add(o['Type'])

            # We're currently only interested in these classes
            if o['Type'] != "PresentBox_C":
                continue

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties',{})

                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1)) @ matrix

                for parent in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    node = p.get(parent, {})
                    if type(node) is dict:
                        obj = getObject(node)
                        if type(obj) is dict:
                            return get_matrix(obj, matrix);
                return matrix

            matrix = get_matrix(o)
            if area in area_mtx:
                matrix  = area_mtx[area] @ matrix

            print(f"n: {o['Name']} m: {matrix}")

    json_file = game + '.types.json'
    print('writing "%s" ...' % json_file)
    json.dump(sorted(types), open(json_file,'w'), indent=2)

    json_file = game + '.props.json'
    print('writing "%s" ...' % json_file)
    json.dump(sorted(props), open(json_file,'w'), indent=2)

    json_file = game + '.properties.json'
    print('writing "%s" ...' % json_file)
    json.dump(sorted(properties), open(json_file,'w'), indent=2)

    json_file = game + '.enums.json'
    print('writing "%s" ...' % json_file)
    f = open(json_file,'w')
    json.dump(sorted(enumprops), f, indent=2)
    json.dump(sorted(enumvalues), f, indent=2)
    f.close()

    print("Done")

'''
-1237.642333984375 -7274.92333984375 871.6895141601562
    Object
      Properties
        WorldAsset
          AssetPathName
        LevelTransform
    let outer = o.Outer + '.' + o.Name;
    outers[outer] = o;
    if ((p = o.Properties) && (a = p.WorldAsset) && (n = a.AssetPathName) && (t = p.LevelTransform)) {
      let key = n.split('.').pop();
      let m = new THREE.Matrix4().compose(getVec(t.Translation, 0), getQuat(t.Rotation), new THREE.Vector3(1,1,1));
      areas[key] = m
    }
    if (o.Type=='StaticMeshComponent') meshes[o.Outer] = o;
    if (o.Type=='MessengerComponent') messengers[o.Outer] = o;
    if (o.Type=='SupraworldLaunchComponent_C') targets[o.Outer] = o;

    components[o.Outer] = components[o.Outer] || {};
    components[o.Outer][o.Name] = o;

    ObjectName: {type}'{area}:PersistentLevel.{name}[.{subname}[.{sub}[...]]]
    {type} is the "Type" of the target object
    {area} is the json map file containing the target object (seems to always match file name)
    {name} is the base name of this object (which contains all the components properties)
    {subname} is the base name of the object it points at

    Target object will be in {area}.json:
    "Type": "{type}",
    "Name": "{subname}",
    "Outer": "{name}",

    



      "Area": {
        "TagName": "Supraworld.Area.StartTown"
      },
      "ProgressionGroup": {
        "TagName": "Supraworld.Story.Act1"
      },
            "Color": "ESupraColors::Green",
      "RibbonColor": "ESupraColors::Orange",
      "ProgressionGroup": {
        "TagName": "Supraworld.Story.Act1"
      },
            "Coins": 3,
MoveOneWay
SupraworldLaunch
TargetLocation
      "RelativeLocation": {
        "X": 11140.349,
        "Y": 15022.57,
        "Z": 6897.67
      },

      "otherPipeInOtherLevel": {
        "AssetPathName": "/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete",
        "SubPathString": "PersistentLevel.PipesystemNewDLC_BathToSecretLavaAreaToBath1"
        PipesystemNewDLC_C
        DLC2_Complete


'''



    
def export_markers(game, cache_dir, marker_types=marker_types, marker_names=[]):
    data = []
    data_lookup = {}
    classes_found = set()
    areas = {}
    
    markerFileName = f"{game}.marker_names.txt"
    if os.path.isfile(markerFileName):
        with open(markerFileName) as fh:
            marker_names += fh.read().splitlines()

    optEnum= lambda s:int(s[len(s.rstrip('0123456789')):]or 0) if type(s) is str and '::' in s else s
    optArea= lambda a,k,v: v if a==k else ':'.join((k,v))
    optColor=lambda p:p and '#'+''.join(hex(int(p[c]))[2:] for c in 'RGB')
    optKey = lambda d,k,v: v is not None and d.__setitem__(k,optEnum(v))
    getVec = lambda d,v=0: Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v,v,v))
    getRot = lambda d,v=0: Euler(( radians(d['Roll']), radians(d['Pitch']), radians(d['Yaw'])) ) if d else Euler((v,v,v))
    getQuat= lambda d,v=0: Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v,v,v,v))
    getXYZ = lambda v:{'x':v.x, 'y': v.y, 'z': v.z}



    def parse_json(j, area):
        outer = {}
        pipes = {}
        objects = {}
        for o in j:
            p = o.get('Properties',{})
            if a := p.get('WorldAsset',{}).get('AssetPathName'):
                if t := p.get('LevelTransform'):
                    areas[a.split('.').pop()] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

            if 'Outer' in o:
                outer[':'.join((o['Name'],o['Type'],o['Outer']))] = o # pyUE4Parse 5e0e6f0
                outer[':'.join((o['Name'],o['Outer']))] = o # pyUE4Parse 90e309b

            if o['Type'].startswith('Pipesystem') and 'Pipe' in p and ('OtherPipe' in p or 'otherPipeInOtherLevel' in p):
                # p['Pipe']
                #        "ObjectName": "StaticMeshComponent'Map:PersistentLevel.PipesystemNew10.Pipe'",
                # p['OtherPipe']
                #        "ObjectName": "PipesystemNewDLC_C'DLC2_Complete:PersistentLevel.PipesystemNewDLC10'",
                # p['otherPipeInOtherLevel']
                #        "AssetPathName": "/Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete",
                #        "SubPathString": "PersistentLevel.PipeToArea1"
                # {ComponentType/class}'{map}'
                def getPipeObjectName(o):
                    t = o['ObjectName'].split('.')
                    r = t[-2] if t[-1]=="Pipe'" else t[-1]
                    return r.replace("'", "")

                a = ':'.join((area, getPipeObjectName(p['Pipe'])))
                if (t:=p.get('otherPipeInOtherLevel')):
                    b = ':'.join((t['AssetPathName'].split('.').pop(), t['SubPathString'].split('.').pop()))
                else:
                    b = ':'.join((area, getPipeObjectName(p['OtherPipe'])))
                pipes[a] = b
                print(f"{a} -> {b}")
                #pipes [b] = a # links may be single-sided

            objects[area +':'+o['Name']] = o

        for o in j:
            allowed_items = (
                marker_names and o['Name'] in marker_names
                or marker_types and o['Type'] in marker_types
                or any(o['Type'].startswith(s) for s in starts_with)
                or any(o['Type'].endswith(s) for s in ends_with)
            )

            if not allowed_items: continue
            #if not o['Type'].endswith('_C'): continue
            #if not 'Pipe' in o['Type']: continue

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties',{})
                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1)) @ matrix
                for parent in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    node = p.get(parent,{})
                    if type(node) is dict:
                        if ref := node.get('OuterIndex',{}).get('ObjectName'):
                            key = ':'.join((node.get('ObjectName',''),ref))
                            if key in outer:
                                return get_matrix(outer[key], matrix)
                return matrix

            matrix = get_matrix(o)
            if area in areas:
                matrix  = areas[area] @ matrix

            # some MetalBall_C are Anvils, do the replacement
            if o['Type']=='MetalBall_C' and o.get('Properties',{}).get('Mesh?',{}).get('ObjectName')=='Anvil':
                o['Type'] = 'Anvil_C';

            # some RingRusty_C are pickaxes, cannot be determined by meshes
            if game=='sl' and o['Name'].startswith('RingRusty'):
                for i in range(10,16+1):
                    if o['Name']=='RingRusty'+str(i):
                        o['Type'] = '_Pickaxe_C'; # special type, an item

            data.append({'name':o['Name'], 'type':o['Type'], 'area':area })
            classes_found.add(o['Type'])
            data_lookup[':'.join((area, o['Name'])  )] = data[-1]

            t = matrix.to_translation()
            data[-1].update({'lat': t.y, 'lng': t.x, 'alt': t.z})

            p = o.get('Properties',{})

            for key in properties:
                optKey(data[-1], camel_to_snake(key), p.get(key))

            optKey(data[-1], 'spawns', p.get('Spawnthing',{}).get('ObjectName'))
            optKey(data[-1], 'spawns', p.get('Class',{}).get('ObjectName'))
            optKey(data[-1], 'other_pipe', pipes.get(':'.join((area,o['Name']))))
            optKey(data[-1], 'custom_color', optColor(p.get('CustomColor')))

            actors = []
            def get_actors(o,level=0):
                for action in actions:
                    if a := o.get('Properties',{}).get(action):
                        for d in [a] if type(a) is dict else a if type(a) is list else []:
                            for b in ([d[x] for x in d.keys()] if action=='ActionsOnOpen' else [d]):
                                if type(b) is dict and 'OuterIndex' in b and 'ObjectName' in b:
                                    key = ':'.join((k:= b['OuterIndex']['Outer'],v:= b['ObjectName']))
                                    actors.append(optArea(area, k, v))
                                    if key in objects and level<6:
                                        get_actors(objects[key], level+1)

            get_actors(o)

            # investigate Relay_C links, namely FinalBossQuest_4
            if o.get('Properties',{}).get('PropogateToRelaysInOtherMaps'):
                b = ':'.join((t['AssetPathName'].split('.').pop(),t['SubPathString'].split('.').pop()))
                actors.append(b)
                get_actors(objects[b])

            # looks like we hit a wall here, UniqueActorBeginOverlap of BP_TriggerVolume_C is empty in UE4Parse
            # but has an invocation list in FModel. Related issue https://github.com/MinshuG/pyUE4Parse/issues/22
            optKey(data[-1], 'actors', actors or None)


            if o['Type'] in ('Jumppad_C'):
                optKey(data[-1], 'velocity', (v:=p.get('Velocity'))and getXYZ(getVec(v)))
                d = Vector((matrix[0][2],matrix[1][2],matrix[2][2]));
                d.normalize()
                data[-1].update({'direction': getXYZ(d)})
                data[-1].update({'target': getXYZ(Vector((0,0,0)))})

    for area in config[game]['maps']:
        path = os.path.join(cache_dir, area + '.json')
        print('loading "%s" ...' % path)
        f = open(path, encoding="utf-8-sig")
        parse_json(json.load(f), area)

    calc_pads(data)
    calc_pipes(data)

    # Merge in custom and legacy data, clean the properties and remove ones we don't need
    cleanup_objects(game, classes_found, data_lookup, data)

    print('collected %d markers' % (len(data)))
    json_file = 'markers.' + game + '.json'
    print('writing "%s" ...' % json_file)
    json.dump(data, open(json_file,'w'), indent=2)

def calc_pipes(data):
    # I could not find hierarchy connection between pipe caps and pipe systems
    # so I decided to search for the nearest pipe cap
    # It should work fine most of the time
    allowed_points = lambda o: o['type'] in ('PipeCap_C')
    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    data_indices = [i for i,o in enumerate(data) if allowed_points(o)]
    print('collected', len(points), 'pipe caps, calculating links...')

    if not points:
        return

    tree = KDTree(points)

    pipes = {}
    lookup = {}
    cap_indices = {}

    # update pipe system, find nearest caps
    for i,o in enumerate(data):
        if not o['type'].startswith('Pipesystem'):
            continue
        x,y,z = o['lng'],o['lat'],o['alt']

        query_point = [x,y,z]
        _, indices = tree.query([query_point], k=3)
        indices = indices[0]
        j = data_indices[indices[0]]
        p = data[j]
        dist = (Vector((x,y,z))-Vector((p['lng'], p['lat'], p['alt']))).length
        if dist<=1500:
            nearest_cap = p['area'] + ':' + p['name']
            cap_indices[nearest_cap] = j
            data[i].update({'nearest_cap':nearest_cap})
            a = o['area'] + ':' + o['name']
            lookup[a] = o

    ''' just add nearest cap for now ^. handle the rest in frontend
    # update caps with cross-references
    # not all pipes have caps, unfortunately
    # some only have level geometry that's not in the classes
    for i,o in enumerate(data):
        if o['type'] not in ('PipesystemNew_C','PipesystemNewDLC_C'):
            continue
        # get nearest cap, get other pipe, update other pipe's cap
        if 'nearest_cap' in o and 'other_pipe' in o:
            if nearest_cap := o.get('nearest_cap'):
                if other_pipe := o.get('other_pipe'):
                    if p:=lookup.get(other_pipe):
                        if other_cap := p.get('nearest_cap'):
                            if j := cap_indices.get(nearest_cap):
                                data[j].update({'other_cap': other_cap})
    '''

def calc_pads(data):
    # calculates target altitude from the jump pad's velocity data
    # builds 3d terrain from selected points (uses jump pad locations by default)
    # traces parabolic path and find z of an intersection with a plane defined by 3 closest points

    #allowed_points = lambda o: True # not recommended, bugs with coins, etc.
    allowed_points = lambda o: o['type'] not in ('Coin_C', 'BP_TriggerVolume_C', 'Button_C', 'Door_C', 'Chest_C') # testing
    #allowed_points = lambda o: o['type'] in ('Jumppad_C') # jump pads only

    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    data_indices = [i for i,o in enumerate(data) if allowed_points(o)]

    print('collected', len(points), 'terrain points, calculating targets...')

    if not points:
        return

    tree = KDTree(points)
    jumppads = []
    matches = {};

    for i,o in enumerate(data):
        if o['type'] != 'Jumppad_C':
            continue
        jumppads.append(o)
        matches[':'.join((o['area'], o['name']))] = {'obj': o, 'targets': []}

        x,y,z = o['lng'],o['lat'],o['alt']
        k = o.get('relative_velocity', 1000)
        v = o.get('direction',{'x':0,'y':0,'z':0})

        vx = -v['x'] * k
        vy = -v['y'] * k
        vz =  v['z'] * k

        if (v:=o.get('velocity')) and o.get('allow_stomp'):
            vx = v['x']
            vy = v['y']
            vz = v['z']

        dt = 0.01
        g = 9.8
        m = 95
        h = 0
        t = 0
        last_z = z
        s = Vector((x,y,z))
        while t<20:
          vz -= g * m * dt
          x += vx * dt
          y += vy * dt
          z += vz * dt
          t += dt

          query_point = [x,y,z]
          _, indices = tree.query([query_point], k=3)
          indices = indices[0]
          triangle = [points[j] for j in indices]
          h = get_z(x,y,triangle)

          dist = (Vector((x,y,z))-s).length

          #print([round(v,2) for v in [x,y,z]], 'h', round(h,2), 'nearest triangle', [ data[data_indices[j]]['name']+':'+str([round(x,2)for x in points[j]]) for j in indices])
          if dist>250 and last_z>z and h>z: # only check on decline
            break

          last_z = z

        #print('pad', o['name'], 'velocity', vx,vy,vz, 'target', x,y,z)
        data[i].update({'target':{'x':x, 'y':y, 'z': z}})

    # Now we try to find pairs of jumppads. For each jump pad, find all the other jumppads close to the target
    # If two jumppads are both in each other's lists then we can consider merging

    def getdir(o):
        v = o.get('direction',{'x':0,'y':0,'z':0})
        vx = -v['x']
        vy = -v['y']
        vz =  v['z']

        if (v:=o.get('velocity')) and o.get('allow_stomp'):
            vx = v['x']
            vy = v['y']
            vz = v['z']
        return Vector((vx, vy, vz)).normalized()

    for o in jumppads:
        if abs(getdir(o).z) > 0.99: continue

        ov = Vector((o['lng'], o['lat'], 0));
        otv = Vector((o['target']['x'], o['target']['y'], 0));
        do = (otv - ov).normalized()

        tdist = (otv - ov).length    # Distance between object and its target

        for tj in jumppads:
            if tj is o: continue 
            if abs(getdir(tj).z) > 0.99: continue

            jv = Vector((tj['lng'], tj['lat'], 0))
            jtv = Vector((tj['target']['x'], tj['target']['y'], 0));
            dt = (jtv - jv).normalized()

            no2j = (jv - ov).normalized();
            dist = (otv - jv).length;            # distance between target and prospective match

            # Distance threshold is compared to the distance between the pads
            # Check that the pads are pointing in opposite directions
            # And that the pads are facing each other (rather than opposite directions)
            if dist < 0.3 * tdist and do.dot(dt) < -0.98 and no2j.dot(do) > 0.97 and no2j.dot(dt) < -0.97:
                #print(o['name'], tj['name'], do.dot(dt), no2j.dot(do), no2j.dot(-dt), round(dist/tdist,2))
                alt = ':'.join((o['area'], o['name']))
                matches[alt]['targets'].append(tj)

    plist = {}
    for m in matches.values():
        o = m['obj']
        for t in m['targets']:
            if t is o:
                continue
            alt = ':'.join((t['area'], t['name']))
            for tt in matches[alt]['targets']:
                if tt is o:
                    if not plist.get(o['name']) and not plist.get(t['name']):
                        plist[o['name']] = t['name']
                        o['target']['x'] = t['lng']
                        o['target']['y'] = t['lat']
                        o['target']['z'] = t['alt']
                        o['other_pad']=alt
                        o['twoway']=1
                        t['target']['x'] = o['lng']
                        t['target']['y'] = o['lat']
                        t['target']['z'] = o['alt']
                        t['twoway']=2
                        t['other_pad']=':'.join((o['area'], o['name']))


def get_z(x, y, triangle):
    v1, v2, v3 = triangle
    denominator = ((v2[1] - v3[1]) * (v1[0] - v3[0]) + (v3[0] - v2[0]) * (v1[1] - v3[1]))
    if denominator == 0:
        return v1[2]
    alpha = ((v2[1] - v3[1]) * (x - v3[0]) + (v3[0] - v2[0]) * (y - v3[1])) / denominator
    beta = ((v3[1] - v1[1]) * (x - v3[0]) + (v1[0] - v3[0]) * (y - v3[1])) / denominator
    gamma = 1 - alpha - beta
    if alpha >= 0 and beta >= 0 and gamma >= 0:
        z = alpha * v1[2] + beta * v2[2] + gamma * v3[2]
    else:
        alpha = max(0, min(1, alpha))
        beta = max(0, min(1, beta))
        gamma = 1 - alpha - beta
        z = alpha * v1[2] + beta * v2[2] + gamma * v3[2]
    return z


# Variant names for the colours of keys, keycards, flowers, seeds...
colors = {
    0: 'white',         #FFFFFF
    1: 'yellow',        #FFFF66
    2: 'red',           #FF0000
    3: 'blue',          #1E90FF
    4: 'purple',        #9933ff
    5: 'green',         #4DFF00
    6: 'orange',        #ff9900
}

# Variant names for minecraft bricks
brick_types = {
    0: 'stone',
    1: 'obsidian',
    2: 'metal',
    3: 'diamond',
    4: 'gold',
};

# Number of coins given by classes if not explicit
# Coin pots provide 1 if the flag is true
coin_defaults = {
    'Coin_C': 1,
    'CoinBig_C' : 10,
    'LotsOfCoins1_C': 1,
    'LotsOfCoins5_C': 5,
    'LotsOfCoins10_C': 10,
    'LotsOfCoins15_C': 15,
    'LotsOfCoins30_C': 30,
    'LotsOfCoins50_C': 50,
    'LotsofCoins200_C': 200,    # Note lower case 'of'
    'PhysicalCoin_C': 1,
}

# Which properties we allow to be exported for each instance
exported_properties = [
    'name', 'type', 'area', 'lat', 'lng', 'alt',    # all instances have these
    'spawns',                                       # generates some other class (chest or quest)
    'coins',                                        # generates coins when taken (coin chest, pots, bricks and various coin types)
    'cost', 'price_type',                           # cost when purchased (shops, quests...) and units (defaults to coins)
    'icon',                                         # explicit icon override
    'variant',                                      # variant allows change of marker
    'friendly',                                     # Friendly name for the marker
    'other_pipe',                                   # For pipes we store the pipe at the other end
    'nearest_cap',                                  # Nearest pipecap we are connected to if there is one
    'other_pad',                                    # For two way pads we store the pad at the other end
    'linetype',                                     # Trigger, pad, pipe, target
    'twoway',                                       # Pipe or pad is two way if True
    'notsaved',                                     # Pipe or pad is not saved
    'target',                                       # where to draw line to for pipes and pads
    'targets',                                      # array of dictionaries 'type' and target position
    'old_coins',                                    # For _CoinStack_C's a dictionary of old coin name to value (for save game handling)
    'scrapamount',                                  # For Scrap_C gives amount of scrap 
    #'image',
    'yt_video', 'yt_start', 'yt_end',      # data pulled from matched legacy data
]

# The purpose of this code is to walk through all the objects we've gathered and prepare them for
# display by the map.
#
# classes is a set of all 'type' names
# lookup is a dictionary from area:name to objects
# data is an array of the same objects
# each object is a dictionary of k,v pairs
def cleanup_objects(game, classes_found, data_lookup, data):

    # Read the set of pads and pipes we found save data for
    savedpadpipes = read_savedpadpipes(game)

    classes = read_game_classes()

    # Make a set of all the classes found that are not in gameClasses.js
    # Write out a file for optional insertion into gameClasses.js
    classes_to_filter = []
    if stripUnusedClasses:
        classes_to_filter = [ k for k in classes_found if k not in classes or classes[k]['layer'] == 'extra'
                             or not classes[k]['layer'] and not classes[k]['nospoiler'] ]
        print(f'Writing {len(classes_to_filter)} gameClasses to "filtered_classes.js"')
        with open('filtered_classes.js', 'w') as fh:
            for c in sorted(classes_to_filter):
                fh.write("    '{:<36}: new GameClass(),\n".format(c))

    # Walk the remaining instances and fix up entries
    for o in data:
        if not o.get('type'):
           print(f'{o}')

        alt = ':'.join((o['area'], o['name']))

        # Merge the various gold properties into one (we'll remove the properties later)
        # and deal with defaults for all coin or coin spawning classes
        # also takes care of DestroyablePots_C
        coins = o.get('coins') or o.get('coins_in_gold') or o.get('value') or (1 if o.get('contains_coin') else None)
        if coins is not None:
            o['coins'] = coins
        else:
            if o['type'] in coin_defaults:
                o['coins'] = coin_defaults[o['type']]
            elif o.get('spawns') in coin_defaults:
                o['coins'] = coin_defaults[o['spawns']]

        # There is at least one chest that doesn't have spawn data but actually spawns Health+1 (SL Chest31_9005)
        if o['type'] == 'Chest_C' and o.get('spawns') is None:
            o['spawns'] = 'BP_PurchaseHealth+1_C'

        # If this is the stolen coins chest then set coins to 'some' it will remove the spawns property later
        if o.get('spawns') == 'StolenCoins_C':
            o['coins'] = 'varies'

        # Minecraft bricks may contain coins, but if they are not specified gold ones default to 3 
        # variant is set to the brick type
        if o['type'] == 'MinecraftBrick_C':
            if game == 'siu':
                o['variant'] = brick_types[o.get('brick_type') or (4 if o.get('coins') else 0)]
                if o['variant'] == 'gold' and not o.get('coins'):
                    o['coins'] = 3
                if o.get('coins') is not None and o['variant'] != 'gold':
                    print(f'Non gold coin containing MinecraftBrick_C:{o["variant"]}:{o["coins"]}')

        # Player icon changes colour based on game
        if o['type'] == 'PlayerStart':
            o['variant'] = 'blue' if game == 'siu' else 'red'

        # Deal with Waldo's in SLC
        if o['type'] == 'RedGuy_C' and o['name'].startswith('Waldo'):
            o['type'] = 'Waldo:'+o['type']  

        # Allow things with colors can have variants (minecraft bricks have type and colour)
        if o.get('variant') is None:
            color = o.get('color') or o.get('original_color')
            if color and type(color) is int and color >= 0 and color < len(colors):
                o['variant'] = colors[color]

        # Anything that has coins gets a subclass (chests, minecraft bricks, destroyable pots...)
        # Anything that provides coins and spawns we clear the spawns field (chests can't do both)
        # There's also a chest that has coins in it but also has a "spawns" (SIU ChestAreaEnd_78)
        if o.get('coins') is not None:
            if o['type'] not in coin_defaults:  # don't add subclass to coins
                o['type'] = 'Coin:'+o['type']
            if o.get('spawns') is not None:
                del o['spawns']

        # Create line data
        get_xyz = lambda o: { 'x':o['lng'], 'y':o['lat'], 'z':o['alt'] }
        get_nc_xyz = lambda o: get_xyz(data_lookup[o['nearest_cap']]) if 'nearest_cap' in o else get_xyz(o)

        if o.get('other_pipe'):
            o['linetype'] = 'pipe'
            if o.get('nearest_cap'):
                # We used to put this in startpos but we just move the pipe now
                nc = data_lookup[o['nearest_cap']]
                o['lat'], o['lng'], o['alt'] = nc['lat'], nc['lng'], nc['alt']
            if o['other_pipe'] == alt:
                del o['linetype'];
                del o['other_pipe']     # Some pipes point at themselves (basically in only)
            else:
                opo = data_lookup[o['other_pipe']]
                o['target'] = get_nc_xyz(opo)
                if alt == opo.get('other_pipe'):
                    o['twoway'] = 1
                    opo['twoway'] = 2
        elif o['type'] == 'Jumppad_C':
            o['linetype'] = 'jumppad' 
            if o.get('allow_stomp') or o.get('disable_movement_in_air') == False:
                o['variant'] = 'blue'
            else:
                o['variant'] = 'red'
        elif o.get('actors'):
            targets = []
            for actor in o['actors']:
                a = actor if ':' in actor else ':'.join((o['area'], actor))
                if (ao := data_lookup.get(a)) and ao in data and ao['type'] not in classes_to_filter:
                    targets.append(get_xyz(data_lookup[a]))
            if targets != []:
                o['linetype'] = 'trigger'
                o['targets'] = targets

        # Mark pads/pipes for which we haven't identified save information
        if o['type'] == 'Jumppad_C' and alt not in savedpadpipes['pads']:
            o['notsaved'] = True
        if ('Pipesystem' in o['type'] and alt not in savedpadpipes['pipes'] and
               ((nc := o.get('nearest_cap')) and nc not in savedpadpipes['pipes'] or not nc)):
            o['notsaved'] = True

    # Convert piles of non-rotating coins to stack markers
    create_coinstacks(data_lookup, data)

    # Remove entries that match the specified set of classes
    # note they still exist in data_lookup if needed (for references)
    if stripUnusedClasses:
        i = len(data)
        print(f'lengths {i} {len(data_lookup.values())}')
        for o in data_lookup.values():
            if o['type'] in classes_to_filter:
                data.remove(o)  
        print(f'Removed {i - len(data)} instances of {len(classes_to_filter)} classes')

    # Strip properties we don't need to export
    if stripUnusedProperties:
        for o in data:
            for prop in list(o.keys()):
                if not prop in exported_properties:
                    del o[prop]

    def parse_json(j):
        # Custom markers is an array of dictionaries which must have name/area declared
        # if 'del': True then we delete the whole instance
        # otherwise we take the remaining members
        # and merge: 'property': new value
        # or delete: '!property': anything
        count = 0
        for jo in j:
            id = ':'.join((jo['area'], jo['name']))
            o = data_lookup.get(id)
            count += 1
            if jo.get('del'):
                if o: data.remove(o)
            else:
                if not o:
                    o = {}
                    data_lookup[id] = o
                    data.append(o)
                for prop, value in jo.items():
                    if value == '!':
                        o.pop(prop, None)
                    else:
                        o[prop] = value
        return count

    # Read in any build time custom data we'd like to merge
    for cfn in [f'custom-data.{game}.json']:
        if os.path.isfile(cfn):
            count = parse_json(json.load(open(cfn)))
            print(f'Processed {count} instances read from {cfn}')


# Goes through all the non-rotating coins and looks for groups of more than 3 to combine into coinstacks
# Adds the new stack objects to our collection and removes the original coins
def create_coinstacks(data_lookup, data):

    threshold = 400

    # Positions of all non-rotating coins and their corresponding indices in data
    points = []
    dataidx = []
    for idx, o in enumerate(data):
        if o['type'] in ['Coin_C', 'CoinBig_C'] and o.get('is_doesnt_rotate'):
            points.append([o['lng'], o['lat'], o['alt']])
            dataidx.append(idx)

    if len(points) == 0:
        return

    # Creates a graph of connected elements that are within the distance threshold ie sets of
    # points that all fit within a sphere of max radius 'threshold' 
    graph = weights.DistanceBand.from_array(points, threshold=threshold, silence_warnings=True).to_networkx()

    # Create an array of new stack objects to add and a list of old coin indices to remove
    stackId = 0
    stacks = []
    delobj = []
    for cc in nx.connected_components(graph):
        # Note inc should be adfter the condition however there is custom
        # data depending on the number now and it only matters they are unique
        stackId += 1    
        if len(cc) > 3:
            coins = 0
            old_coins = {}
            for idx in cc:
                o = data[dataidx[idx]]
                coins += o['coins']
                old_coins[o['name']] = o['coins']
                area = o['area']
                delobj.append(data[dataidx[idx]])
            c = np.r_[points][list(cc)].mean(axis=0)

            stacks.append({
                'name': f'CoinStack{stackId}', 'type': '_CoinStack_C', 'area': area,
                'lat': c[1], 'lng': c[0], 'alt': c[2], 'coins': str(coins), 'old_coins': old_coins
                })

    # Delete the old coins and add the new ones - we don't bother clearing out data_lookup
    delcount = len(delobj)
    for o in delobj:
        data.remove(o)

    for stack in stacks:
        data.append(stack)
        data_lookup[':'.join((stack['area'], stack['name']))] = stack

    print(f'Replaced {delcount} coins with {len(stacks)} stacks')

# Somewhat hacky code to convert class name to a more friendly name
def friendly_name(cls):
    n = re.sub(r'(?:_C$)|(?:^BP_)|(?:Purchase)|(?:Buy)|_|DLC2|DLC|New', '', cls)
    n = n.replace('pct', '%')
    n = re.sub(r'x([0-9])', r'*\1', n)
    n = re.sub(r'([A-Z+-]+)', r'.\1', n)
    n = re.sub(r'([a-z])([0-9])', r'\1.\2', n)
    n = re.sub(r'([0-9])([a-z]{2,20})', r'\1.\2', n)
    n = n.replace('Smashdown', 'Stomp')
    n = n.replace('*', 'x')
    n = n.rstrip('.').lstrip('.')

    return n 

def read_game_classes(fn = '..\\data\\gameClasses.json'):

    print('Reading "'+fn+'"...')

    # Open and read the whole js file if it exists
    if not os.path.exists(fn):
        sys.exit(f'{fn} not found, exiting')

    with open(fn, 'r', encoding='utf-8') as f:
        classes = json.load(f)

    return classes

def read_savedpadpipes(game):

    fn = f'savedpadpipes.{game}.json'

    # Open and read the whole js file if it exists
    if os.path.exists(fn):
        print('Reading "'+fn+'"...')
        return json.load(open(fn, 'r', encoding='utf-8'))

    print(f'Warning: {fn} not found, skipping')
    return {'pipes':[], 'pads':[]}


def export_textures(game, cache_dir):
    path = os.environ.get(game+'dir',config[game]['path'])
    prefix = config[game]['prefix']
    logging.getLogger("UE4Parse").setLevel(logging.INFO)
    aeskeys = { FGuid(0,0,0,0): FAESKey('0x'+'0'*64), }
    gc.disable()
    provider = DefaultFileProvider(path, VersionContainer(EUEVersion.GAME_UE4_27))
    provider.initialize()
    provider.submit_keys(aeskeys)
    provider.load_localization("en")
    gc.enable()
    for package_path in config[game]['images']:
        base = os.path.basename(package_path)
        filename = os.path.join(cache_dir, base) + '.png'
        if os.path.exists(filename):
            print(filename, 'exists')
            continue
        print('writing "%s" ...' % filename)
        package = provider.try_load_package(package_path)
        if texture := package.find_export_of_type("Texture2D"):
            image = texture.decode()
            image.save(filename, "png")


def main():

    export_sw_markers("sw", "source")
    export_sw_markers("sl", "source")
    export_sw_markers("slc", "source")
    export_sw_markers("siu", "source")

    exit()

    # Looks for environment variable {game}dir ie %SLDIR% for the path where the game data is stored 

    parser = argparse.ArgumentParser()
    parser.add_argument('-g', '--game', default='siu', help='game name (sl, slc, siu, sw)')
    parser.add_argument('-d', '--cache_dir', default=tempfile.gettempdir(), help='cache directory for temporary files')
    parser.add_argument('-t', '--textures', action='store_true', help='export textures')
    parser.add_argument('-l', '--levels', action='store_true', help='export json levels to cache directory')
    parser.add_argument('-m', '--markers', action='store_true', help='export markers as json (need json levels)')
    parser.add_argument('-b', '--blueprints', action='store_true',  help='read blueprints and export loc json')
    parser.add_argument('-o', '--loc', action='store_true',  help='export gameClasses.js as json')
    args = parser.parse_args()

    try:
        os.mkdir(args.cache_dir)
    except Exception as e:
        pass

    if args.markers:
        export_markers(args.game, args.cache_dir)
    elif args.levels:
        export_levels(args.game, args.cache_dir)
    elif args.blueprints:
        export_class_loc(args.cache_dir)
    elif args.textures:
        export_textures(args.game, args.cache_dir)
    elif args.loc:
        export_loc_files(args.cache_dir)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()

