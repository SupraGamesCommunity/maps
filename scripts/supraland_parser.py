# (c) 2022-2024 Joric, https://github.com/joric/supraland
# install UE4Parse module: pip install git+https://github.com/joric/pyUE4Parse.git
# install dependencies: pip install mathutils aes
# see wiki for more info https://github.com/joric/supraland/wiki

from UE4Parse.Assets.Objects.FGuid import FGuid
from UE4Parse.Provider import DefaultFileProvider, MappingProvider
from UE4Parse.Versions import EUEVersion, VersionContainer
from UE4Parse.Encryption import FAESKey
from mathutils import *
from math import *
import logging, gc, json, gc, os, sys, csv, argparse, tempfile
import numpy as np
from sklearn.neighbors import KDTree # pip install scikit-learn

config = {
    'sl': {
        'path': 'E:/Games/Supraland/Supraland/Content/Paks',
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
        'path': 'E:/Games/Supraland/Supraland/Content/Paks',
        'prefix': 'Supraland/Content/FirstPersonBP/Maps/',
        'maps': [
            'Crash'
        ],
        'images': [
        ],
    },
    'siu': {
        'path': 'E:/Games/Supraland - Six Inches Under/SupralandSIU/Content/Paks',
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
  'Anvil_C','Map_C','NomNomFlies_C','CarrotPhysical_C','RingColorer_C','RespawnActor_C',
  'CarryStones_Heavy_C','CarryStones_C','Crystal_C','RingRusty_C',
  # slc
  'Scrap_C','TalkingSpeaker_C','Sponge_Large_C',
  # siu
  'HealingStation_C','BP_EngagementCup_Base_C','SlumBurningQuest_C','Trash_C',
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
    path = config[game]['path']
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
    areas = {}

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
                ((not marker_names or o['Name'] in marker_names) and (not marker_types or o['Type'] in marker_types))
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
                        o['Type'] = 'Purchase_StonePickaxe_C';

            data.append({'name':o['Name'], 'type':o['Type'], 'area':area })

            t = matrix.to_translation()
            data[-1].update({'lat': t.y, 'lng': t.x, 'alt': t.z})

            p = o.get('Properties',{})

            for key in properties:
                optKey(data[-1], camel_to_snake(key), p.get(key))

            optKey(data[-1], 'spawns', p.get('Spawnthing',{}).get('ObjectName'))
            optKey(data[-1], 'other_pipe', pipes.get(':'.join((area,o['Name']))))
            optKey(data[-1], 'custom_color', optColor(p.get('CustomColor')))
            optKey(data[-1], 'spawns', p.get('Class',{}).get('ObjectName'))

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
        if o['type'] not in ('PipesystemNew_C','PipesystemNewDLC_C'):
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

def export_textures(game, cache_dir):
    path = config[game]['path']
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

