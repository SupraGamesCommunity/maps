# install UE4Parse module: pip install UE4Parse[tex]git+https://github.com/joric/pyUE4Parse.git
# This was previously: pip install UE4Parse[tex]@git+https://github.com/MinshuG/pyUE4Parse.git
# install dependencies: pip install mathutils aes numpy scikit-learn libpysal

from UE4Parse.Assets.Objects.FGuid import FGuid
from UE4Parse.Provider import DefaultFileProvider, MappingProvider
from UE4Parse.Versions import EUEVersion, VersionContainer
from UE4Parse.Encryption import FAESKey
from mathutils import *
from math import *
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
        'maps': [
            'Crash'
        ],
        'images': [
        ],
    },
    'siu': {
        'path': 'C:/Program Files (x86)/Steam/steamapps/common/Supraland Six Inches Under/SupralandSIU/Content/Paks/',
        'prefix': 'SupralandSIU/Content/FirstPersonBP/Maps/',
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
        ],
        'images': [
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q0',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q1',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q2',
            'SupralandSIU/Content/Blueprints/PlayerMap/Textures/T_SIUMapV7Q3',
        ],
    },
}

marker_types = {
  'PlayerStart','Jumppad_C','Bones_C','Chest_C','BarrelColor_C', 'BarrelRed_C','Battery_C',
  'BP_A3_StrengthQuest_C','Lift1_C', 'DeadHero_C','ExplodingBattery_C', 'GoldBlock_C',
  'GoldNugget_C', 'Jumppillow_C', 'MoonTake_C', 'Plumbus_C','Stone_C', 'ValveCarriable_C',
  'ValveSlot_C', 'Valve_C','MatchBox_C','Shell_C','BarrelClosed_Blueprint_C','MetalBall_C',
  'Supraball_C','Key_C','KeyLock_C','KeycardColor_C','PipeCap_C','Sponge_C','Juicer_C','Seed_C',
  'Anvil_C','Map_C',
  # slc
  'Scrap_C','TalkingSpeaker_C','Sponge_Large_C',
  # siu
  'HealingStation_C','BP_EngagementCup_Base_C','SlumBurningQuest_C','Trash_C',
  'SecretFound_C',
}

starts_with = {
    'Pipesystem','Buy','BP_Buy','BP_Purchase','BP_Unlock', 'Purchase','Upgrade','Button','Smallbutton','Coin',
    'Lighttrigger','LotsOfCoins','EnemySpawn','Destroyable','BP_Pickaxe','Door','Key','ProjectileShooter',
    'MinecraftBrick', # can be MinecraftBrick_C and MinecraftBrickRespawnable_C
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
    'bDoesntRotate', # Coin_C, BigCoin_C
]

actions = {
    'OpenWhenTake','Actor','Actors','ActivateActors','Actor To Move','More Actors to Turn On','ActorsToActivate',
    'Actors to Open','Actors To Enable/Disable','ObjectsToInvert','ActivateThese','Actors to Activate',
    'ActorsToOpen','ObjectsToDestroy','OpenOnDestroy','ActorsToOpenOnOpen','PostTownCelebration_Open','ActionsOnOpen',
    'openWhenPlayerEnters', 'UniqueActorBeginOverlap',
    'Objects', # used by TriggerVolume_C in SL/SLC
}

def camel_to_snake(s):
    if s[-1]=='?': s = s[:-1] + 'Flag'
    if s.startswith('b'): s = 'Is' + s[1:]
    s = s.replace(' ','')
    return ''.join(['_'+c.lower() if c.isupper() else c for c in s]).lstrip('_')

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
            with open(filename, 'w') as f:
                json.dump(package_dict, f, indent=2)

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
                a = ':'.join((area, p['Pipe']['Outer']))
                b = ':'.join((t['AssetPathName'].split('.').pop(),t['SubPathString'].split('.').pop()) if (t:=p.get('otherPipeInOtherLevel')) else (area, p['OtherPipe']['ObjectName']))
                pipes[ a ] = b
                #pipes[ b ] = a # links may be single-sided

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

            data.append({'name':o['Name'], 'type':o['Type'], 'area':area })
            classes_found.add(o['Type'])
            data_lookup[':'.join((area, o['Name'])  )] = data[-1]

            t = matrix.to_translation()
            data[-1].update({'lat': t.y, 'lng': t.x, 'alt': t.z})

            p = o.get('Properties',{})

            for key in properties:
                optKey(data[-1], camel_to_snake(key), p.get(key))

            optKey(data[-1], 'spawns', p.get('Spawnthing',{}).get('ObjectName'))
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
        parse_json(json.load(open(path)), area)

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
    allowed_points = lambda o: o['type'] not in ('Coin_C') # testing
    #allowed_points = lambda o: o['type'] in ('Jumppad_C') # jump pads only

    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    data_indices = [i for i,o in enumerate(data) if allowed_points(o)]

    print('collected', len(points), 'terrain points, calculating targets...')

    if not points:
        return

    tree = KDTree(points)

    for i,o in enumerate(data):
        if o['type'] != 'Jumppad_C':
            continue

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
    'linetype',                                     # Trigger, red/blue pad, pipe
    'startpos',                                     # where to draw lines from (if not lat/lng/alt)
    'target',                                       # where to draw line to for pipes and pads
    'targets',                                      # array of dictionaries 'type' and target position
                                                    # pipe, jumppad_red, jumppad_blue, trigger 
    'image', 'yt_video', 'yt_start', 'yt_end',      # data pulled from matched legacy data
]

# The purpose of this code is to walk through all the objects we've gathered and prepare them for
# display by the map.
#
# classes is a set of all 'type' names
# lookup is a dictionary from area:name to objects
# data is an array of the same objects
# each object is a dictionary of k,v pairs
def cleanup_objects(game, classes_found, data_lookup, data):

    classes = read_game_classes()

    # Make a set of all the classes found that are not in gameClasses.js
    # Write out a file for optional insertion into gameClasses.js
    classes_to_filter = []
    if stripUnusedClasses:
        classes_to_filter = [ k for k in classes_found if k not in classes or classes[k]['layer'] == 'extra' ]
        print(f'Writing {len(classes_to_filter)} gameClasses to "filtered_classes.js"')
        with open('filtered_classes.js', 'w') as fh:
            for c in sorted(classes_to_filter):
                fh.write("    '{:<36}: new GameClass(),\n".format(c))

    def parse_json(j, justdel = False):
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
                    elif not justdel:
                        o[prop] = value
        return count
    
    # Read custom markers and merge them  in
    cfn = f'custom-markers.{game}.json'
    if os.path.isfile(cfn):
        count = parse_json(json.load(open(cfn)))
        print(f'Processed {count} instances read from {cfn}')

    # Walk the remaining instances and fix up entries
    for o in data:
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
                    print(f'Non gold coin containing MinecraftBrick_C:{o['variant']}:{o['coins']}')

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
                o['startpos'] = get_xyz(data_lookup[o['nearest_cap']])
            o['target'] = get_nc_xyz(data_lookup[o['other_pipe']])
        elif o['type'] == 'Jumppad_C':
            if o.get('allow_stomp') or o.get('disable_movement_in_air') == False:
                o['linetype'] = 'jumppad_blue' 
                o['variant'] = 'blue'
            else:
                o['linetype'] = 'jumppad_red' 
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

    create_coinstacks(data_lookup, data)

    # Strip properties we don't need to export
    if stripUnusedProperties:
        for o in data:
            for prop in list(o.keys()):
                if not prop in exported_properties:
                    del o[prop]

    # Remove entries that match the specified set of classes
    # note they still exist in data_lookup if needed (for references)
    if stripUnusedClasses:
        i = len(data)
        print(f'lengths {i} {len(data_lookup.values())}')
        for o in data_lookup.values():
            if o['type'] in classes_to_filter:
                data.remove(o)
        print(f'Removed {i - len(data)} instances of {len(classes_to_filter)} classes')

    # Merge in legacy data but don't override if it already exists
    combine_legacy(game, classes, data)

    # Legacy combine might have added properties custom data says to delete, so re-run but delete only
    cfn = f'custom-markers.{game}.json'
    if os.path.isfile(cfn):
        count = parse_json(json.load(open(cfn)), justdel = True)

    # Merge non-rotating coins together (bDoesntRotate)
    # Add all coins and big coins that have the bDoesntRotate and use this algorithm
    # https://stackoverflow.com/questions/78484486/how-to-group-3d-points-closer-than-a-distance-threshold-in-python/78485350#78485350
    # Remove the coins found and replace with custom coinstack marker

    # Make the filter of Joric classes optional (debug)
    # Make the filter of unused properties optional (debug)
    # *** Update main.js to deal with new data
    # *** check integration of main with Joric code (in MapCompare)


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
        stackId += 1
        if len(cc) > 3:
            coins = 0
            for idx in cc:
                o = data[dataidx[idx]]
                coins += o['coins']
                area = o['area']
                delobj.append(data[dataidx[idx]])
            c = np.r_[points][list(cc)].mean(axis=0)
            stacks.append({
                'name': f'CoinStack{stackId}', 'type': '_CoinStack_C', 'area': area,
                'lat': c[1], 'lng': c[0], 'alt': c[2], 'coins': str(coins)
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

def read_game_classes(fn = '..\\js\\gameClasses.js'):

    print('Reading "'+fn+'"...')

    # Open and read the whole js file if it exists
    if not os.path.exists(fn):
        sys.exit(f'{fn} not found, exiting')

    with open(fn, 'r', encoding='utf-8-sig') as fh:
        gc_txt = fh.read()

    # Find constructor parameters and slice them out
    if not (m := re.search('constructor *?\\( *', gc_txt)):
        sys.exit('Unexpected format: Can\'t find "constructor("')

    # First column is always 'type'
    keys = []
    defaults = []

    # Extract the gameClasses dictionary keys
    next_idx = m.span()[1]
    while True:
        m = re.search(" *([^ ,)]*) *= *(.*?) *([,\\)])", gc_txt[next_idx:], re.M)
        if m is None: sys.exit('Unexpected format: Reading constructor arguments')
        next_idx += m.span()[1]
        keys.append(m.groups()[0])
        defaults.append(m.groups()[1].strip('\'"'))
        if defaults[-1] == 'null': defaults[-1]=None
        if(m.groups()[2]!=','):
            break;

    # Find the initialiser
    m = re.search('gameClasses *= *\\{ *\n', gc_txt[next_idx:], re.S)
    next_idx += m.span()[1]

    class_count = 0
    classes = {}

    # For each line of the initialiser until we hit the closing }
    while gc_txt[next_idx:].lstrip()[0] != '}':
        key = ''
        entry = {}
        i = 0
        while i < len(keys)+1:
            m = re.search('[^\n]*?(?:(null)|["\'](.*?)["\'])[, )]*', gc_txt[next_idx:])
            if m is None or gc_txt[next_idx] == '\n':
                break

            if grp := m.groups()[1]:
                if not key:
                    key = grp
                else:
                    entry[keys[i-1]] = grp
            elif not key:
                sys.exit("Unexpected format: Reading class name")
            else:
                entry[keys[i-1]] = None

            next_idx += m.span()[1]
            i += 1

        while i < len(keys)+1:
            entry[keys[i-1]] = defaults[i-1]
            i += 1

        next_idx += 1
        classes[key]=entry
        class_count += 1



    print(f'Success: {class_count} classes read with {len(keys)} members each')
    return classes


# Read the specified legacy CSV
def read_legacy_csv(game, file):
    filename = '..\\data\\legacy\\{}\\{}.csv'.format(game, file)
    rows = []
    with open(filename, 'r', encoding='utf-8-sig') as csv_fh:
        csv_reader = csv.DictReader(csv_fh, delimiter=',')
        for row in csv_reader:
            rows.append(row)
            rows[-1]['file'] = file;
    return rows

# Go through all the objects we have found and look for match with the objects in the legacy file
# Generates a CSV as a report ({game}-legacycomp.csv)
def combine_legacy(game, classes, data):

    # Specifies which layer classes to check for the file
    filelayers = [
        {'file':'chests',      'types':['coin', 'powerup'],     'nospoiler':'closedChest', 'layer': '-'},
        {'file':'shops',       'types':['powerup'],             'nospoiler':'shop',        'layer': '-'},
        {'file':'collectables','types':['coin'],                'nospoiler':'-',           'layer': 'coin'},
        {'file':'collectables','types':['collectable', 'grave'],'nospoiler':'collectable', 'layer': '-'},
    ]

    print('Reading legacy files...');
    print(f'Writing cross-check report ({game}-legacycomp.csv)')

    suss_count = 0
    suss_dist = 250.0
    longest_d = (0.0, -1)

    with open(game+'-legacycomp.csv', 'w') as fh:

        nkeys = ['area', 'name', 'type', 'spawns', 'coins', 'cost']
        lkeys = ['icon', 'item', 'id', 'price', 'file', 'type']

        # Write CSV header with column names
        fh.write('dist,url,'+','.join(str(k) for k in nkeys+lkeys)+'\n')

        for filelayer in filelayers:
            ldata = read_legacy_csv(game, filelayer['file'])
            ldata = [ lo for lo in ldata if lo['type'] in filelayer['types']]

            if len(ldata) <= 0:
                continue

            # Create a list of the objects that are likely to match with items in this file based on layer
            ndata = []
            for no in data:
                typeid = no['type']
                if typeid in classes:
                    layer = classes[typeid]['layer']
                    nospoiler = classes[typeid]['nospoiler']
                    if layer == filelayer['layer'] or nospoiler == filelayer['nospoiler']: 
                        ndata.append(no)

            # Use KD Tree of extracted object points to query legacy points 
            npt = [(nd['lng'], nd['lat']) for nd in ndata]
            lpt = [(ld['x'],   ld['y'])   for ld in ldata]

            kdtree = KDTree(npt)

            (dist, nidx) = kdtree.query(lpt, k=1)

            for li, da in enumerate(dist):

                # Track longest and shortest distances
                d = da[0]
                if(d > longest_d[0]):
                    longest_d = (d, li)
                if d > suss_dist:
                    suss_count += 1

                lo = ldata[li]
                ni = nidx[li][0]
                no = ndata[ni]

                # lo is a legacy object (with file type added)
                # no is an extracted object

                # Write distance between the points and the url to the new map
                fh.write(f'{d},https://supragamescommunity.github.io/SupraMaps/#mapId={game}&lat={lo['y']}&lng={lo['x']}&zoom=5')

                # Merge in the data from the legacy object we've matched
                for k in ['image', 'ytVideo', 'ytStart', 'ytEnd']:
                    if (v := lo.get(k)):
                        nk = camel_to_snake(k)
                        if not no.get(nk):              # Don't override properties we already set (could be from custom data)
                            no[camel_to_snake(k)] = v

                for k in nkeys:
                    fh.write(f',{no.get(k, '')}')
                for k in lkeys:
                    fh.write(f',{lo.get(k, '')}')
                fh.write('\n')

    print(f'All entries from legacy CSV files checked')
    print(f'Max separation: {longest_d[0]:.4g} Median {np.median(dist):.4g}')
    print(f'Suspcious items {suss_count} (distance > {suss_dist:.4g})')


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
    # Looks for environment variable {game}dir ie %SLDIR% for the path where the game data is stored 

    parser = argparse.ArgumentParser()
    parser.add_argument('-g', '--game', default='siu', help='game name (sl, slc, siu)')
    parser.add_argument('-d', '--cache_dir', default=tempfile.gettempdir(), help='cache directory for temporary files')
    parser.add_argument('-t', '--textures', action='store_true', help='export textures')
    parser.add_argument('-l', '--levels', action='store_true', help='export json levels to cache directory')
    parser.add_argument('-m', '--markers', action='store_true', help='export markers as json (need json levels)')
    args = parser.parse_args()

    try:
        os.mkdir(args.cache_dir)
    except Exception as e:
        pass

    if args.markers:
        export_markers(args.game, args.cache_dir)
    elif args.levels:
        export_levels(args.game, args.cache_dir)
    elif args.textures:
        export_textures(args.game, args.cache_dir)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()

