from itertools import groupby
from math import radians
import re
from typing import Any, Optional

from mathutils import Euler, Quaternion, Vector

type JsonData = Any


# Unreal mostly uses PascalCase / UpperCamelCase for its naming. This function converts a string of this form
# to snake case ie all lower case with underscores. It has special handling for flags converting 'bMyVar' to
# 'is_my_var' and 'MyVar?' to 'my_var_flag'
def camel_to_snake(s: str) -> str:
    if s[-1] == '?':
        s = s[:-1] + 'Flag'
    if s.startswith('b'):
        s = 'Is' + s[1:]
    s = s.replace(' ', '')
    return ''.join(['_' + c.lower() if c.isupper() else c for c in s]).lstrip('_')


# Returns list of numbers in the specified string (ie "a1b98" return ["1", "98"])
def get_ints(s: str) -> list[str]:
    return [''.join(group) for key, group in groupby(s, lambda e: e.isdigit()) if key]


# Returns last number in the specified string
def get_last_int(s: str) -> str:
    return ints[-1] if (ints := get_ints(s)) else ''


# Returns number at end of the specified string or empty string if it isn't one
# Note: we could do this more simply with a regexp but it seems inefficient
# def get_last_int(s):
#     return m.group() if (m := re.search('\d+$', s)) else ''
def get_end_int(s: str) -> str:
    return get_ints(s)[-1] if s and s[-1].isdigit() else ''


def optEnum(s: str | int):
    if match := re.search('::.*([0-9]+)$', str(s)):
        return int(match.group(1))
    return s


def optArea(a, k, v):
    return v if a == k else ':'.join((k, v))


def optColor(p):
    return p and '#' + ''.join(hex(int(p[c]))[2:] for c in 'RGB')


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

'''


# p = {
# "ObjectName": "ShopEgg_C'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'",
# "ObjectPath": "/Supraworld/Maps/Supraworld.60177"
# }
# Returns 'Supraworld.60177'
def objectRefStr(p: dict[str, str]) -> str:
    return p['ObjectPath'].split('/')[-1]


# Returns ['Supraworld', 60177]
def objectRef(p: dict[str, str]) -> list:
    t = objectRefStr(p).split('.')[-2:]
    return [t[0], int(t[1])]


# p = {
# "ObjectName": "ShopEgg_C'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'",
# "ObjectPath": "/Supraworld/Maps/Supraworld.60177"
# }
# Returns 'Supraworld:PersistentLevel.ShopEgg_C_UAID_FC3497C34610BB6D01_1671702339'
def objectKey(p: dict[str, str]) -> str:
    return p['Objectpath'].split("'")[1]


# Returns a key for an object based on it's area, outer and name. Won't be useful for objects
# deeper than root or next level in the hierarchy
def makeObjectKey(area: str, outer: str, name: str) -> str:
    key = area + ':PersistentLevel.'
    if outer != 'PersistentLevel':
        key += outer
    return key + '.' + name
