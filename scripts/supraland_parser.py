from pathlib import Path
from itertools import groupby
from mathutils import Vector, Matrix, Euler, Quaternion
from math import radians
from PIL import Image
import json, os, sys, re, argparse
import numpy as np
from sklearn.neighbors import KDTree
import networkx as nx
from libpysal import weights

stripUnusedClasses = False      # strip any instances that have a type we don't explicitly support in gameClasses.js  
stripUnusedProperties = True    # strip any properties we don't explicitly require from all objects (defined in exported_properties)

'''
References to other UE objects the level files and blueprints often use a pair
of strings:
    AssetNamePath / SubStringPath
or  ObjectName / ObjectPath

These are identifying a file from the PAK (to be found in gamefilelist.txt)
by a filename, possibly an object index etc.

When AssetPathName and ObjectPath are used to reference a file that will be
found in the gamefilelist.txt. The first word in the path may be a mapping
name as follows:

In Supraland / Crash
[/]Game/        -> Supraland/Content

In SIU
[/]Game/        -> SupralandSIU/Content

In SW
[/]Game/        -> Supraworld/Content
[/]Supraworld/  -> Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/
[/]SupraAssets/ -> Supraworld/Plugins/Supra/SupraAssets/Content/
[/]SupraCore/   -> Supraworld/Plugins/Supra/SupraCore/Content/

The path may be relative to any of these directories or there may be no
path.

For objects in maps, AssetPathName will be map file reference and SubStringPath
will be the object name hierarchy ie PersistentLevel.{ObjectName} 

For blueprint references AssetPathName will be the bluerint file with .{type_C}
and SubStringPath may be empty

For ObjectName/ObjectPath ObjectPath will have object path to a file and the index
of the object within that file. ObjectName gives the name path (outer.outer.name)

Or ObjectName can contain a class and ObjectPath the place where that is defined
using the map.index method

So we can normally decode the reference to:
1. A type / class of the object being referenced
2. A physical file where the relevant definition exists
3. A way to find the specific object within the file


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

    ObjectName:
        "BlueprintGeneratedClass'{type}'"                   <-- blueprint class
        "{type}'{file}:PersistentLevel.{outer}.{name}'"     <-- instance (file can be map)
        "{type}'Default__{type}[:name]'"                    <-- templates (name is child of default object)
        "Function'{class}:{name}
    
    Seems like the thing between ' and : is the object this belongs to a map, a class, a default structure
    it basically seems to be what the thing is in then the bit after : is the hierarchy relevant to it
    so it might be a class or it might be a level or some object

    ObjectPath:
        map/blueprint file reference (map => area) using index into array of objects
        "[/][symboliclink/]{file path}/{file}.{index}

    for this: ObjectPath always gives the file the thing is contained in and index which object (for the definition)
    and ObjectName the last bit between one of ': and the final ' will be the name of the object. If the object is
    the definition of a class it's a type (generally ends in _C)

    Used for references to classes (to create one) or a specific instance in another file ()
    AssetPathName:
        map/blueprint file reference using name of object (SubPathString if not unique)
        "[/][symboliclink/]{file path}/{blueprint or map file}.name"  <-- if subPathString is empty {name} is class otherwise map area        
        "" or "None"                                                 <-- No ref
    SubPathString:
        Unique hierarchy names to a specific object in a file (grandparent.parent.child}
        "PersistentLevel[.{outer}].{name}"                  <-- instance in another file
        ""                                                  <-- class

    for this: AssetPathName gives the file along with map or class. SubPathString
    If non-unique subpathstring clarifies with the full hierarchy. So required for instances
    not required for class/type

    Instance:
        area       Map, Crash, DLC2_*, Supraworld
        file       [/][symboliclink/]{file path}/{bp or map name}{.uasset|.umap}
        ref        index of object in a uasset file
        type       class/type of object *_C for game objects
        outer      the parent (could have a whole hierarchy but most of what we care about is 1st or occasionally 2nd)
        name       name of the object most of our objects are unique with area:name

    Class:
        file       [/][symboliclink/]{file path}/{bp or map name}{.uasset|.umap}
        type/name  in the blueprint file it will be in the name field (file names normally exclude _C)
        ref        index of class within blueprint (not required)

    type,ref = p.get('ObjectName').split("'")[0:1]

    return (type, ref. 
    def objectName(p):
        return p.get('ObjectName', '').split('.')[-1][:]
    def ObjectClass(p):
        return p.get('ObjectName', '').split("'")[0]
    def objectAreaName(p):
        return [p.get('ObjectPath').split('/')[-1].split('.')[-2], objectName(p)]
    def objectRef(p):
        return p['ObjectPath'].split('/')[-1].split('.')
    def assetClass(p):
        return p['AssetPathName'].split('.')[-1]
    def assetAreaName(p):
        return p['AssetPathName'].split('.')[-1], p['SubPathString'].split('.')
            "AssetPathName": "/Supraworld/Maps/Supraworld.Supraworld",
            "SubPathString": "PersistentLevel.NPCManagerVolume_C_UAID_7085C2B20F0E486802_1139294404"
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
'''
# p = {
# "ObjectName": "ShopEgg_C'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'",
# "ObjectPath": "/Supraworld/Maps/Supraworld.60177"
# }
# Returns 'Supraworld.60177'
def objectRefStr(p):
    return p['ObjectPath'].split('/')[-1]

# Returns ['Supraworld', 60177]
def objectRef(p):
    t = objectRefStr(p).split('.')[-2:]
    return [t[0], int(t[1])]

# p = {
# "ObjectName": "ShopEgg_C'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'",
# "ObjectPath": "/Supraworld/Maps/Supraworld.60177"
# }
# Returns 'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'
def objectKey(p):
    return p['Objectpath'].split("'")[1]

# Returns a key for an object based on it's area, outer and name. Won't be useful for objects
# deeper than root or next level in the hierarchy
def makeObjectKey(area, outer, name):
    key = area+':PersistentLevel.'
    if outer != 'PersistentLevel':
        key += outer
    return key + '.' + name

# Data about each game based on the game code sl, slc, siu, sw
#
# pathmap   gives the mapping for file references that is used
#           by ObjectName/ObjectPath and AssetPathName/SubPathString
# mapsdir   directory where the maps live
# maps      gives the name of the maps that we're actually interested in
# images    paths/names of the ingame map textures
config = {
    'sl': {
        'pathmap': {
            'Game': 'Supraland/Content',
        },
        'mapsdir': 'Supraland/Content/FirstPersonBP/Maps/',
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
        'pathmap': {
            'Game': 'Supraland/Content',
        },
        'mapsdir': 'Supraland/Content/FirstPersonBP/Maps/',
        'maps': [
            'Crash'
        ],
        'images': [
        ],
    },
    'siu': {
        'pathmap': {
            'Game': 'SupralandSIU/Content',
        },
        'mapsdir': 'SupralandSIU/Content/FirstPersonBP/Maps/',
        'maps': [
            'DLC2_Area0_Below',
            'DLC2_Area0',
            'DLC2_Complete',
            'DLC2_FinalBoss',
            'DLC2_LateChanges',
            'DLC2_Menu_Splash',
            'DLC2_Menu',
            'DLC2_PostRainbow',
            'DLC2_RainbowTown',
            'DLC2_SecretLavaArea',
            'DLC2_Splash',
        ],
        'images': [
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q0',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q1',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q2',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q3',
        ]
    },
    'sw': {
        'pathmap': {
            'Game': 'Supraworld/Content',
            'Supraworld':  'Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/',
            'SupraAssets': 'Supraworld/Plugins/Supra/SupraAssets/Content/',
            'SupraCore':   'Supraworld/Plugins/Supra/SupraCore/Content/',
        },
        'mappath': 'Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/Maps/',
        'maps': [
            'Supraworld'
        ],
        'images': [
            'Supraworld/Plugins/Supra/PlayerMap/Content/Textures/T_SupraworldMapV7Q0',
            'Supraworld/Plugins/Supra/PlayerMap/Content/Textures/T_SupraworldMapV7Q1',
            'Supraworld/Plugins/Supra/PlayerMap/Content/Textures/T_SupraworldMapV7Q2',
            'Supraworld/Plugins/Supra/PlayerMap/Content/Textures/T_SupraworldMapV7Q3',
        ],
    },
}

# Early Access Filter data
ea_filter = True
ea_fogfile = "swmapfog-ea.png"
ea_proggroups = [
    'Act1',
    'Act2.Blue',
    'Act2.Green',
]
ea_areas = [
    'ArmChairTown',
    'BedDrawer',
    'BedKingdom',
    'Castle',
    'OutskirtsCastle',
    'OutskirtsStartTown',
    'RecyclingArea',
    'SnailArea',
    'StartTown',
]
ea_abilities = [
    'BlowGun',
    'Crouch',
    'Dash',
    'Jump',
    'JumpHigh',
    'Vision',
    'SpongeSuit',
    'Toothpick',
    'Dart',
    'Stake',
    'Strength',
]
ea_fog_bounds = (-116500, -116500, 83500, 83500)
ea_fog_pixels = None
ea_fog_width = 0
ea_fog_height = 0


# Classes that potentially have a travel target
travel_types = [
    'Balloon_C',
    'DashLauncher_C',
    'GuardVolume_C',
    'Jumppad_C',
    'Jumppad_TwoPath_C',
    'LaunchBox_C',
    'LaunchVolume_C',
    'RubberBand_C',
    'RubberBand_CustomDeform_C',
    'WobbleSpring_C',
]

# Override Material Variants
material_types = [
    "Nailscrew_C",
    "PuzzleCloud_C"
]

material2variant = {
    'Metal_Base_Golden': 'gold',
    'CloudPurple':       'purple',
    'CloudCyan':         'cyan',
    'CloudRed':          'red',
    'CloudBlue':         'blue',
    'CloudWhite':        'white',
}

dietype2typeprefix = {
    'DieType::D6':       'D6',
    'DieType::D6 Round': 'D6R',
}

# Currently there are three Loot Pools:
#
# Lootpool1: Inventory_BlowgunBlowTime1_C
# Lootpool2: Inventory_DashDamage_C, Inventory_DashBurstRange_C, Inventory_ToothpickDamage_C, Inventory_MaxHealth_C
# Lootpool3Money: Inventory_Coin3_C


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
def get_ints(s):
    return [''.join(group) for key, group in groupby(s, lambda e:e.isdigit()) if key]

# Returns last number in the specified string
def get_last_int(s):
    return ints[-1] if (ints := get_ints(s)) else ''

# Returns number at end of the specified string or empty string if it isn't one
# Note: we could do this more simply with a regexp but it seems inefficient
# def get_last_int(s):
#     return m.group() if (m := re.search('\d+$', s)) else ''
def get_end_int(s):
    return get_ints(s)[-1] if s and s[-1].isdigit() else ''

# Return True if this string looks like some kind of enumeration
def isenum(s):
    return (isinstance(s, str)
        and '::' in s 
        and set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:0123456789"))

# Return True if this string looks like an Unreal renamed enumeration
def isueenum(s):
    return (isinstance(s, str)
        and '::NewEnumerator' in s)

class UEEnums:
    def __init__(self):
        self.map = {}
        self.types = set()

    def loadenumbp(self, *path):
        # Read the file as a JSON
        j = load_json_file(*path);

        # Check that it is formatted as we expect
        if (   not isinstance(j, list) or not j             # We have a non empty list
            or not isinstance(j[0], dict)                   # containing a dictionary
            or not j[0].get('Type') == 'UserDefinedEnum'):  # of the right type
            print(f"Warning: {path[-1]} does not appear to be an Unreal enumeration")
            return

        name = j[0]['Name']

        for e in j[0]['Properties']['DisplayNameMap']:
            k, v = e['Key'], e['Value']
            if (s := v.get('SourceString')) or (s:= v.get('CultureInvariantString')):
                if s != k:
                    self.map[name+'::'+k] = name+'::'+s
            else:
                print(f"Warning: in {path[-1]} {k} Value does not have SourceString nor CultureInvariantString'")

        self.types.add(name)

    # If s is an enumeration name we're aware of convert it to the source form
    def ue2source(self, s):
        return self.map.get(s)

    # Returns true if the two enum strings match. First may be a UE renamed enum
    # or a source enum, second should be an untranslated source name
    def match(self, ue, s):
        return (ue == s or self.ue2source(ue) == s)

    # If first argument is a UE enum then add it
    def addueattr(self, ue, s=None):
        if isueenum(ue):
            if s and s != ue:
                self.map[ue] = s
            self.types.add(ue[0:ue.find('::')])

# We presume export.cmd has been used to export a set of map files for the game to
# a sub-directory of 'cache_dir'. We are going to go through the map and generate
# information about the
def preproc_levels(cache_dir, game):
    # Load in any enumerations we have found / extracted
    ueenums = UEEnums()
    for filename in Path(cache_dir, game, 'enums').glob('*.json'):
        ueenums.loadenumbp(filename)

    # Load current gameClasses.json so we know which classes we currently know about for this game
    game_classes = load_json_file('..\\public\\data', 'gameClasses.json');

    # Load the game's PAK file list so we can look up where to find enums
    gamefilelist = load_filelist(cache_dir, game)

    # Set of blueprint CUE4Parse asset paths for types in gameClasses.json
    # and set of other classes which end in _C
    bp_assetlist = set()
    area_names = set()
    ignored_types = set()
    classprops = {}

    # Set of property:type pairs for all key:value pairs in game maps
    propset = {'Root': set(), 'Properties': set(), 'Other': set()}

    # Loop through all the level json's we've extracted
    for filename in Path(cache_dir, game, 'levels').glob('*.json'):
        # Area name is everything between last '\' and the '.json'
        filestr = str(filename)
        area = filestr[filestr.rfind('\\')+1:-5]
        area_names.add(area)

        # Read the level file in and loop through the outer list of objects)
        level = load_json_file(filename)
        level_changed = False
        for obj in level:
            if (   not (otype := obj.get('Type'))
                or not (oname := obj.get('Name'))
                or not (obp := obj.get('Class').split("'")[1].split('.')[0])):
                print(f'Warning: Object missing something in {filename} Type:{otype} Name:{oname} BP:{obp}')
                continue

            # Collect any claases which use the properties we're interested
            if(p:= obj.get('Properties')):
                for prop in ['RequiredAbilities', 'Area', 'ProgressionGroup',
                        'AdditionalRequirementHints', 'AdditionalRequirements',                    
                        'DieType',
                        'Value', 'CoinValue', 'Coins', 'CoinPool',
                        'Pickup Class', 'CustomShopItem', 'InventoryItem','Initial Shop Inventory',
                        'SupraworldLaunchComponent', 'FrontSupraworldLaunchComponent', 'BackSupraworldLaunchComponent', 'AltLaunchComp',
                        'SpawnerTags',
                        'Spawn on Level Start',
                    ]:
                    if prop in p:
                        classprops[otype] = set([*list(classprops.get(otype, set())),prop])

            # Remember blueprint paths of types we're interested in
            # And the base type of any other custom types
            # Note: old SL based game classes don't necessarily have games member
            if otype in game_classes and game in game_classes[otype].get('games', ['sl', 'slc', 'siu']):
                bp_assetlist.add(obp if obp[0] != '/' else obp[1:])
                p = obj['Properties']
                # Collect those classes we're interested that use these properties
                for prop in ['Color', 'Color_Initial', 'Initial_Color',
                        'ButtonColor', 'LiquidColor', 'RuneColor',
                        'bExists', 'bHidden']:
                    if prop in p:
                        classprops[otype] = set([*list(classprops.get(otype, set())),prop])
            elif otype.endswith('_C'):
                ignored_types.add(otype)

            # Walk all data in the level remembering property names/types
            # Any enum types used and if possible remap enum attributes to source names
            def gather_properties(obj, setkey):
                nonlocal level_changed

                for ref, value in obj.items() if isinstance(obj, dict) else enumerate(obj):
                    proptype = type(value).__name__
                    if isenum(value):
                        proptype = value[0:value.find('::')]
                        ueenums.addueattr(value)
                        if isueenum(value):
                            if source := ueenums.ue2source(value):
                                obj[ref] = source 
                                level_changed = True

                    if isinstance(obj, dict):
                        otype = None
                        if ref == 'ObjectName' and value.startswith('BlueprintGeneratedClass'):
                            otype = value.split("'")[1]
                            obp = obj['ObjectPath'].split('.')[0]
                        if ref == 'AssetPathName' and value and '.' in value:
                            obp, otype = value.split('.')
                        if otype:
                            if (otype == 'Jumppad_C'
                                or otype in game_classes and game in game_classes[otype].get('games', ['sl', 'slc', 'siu'])):
                                bp_assetlist.add(obp if obp[0] != '/' else obp[1:])
                            elif otype.endswith('_C'):
                                ignored_types.add(otype)
                            continue
                        propset[setkey].add(ref+':'+proptype)

                    if isinstance(value, (dict, list)):
                        gather_properties(value, 'Properties' if ref == 'Properties' else 'Other')

            gather_properties(obj, 'Root')

        # If we changed this level map's enumerations then write it out again
        if level_changed:
            save_json_file(level, filename)

    save_assetlist(bp_assetlist, gamefilelist, cache_dir, game, 'bpassetlist.txt')
    save_assetlist(ueenums.types, gamefilelist, cache_dir, game, 'enumassetlist.txt', prefer="Enums")
    save_text_file(sorted(area_names), cache_dir, game, "areanames.txt")

    for k,v in classprops.items():
        classprops[k] = sorted(list(v))
    levelprops = {
        "ClassProps": dict(sorted(classprops.items())),
        "IgnoredTypes": sorted(list(ignored_types)),
        "EnumTypes": sorted(list(ueenums.types)),
        "EnumValues": ueenums.map,
        "RootProps": sorted(list(propset['Root'])),
        "Properties": sorted(list(propset['Properties'])),
        "OtherProps": sorted(list(propset['Other'])),
    }
    save_json_file(levelprops, cache_dir, game, 'levelprops.json')



# Load the filelist we have extracted from the specific game which gives the
# path of all files, so that we can look for files corresponding to enums and
# structures which don't include the path in the object instance
def load_filelist(*path, quiet=False):
    lines = load_text_file(*path, 'gamefilelist.txt', quiet=quiet)
    basedict = {}
    for line in lines:
        basename,ext = line.split('/')[-1].split('.')

        # We're only interested in uasset files (for bps, enums etc)
        if ext.startswith('uasset'):
            # Add line to array for each base filename
            if not basedict.get(basename):
                basedict[basename] = []
            basedict[basename].append(line)

    return { 'lines': lines, 'basedict': basedict}

# Write an asset list for use by CUE4Parse to select which files to extract
# from the game PAK file. Blueprints needed for localisation and enums just
# for understanding data
def save_assetlist(items, filelist, *path, quiet=False, prefer=None):
    lines=[]
    basedict = filelist['basedict']
    for item in items:
        if item.find('/') == -1:
            if matching_lines := basedict.get(item):
                match_idx = 0
                if len(matching_lines) > 1:
                    print(f'Warning: multiple options in gamefilelist.txt for assetlist item {item}')
                    if prefer:
                        for i, line in enumerate(matching_lines):
                            if prefer+'/'+item+'.uasset' in line:
                                match_idx = i
                lines.append(matching_lines[match_idx])
        else:
            names = item.split('.')[0].split('/')
            if matching_lines := basedict.get(names[-1]):
                fullname = '/'.join(names[1:])+'.uasset'
                for line in matching_lines:
                    if line.lower().endswith(fullname.lower()):
                        lines.append(line)
    lines.sort()
    save_text_file(lines, *path, quiet=quiet)

# The following load/save functions make a path by joining all the varargs
# together with '\\' and adding '.txt'
#
# For game specific source data this is usually something like:
#   cache_dir:  ..\\source             (but can be any path)
#   game:       'sl', 'siu', 'sw'      (note Crash files are in sl source directories)
#   dir:        'levels', 'enums', 'bps', 'loc', 'mapimg'
#   filename:   'Map'
# 
# For output data used by the web map it's likely:
#  '..\\public\\data', 'gameClasses'
#
# Extension should not be included. Empty strings will be ignored/skipped

# Reads a json file and converts it do an object data structure
def load_json_file(*path_args, quiet=False):
    path = Path(*path_args)
    if not path.exists():
        sys.exit(f'{path} not found, exiting')
    if not quiet: print(f'Reading "{path}"...')
    return json.load(open(path, encoding="utf-8-sig"))

# Converts object to JSON format and writes it to the specified location
def save_json_file(object, *path, quiet=False):
    path = os.path.join(*path[0:-1], path[-1])
    with open(path, 'w') as file:
        if not quiet: print(f'Writing "{path}"...')
        json.dump(object, file, indent = 2)

# Load a text file into a string list with an entry for each line
# Removes newlines from end of each line 
def load_text_file(*path, quiet=False):
    path = os.path.join(*path[0:-1], path[-1])
    if not os.path.exists(path):
        sys.exit(f'{path} not found, exiting')
    if not quiet: print(f'Reading "{path}"...')
    with open(path) as file:
        return file.read().splitlines()

# Overwrite file with each string in lines list adding newline to each
def save_text_file(lines, *path, quiet=False):
    path = os.path.join(*path[0:-1], path[-1])
    with open(path, 'w') as file:
        if not quiet: print(f'Writing "{path}"...')
        with open(path, 'w') as file:
            for line in lines:
                file.write(line + '\n')



# Load in a PNG file containing RGB values 
def load_ea_fog(*path):
    path = os.path.join(*path, 'mapimg', ea_fogfile)
    if not os.path.exists(path):
        print(f'Warning: Failed to load fog png ({path})')
        return None
    with Image.open(path) as im:
        global ea_fog_width, ea_fog_height, ea_fog_pixels
        ea_fog_width = im.width
        ea_fog_height = im.height
        ea_fog_pixels = im.getchannel(0).load()


def in_earlyaccess(otype, p, pos):
    if not ea_filter:
        return True

    # If it has a progression and it's not in released content then reject
    if ((proggroup := p.get('ProgressionGroup', {}).get('TagName'))
        and not any(proggroup.endswith(s) for s in ea_proggroups)):
            return False

    # If it has an area that's not 
    if ((swarea := p.get('Area', {}).get('TagName'))
        and not any(swarea.endswith(s) for s in ea_areas)):
            return False

    # Some classes should be rejected if they have no area tag
    if not swarea and otype in ['SecretVolume_C']:
        return False
    
    # Check if it requires abilities not yet released
    if (required := p.get('RequiredAbilities')): 
        for r in required:
            if isinstance(r, str) and not any(r.endswith(s) for s in ea_abilities):
                return False

    if(ea_fog_pixels):
        (xmin, ymin, xmax, ymax) = ea_fog_bounds 
        if xmin < pos.x < xmax and ymin < pos.y < ymax: 
            px = (pos.x - xmin) / (xmax - xmin) * ea_fog_width
            py = (pos.y - ymin) / (ymax - ymin) * ea_fog_width
            if(ea_fog_pixels[px, py] < 255):
                return False

    # Should probably check pos against a cuboid but not yet
    return True




def export_sw_markers(cache_dir, game):
    maps = {}       # dictionary from map name to json data list
    toyeggs = {}    # Collected chocolate eggs
    meshmats = {}   # dictionary from outer name to mesh material variant
    targets = {}    # dictionary from outer name to target positions   
    area_mtx = {}   # Transform for each area map geometry
    data = []       # Output marker data
 
    def optEnum(s):
        return int(s[len(s.rstrip('0123456789')):] or 0) if type(s) is str and '::' in s else s

    def optArea(a, k, v):
        return v if a == k else ':'.join((k, v))

    def optColor(p):
        return p and '#'+''.join(hex(int(p[c]))[2:] for c in 'RGB')

    def optKey(d, k, v):
        return v is not None and d.__setitem__(k, optEnum(v))

    def getVec(d, v=0):
        return Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v, v, v))

    def getRot(d, v=0):
        return Euler((radians(-d['Roll']), -radians(d['Pitch']), radians(d['Yaw']))) if d else Euler((v, v, v))

    def getQuat(d, v=0):
        return Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v, v, v, v))

    def getXYZ(v):
        return dict(x=v.x, y=v.y, z=v.z)

    # Phase 1: Read all the map json files in and build a look up table for references
    # Also get any area/map file matrices (for streaming levels)
    for area in config[game]['maps']:
        # Store the map data
        maps[area] = load_json_file(cache_dir, game, 'levels', area+'.json')

        # Go through all objects in the map data and store lookups for later
        for oidx, o in enumerate(maps[area]):
            if not (outer := o.get('Outer')) or not (p:= o.get('Properties')):
                continue
            oname = o['Name']
            otype = o['Type']

            # Keep list of static meshes by parent/outer
            if (otype == 'StaticMeshComponent'
                and (oms := p.get('OverrideMaterials'))):
                for om in oms:
                    if (om and (v := om.get('ObjectName'))
                        and (v:= material2variant.get(v.split("'")[-2].split('.')[-1]))):
                        meshmats[outer] = v

            # Keep list of Chocolate Egg interior objects
            if(otype == 'ChocolateEgg_C' and (v := p.get('ToyEgg'))):
                toyeggs[objectRefStr(v)] = o

            # Keep a list of launch target positions
            # I was filtering based on name but it's not reliable indicator of class
            # some rubber bands have name 'StaticMashActor_...' for example
            # and outer[0:outer.find("_C")+2] in travel_types): name 
            if (otype == 'SupraworldLaunchComponent_C'
                and (tl := p.get('TargetLocation'))
                and not oname == 'AltLaunchComp'):      # For now remove Jumppad_TwoPath_C 2nd path
                targets[outer] = [*targets.get(outer, []), {'x': tl['X'], 'y': tl['Y'], 'z': tl['Z']}]

            # For maps that are divided into multiple files, there may be a LevelTransform for entities in that
            # file relative to the persistent world that is handled by the streaming system. To correct for this
            # we construct a matrix from the Translation/Rotation members if they exit
            if (a := p.get('WorldAsset',{}).get('AssetPathName')) and (t := p.get('LevelTransform')):
                area_mtx[a.split('.').pop()] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

    game_classes = read_game_classes()

    load_ea_fog(cache_dir, game)

    # Phase 2: Go through all the objects which have types we're interested in
    for area in maps:
        for oidx, o in enumerate(maps[area]):
            otype = o['Type']
            oname = o['Name']
            if not (outer := o.get('Outer')) or not (p := o.get('Properties')):
                continue

            def getObject(p):
                ref = objectRef(p)
                return maps[ref[0]][ref[1]]

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties', {})

                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1)) @ matrix

                for prop in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    if p.get(prop):
                        return get_matrix(getObject(p[prop]), matrix)
                '''                    
                    node = p.get(parent)
                    if type(node) is dict:
                        obj = getObject(node)
                        if type(obj) is dict:
                            return get_matrix(obj, matrix);
                '''
                return matrix

            matrix = get_matrix(o)
            if area in area_mtx:
                matrix  = area_mtx[area] @ matrix
            pos = matrix.to_translation()

            # Fix up classes that have weird defaults in the blueprint
            if otype == 'DetectiveCase_ChocolateFactory':
                o['ProgressionGroup']= { "TagName": "Supraworld.Story.Act2.Blue" }

            # Check for early access based on type, properties and map position
            if not in_earlyaccess(otype, p, pos):
                continue

            # If this is a shop egg inside a chocolate egg then skip it (ChocolateEgg_C)
            if toyeggs.get(area+'.'+str(oidx)):
                continue

            # Add the standard data to the object
            data.append({'name':oname, 'type':otype, 'area':area, 'lat': pos.y, 'lng': pos.x, 'alt': pos.z })

            # Hidden Flag
            if (p.get('bHidden') == True
                or p.get('bHiddenInGame') == True
                or p.get('bExists') == False
                or p.get('InitialExists') == False 
                or p.get('Spawn on Level Start') == False
                or p.get('bItemIsAvailable_Initial') == False):
                data[-1]['hidden']='true'

            # Handle the Obvious Area secret
            comment = None
            if o.get('ActorLabel') == "ObviousAreaOuttaTown":
                p['Area'] = {'TagName': 'OutskirtsStartTown'}
                comment = 'Obvious Area'

            variant = ''
            # Variants from colours or override materials
            for colkey in ['RuneColor', 'Color', 'Color_Initial', 'LiquidColor', 'ButtonColor']:
                if (color := p.get(colkey)) and isinstance(color, str):
                    variant = color.removeprefix("ESupraColors::").lower()
                    break

            # Currently gold screws and puzzle cloud's
            if v := meshmats.get(oname):
                variant = v

            if otype == 'SupraworldPlayerStart_C':
                o['variant'] = 'red'

            # Only keep gold variant of Nailscrew_C 
            if otype == 'Nailscrew_C' and variant != 'gold':
                del data[-1]
                continue

            if variant:
                data[-1]['variant'] = variant

            # If it's a D6 or D6 Round then change the class (could use variant but might have coloured die in future)
            if otype == 'Die_C' and (v := dietype2typeprefix.get(p.get('DieType'))):
                data[-1]['type'] = v + ':' + otype

            if otype == 'HayGuy_C' and p.get('Collectible Tag', {}).get('TagName') == 'Stats.Collectible.Thread':
                data[-1]['type'] = '_ThreadGuy_C'

            # Solve clashes with old game classes
            if otype in ['Jumppad_C', 'KeyPlastic_C']:
                data[-1]['type'] = 'SW:'+otype

            # Grab the Area (or AreaTag) if there is one
            if v := p.get('Area', p.get('AreaTag', {})).get('TagName'):
                data[-1]['area_tag'] = v.split('.')[-1]

            # Grab progression tag
            if v := p.get('ProgressionGroup', {}).get('TagName'):
                data[-1]['prog_tag'] = v.removeprefix('Supraworld.Story.').replace('.', ':')

            # Grab secret required abilities if there are any
            if otype == 'SecretVolume_C' and (v:= p.get('RequiredAbilities')):
                data[-1]['abilities'] = ','.join([a.removeprefix('GameplayAbilitySystem.Ability.').replace('.', ' ') for a in v])

            # If this is a chocolate egg then get the spawn property from the related toy egg (which will not be included)
            spawn_props = p
            if(otype == 'ChocolateEgg_C' and (v:= p.get('ToyEgg'))):
                spawn_props = getObject(v)['Properties']

            # Spawners (presents, shops, eggs, launch boxes, ...)
            spawns = ''
            if v := spawn_props.get('Pickup Class'):
                spawns = v['ObjectName'].split("'")[-2]
            elif ((v := spawn_props.get('InventoryItem'))
                or ((v := spawn_props.get('Initial Shop Inventory')) and isinstance((v := list(v[0].values())[0]), dict))
                or (v := spawn_props.get('CustomShopItem'))):
                spawns = v['AssetPathName'].split(".")[-1]
            if spawn_props.get('bFromLootPool') == True:
                spawns = '_LootPool_C'

            # These classes just spawn stuff so we change the type to what it spawns
            if otype in ['ItemSpawner_C', 'PickupSpawner_C', 'ShopItemSpawner_C', 'RespawnablePickupSpawner_C', 'ShopSlot_C']:
                data[-1]['type'] = otype = spawns
                spawns = ''

            # Coins
            # Anything that spawns Inventory_Coin[nn]_C or RealCoinPickup_C/5Cent_C/Gumball_Machine_C
            coins = 0
            if (v := coin_defaults.get(otype)) or (v := coin_defaults.get(spawns)):
                coins = v
            if (v := p.get('Value')) and v.startswith('CoinValue::'): # RealCoinPickup_C/5Cent_C
                coins = int(get_end_int(v))
            if (v := p.get('CoinPool')):                              # Gumball_Machine_C
                coins = v
            if coins:
                data[-1]['coins'] = coins
                if spawns != '':
                    data[-1]['type'] = 'Coin:' + data[-1]['type']
                    spawns = ''

            # Loot boxes default to spawning loot pools
            if otype == 'PresentBox_Lootpools_C' and not (coins or spawns):
                spawns = '_LootPool_C'

            if spawns != '':
                data[-1]['spawns'] = spawns

            # Remove any empty eggs
            if otype in ['ShopEgg_C', 'ChocolateEgg_C'] and not spawns:
                del data[-1]
                continue

            def filter_targets(objpos, targets, mindist):
                ov = Vector((objpos['lng'], objpos['lat'], objpos['alt']))
                keep = [ target for target in targets if (Vector((target['x'], target['y'], target['z'])) - ov).magnitude >= mindist]
                return keep

            # Travel targets
            if(oname in targets
               and (v := filter_targets(data[-1], targets[oname], 600))):
                data[-1]['targets'] = v
                data[-1]['linetype'] = 'target'

            # Type may have been modified, so only check for it at the end
            otype = data[-1]['type']

            def class_supported(otype, game):
                return ((gc := game_classes.get(otype))
                        and gc.get('layer')
                        and game in gc.get('games', []))

            if(not class_supported(otype, game) 
               or spawns and not class_supported(spawns, game)):
                del data[-1]
                continue

            if comment:
                data[-1]['comment'] = comment

    save_json_file(data, "..\\public\\data", f'markers.{game}.json')
    print("Done")


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
    classes = json.load(open('../public/data/gameClasses.json', 'r', encoding='utf-8'))
    customLoc = json.load(open('../public/data/custom-loc.json', 'r', encoding='utf-8'))
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
        path = '../public/data/'+fn
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
        print(f'Writing to ../public/data/loc/locstr-{loc}.json')
        json.dump(newlocstr, open(f'../public/data/loc/locstr-{loc}.json', 'w', encoding='utf-8'), indent = 2)


    
def export_markers(cache_dir, game):
    maps = {}       # dictionary from map name to json data list
    area_mtx = {}   # Transform for each area map geometry
    data = []       # Output marker data

    pipes = {}
    objects = {}

    data_lookup = {}
    classes_found = set()

    optEnum= lambda s:int(s[len(s.rstrip('0123456789')):]or 0) if type(s) is str and '::' in s else s
    optArea= lambda a,k,v: v if a==k else ':'.join((k,v))
    optColor=lambda p:p and '#'+''.join(hex(int(p[c]))[2:] for c in 'RGB')
    optKey = lambda d,k,v: v is not None and d.__setitem__(k,optEnum(v))
    getVec = lambda d,v=0: Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v,v,v))
    getRot = lambda d,v=0: Euler(( radians(d['Roll']), radians(d['Pitch']), radians(d['Yaw'])) ) if d else Euler((v,v,v))
    getQuat= lambda d,v=0: Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v,v,v,v))
    getXYZ = lambda v:{'x':v.x, 'y': v.y, 'z': v.z}

    # Phase 1: Read all the map json files in and build a look up table for references
    # Also get any area/map file matrices (for streaming levels)
    for area in config[game]['maps']:
        # Store the map data
        maps[area] = load_json_file(cache_dir, game, 'levels', area+'.json')

        # Go through all objects in the map data and store lookups for later
        for oidx, o in enumerate(maps[area]):
            if not (outer := o.get('Outer')) or not (p:= o.get('Properties')):
                continue
            oname = o['Name']
            otype = o['Type']

            # For maps that are divided into multiple files, there may be a LevelTransform for entities in that
            # file relative to the persistent world that is handled by the streaming system. To correct for this
            # we construct a matrix from the Translation/Rotation members if they exit
            if (a := p.get('WorldAsset',{}).get('AssetPathName')) and (t := p.get('LevelTransform')):
                area_mtx[a.split('.').pop()] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

            if otype.startswith('Pipesystem') and 'Pipe' in p and ('OtherPipe' in p or 'otherPipeInOtherLevel' in p):
                # p['Pipe']
                #     ObjectName: StaticMeshComponent'DLC2_Complete:PersistentLevel.HealingStation13_44.Pipe'
                #     ObjectPath: SupralandSIU/Content/FirstPersonBP/Maps/DLC2_Complete.58973
                # p['OtherPipe']
                #     ObjectName: PipesystemNew_C'DLC2_Complete:PersistentLevel.PipesystemNew10'
                #     ObjectPath: SupralandSIU/Content/FirstPersonBP/Maps/DLC2_Complete.19652
                # p['otherPipeInOtherLevel']
                #     AssetPathName: /Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete
                #     SubPathString: PersistentLevel.PipeToArea2
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

            objects[area +':'+oname] = o

    for area in maps:
        for oidx, o in enumerate(maps[area]):
            otype = o['Type']
            oname = o['Name']
            if not (outer := o.get('Outer')) or not (p := o.get('Properties')):
                continue

            allowed_items = (
                o['Type'] in marker_types
                or any(o['Type'].startswith(s) for s in starts_with)
                or any(o['Type'].endswith(s) for s in ends_with)
            )

            if not allowed_items: continue

            def getObject(p):
                ref = objectRef(p)
                return maps[ref[0]][ref[1]]

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties', {})

                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1)) @ matrix

                for prop in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    if p.get(prop):
                        return get_matrix(getObject(p[prop]), matrix)
                return matrix

            matrix = get_matrix(o)
            if area in area_mtx:
                matrix  = area_mtx[area] @ matrix

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

            if o['Type'] in ('Jumppad_C'):
                optKey(data[-1], 'velocity', (v:=p.get('Velocity'))and getXYZ(getVec(v)))
                d = Vector((matrix[0][2],matrix[1][2],matrix[2][2]));
                d.normalize()
                data[-1].update({'direction': getXYZ(d)})
                data[-1].update({'target': getXYZ(Vector((0,0,0)))})

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
    # data_indices = [i for i,o in enumerate(data) if allowed_points(o)]

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
}

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
    '5Cent_C': 5,
    'RealCoinPickup_C': 1,
    'Inventory_Coin_C': 1,
    'Inventory_Coin3_C': 3,
    'Inventory_Coin5_C': 5,
    'Inventory_Coin10_C': 10,
    'Gumball_Machine_C': 0
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
    def get_xyz(o):
        return dict(x=o['lng'], y=o['lat'], z=o['alt'])

    def get_nc_xyz(o):
        return get_xyz(data_lookup[o['nearest_cap']]) if 'nearest_cap' in o else get_xyz(o)

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

        if o.get('other_pipe'):
            o['linetype'] = 'pipe'
            if o.get('nearest_cap'):
                # We used to put this in startpos but we just move the pipe now
                nc = data_lookup[o['nearest_cap']]
                o['lat'], o['lng'], o['alt'] = nc['lat'], nc['lng'], nc['alt']
            if o['other_pipe'] == alt:
                del o['linetype']
                del o['other_pipe']     # Some pipes point at themselves (basically in only)
            else:
                opo = data_lookup[o['other_pipe']]
                o['target'] = get_nc_xyz(opo)
                if alt == opo.get('other_pipe'):
                    o['twoway'] = 1
                    opo['twoway'] = 2
        elif o['type'] == 'Jumppad_C':
            o['linetype'] = 'jumppad' 
            if o.get('allow_stomp') or not o.get('disable_movement_in_air'):
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
                if prop not in exported_properties:
                    del o[prop]


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
    n = n.replace('.', ' ')
    return n 

# Read gameClasses.json and return data
def read_game_classes(fn = '..\\public\\data\\gameClasses.json'):
    print('Reading "'+fn+'"...')

    # Open and read the whole js file if it exists
    if not os.path.exists(fn):
        sys.exit(f'{fn} not found, exiting')

    with open(fn, 'r', encoding='utf-8') as f:
        classes = json.load(f)

    return classes

# Write the specified data to gameClasses.json
def write_game_classes(classes, fn = '..\\public\\data\\gameClasses.json'):
    with open(fn, 'w') as f:
        print(f"Writing loc data to {fn}...")
        json.dump(classes, f, indent = 2)

# This file is generated using hard coded information and info from a save
# file. It is generated by dumpsavefile.js
def read_savedpadpipes(game):

    fn = f'savedpadpipes.{game}.json'

    # Open and read the whole js file if it exists
    if os.path.exists(fn):
        print('Reading "'+fn+'"...')
        return json.load(open(fn, 'r', encoding='utf-8'))

    print(f'Warning: {fn} not found, skipping')
    return {'pipes':[], 'pads':[]}



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-d', '--cache_dir', default='..\\source', help='directory where extracted and generated data is stored')
    parser.add_argument('-g', '--game', default='siu', help='game name (sl, slc, siu, sw)')
    parser.add_argument('-p', '--preproc', action='store_true', help='preprocess level files to gather ')
    parser.add_argument('-m', '--markers', action='store_true', help='export markers as json (need json levels)')
    parser.add_argument('-b', '--blueprints', action='store_true',  help='read loc from blueprints and export to gameClasses')
    parser.add_argument('-o', '--loc', action='store_true',  help='extract required loc strings for game')
    args = parser.parse_args()

    try:
        Path(args.cache_dir, args.game).mkdir(exist_ok=True, parents=True)
    except Exception:
        pass

    if args.preproc:
        preproc_levels(args.cache_dir, args.game)
    elif args.markers:
        if args.game=='sw':
            export_sw_markers(args.cache_dir, args.game)
        else:
            export_markers(args.cache_dir, args.game)
    elif args.blueprints:
        export_class_loc(args.cache_dir)
    elif args.loc:
        export_loc_files(args.cache_dir)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()

