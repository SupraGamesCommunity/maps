# install UE4Parse module: pip install git+https://github.com/joric/pyUE4Parse.git
# This was previously: pip install UE4Parse[tex]@git+https://github.com/MinshuG/pyUE4Parse.git
# install dependencies: pip install mathutils aes numpy scikit-learn

from UE4Parse.Assets.Objects.FGuid import FGuid
from UE4Parse.Provider import DefaultFileProvider, MappingProvider
from UE4Parse.Versions import EUEVersion, VersionContainer
from UE4Parse.Encryption import FAESKey
from mathutils import *
from math import *
import logging, gc, json, gc, os, sys, csv, argparse, tempfile
import numpy as np
from sklearn.neighbors import KDTree

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
  'BP_A3_StrengthQuest_C', 'BP_BoneDetector_C', 'BP_BuyBeamElasticity_C', 'BP_BuyBoomerAxe_C', 'BP_BuyBoomeraxeDistance_C',
  'BP_BuyBoomeraxePenetration_C', 'BP_BuyBoomeraxeThrowSpeed_C', 'BP_BuyFireGunAutoRecharge_C', 'BP_BuyGunCapacity+3shots_C',
  'BP_BuyGunDamage+100pct_C', 'BP_BuyGunDuration+2s_C', 'BP_BuyGunRechargeTime-50pct_C', 'BP_CookableMeat_C',
  'BP_DoubleHealthLoot_C', 'BP_EngagementCup_Base_C', 'BP_MonsterChest_C', 'BP_PickaxeDamage+1_C', 'BP_PurchaseHealth+1_C',
  'BP_PurchaseJumpHeightPlus_C', 'BP_PurchaseSpeedx2_C', 'BP_Purchase_Crouch_C', 'BP_Purchase_FasterPickaxe_C',
  'BP_Purchase_Pickaxe_Range+_C', 'BP_Purchase_TranslocatorCooldown_C', 'BP_TrophyDetector_C', 'BarrelColor_C', 'BarrelRed_C',
  'Battery_C', 'Bones_C', 'BuyArmor1_C', 'BuyBeltRepel_C', 'BuyBelt_C', 'BuyBelt_DLC2_C', 'BuyBrokenPipeDetector_C',
  'BuyChestDetectorRadius_C', 'BuyChestDetector_C', 'BuyCoinMagnet_C', 'BuyCritChance+5_C', 'BuyCrystal_C', 'BuyDoubleJump_C',
  'BuyElectricGun_C', 'BuyEnemiesLoot_C', 'BuyFireGun_C', 'BuyForceBeamGold_C', 'BuyForceBeam_C', 'BuyForceBlockTelefrag_C',
  'BuyForceBlock_C', 'BuyForceCubeBeam_C', 'BuyForceCubeStompGrave3_C', 'BuyForceCubeStompJump_C', 'BuyForceCubeStomp_C',
  'BuyGraveDetector_C', 'BuyGun1_C', 'BuyGunAltDamagex2_C', 'BuyGunAlt_C', 'BuyGunCoin_C', 'BuyGunComboDamage+25_C',
  'BuyGunCriticalDamageChance_C', 'BuyGunCriticalDamage_C', 'BuyGunDamage+15_C', 'BuyGunDamage+1_C', 'BuyGunDamage+5_C',
  'BuyGunHoly1_C', 'BuyGunHoly2_C', 'BuyGunRefillSpeed+66_C', 'BuyGunRefireRate50_C', 'BuyGunSpeedx2_C', 'BuyGunSplashDamage_C',
  'BuyHealth+15_C', 'BuyHealth+2_C', 'BuyHealth+5_C', 'BuyHealthRegenMax+1_C', 'BuyHealthRegenMax10_C', 'BuyHealthRegenMax15_C',
  'BuyHealthRegenMax5_C', 'BuyHealthRegenSpeed_C', 'BuyHealthRegen_C', 'BuyHeartLuck_C', 'BuyJumpHeightPlus_C', 'BuyJumpIncrease_C',
  'BuyMoreLoot_C', 'BuyNumberRising_C', 'BuyQuintupleJump_C', 'BuyShieldBreaker_C', 'BuyShowHealthbar_C', 'BuyShowProgress_C',
  'BuySilentFeet_C', 'BuySmashdownDamage+100_C', 'BuySmashdownDamage+1_C', 'BuySmashdownDamage+33_C', 'BuySmashdownDamage+3_C',
  'BuySmashdownRadius+5_C', 'BuySmashdownRadius+_C', 'BuySmashdown_C', 'BuySpeedx15_C', 'BuySpeedx2_C', 'BuyStats_C', 'BuySword2_C',
  'BuySwordCriticalDamageChance_C', 'BuySwordCriticalDamage_C', 'BuySwordDamage+02_C', 'BuySwordDamage+1_C', 'BuySwordDamage+3_C',
  'BuySwordDoorKnocker_C', 'BuySwordHoly1_C', 'BuySwordHoly2_C', 'BuySwordRange25_C', 'BuySwordRefireRate-33_C', 'BuySword_C',
  'BuyTranslocatorCoolDownHalf_C', 'BuyTranslocatorDamagex3_C', 'BuyTranslocatorModule_C', 'BuyTranslocatorShotForce_C',
  'BuyTranslocatorWeight_C', 'BuyTranslocator_C', 'BuyTranslocator_Fake_C', 'BuyTripleJump_C', 'BuyUpgradeChestNum_C',
  'BuyUpgradeGraveNum_C', 'BuyWalletx15_C', 'BuyWalletx2_C', 'Chest_C', 'CoinBig_C', 'CoinRed_C', 'Coin_C', 'DeadHero_C',
  'DestroyablePots_C', 'EnemySpawner_C', 'Enemyspawner2_C', 'ExplodingBattery_C', 'GoldBlock_C', 'GoldNugget_C', 'Jumppad_C',
  'Jumppillow_C', 'Key_C', 'KeycardColor_C', 'LotsOfCoins10_C', 'LotsOfCoins15_C', 'LotsOfCoins30_C', 'LotsOfCoins50_C',
  'LotsOfCoins5_C', 'LotsofCoins200_C', 'MinecraftBrick_C', 'MoonTake_C', 'PlayerStart', 'Plumbus_C', 'Purchase_DiamondPickaxe_C',
  'Purchase_ForceBeam_C', 'Purchase_ForceCube_C', 'Purchase_IronPickaxe_C', 'Purchase_StonePickaxe_C', 'Purchase_WoodPickaxe_C',
  'Scrap_C', 'SlumBurningQuest_C', 'SpawnEnemy3_C', 'Stone_C', 'UpgradeHappiness_C', 'ValveCarriable_C', 'ValveSlot_C', 'Valve_C',
  'HealingStation_C','MatchBox_C','EnemySpawn1_C','EnemySpawn2_C','EnemySpawn3_C','PipeCap_C','Lift1_C','PipesystemNew_C',
  'PipesystemNewDLC_C','Shell_C','BarrelClosed_Blueprint_C','MetalBall_C', 'Supraball_C','Trash_C','KeyLock_C',
}

price_types = {
    'EPriceType::NewEnumerator5':'scrap',
    'EPriceType::NewEnumerator6':'bones',
}

PAD_COL_RED = '#FF0000'
PAD_COL_BLUE = '#1E90FF'
PIPE_COL = '#4DFF00'

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
    areas = {}
    pipe_marker_indices = {}

    optKey = lambda d,k,v: v is not None and d.__setitem__(k,v)
    getVec = lambda d,v=0: Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v,v,v))
    getRot = lambda d,v=0: Euler(( radians(d['Roll']), radians(d['Pitch']), radians(d['Yaw'])) ) if d else Euler((v,v,v))
    getQuat= lambda d,v=0: Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v,v,v,v))
    getXYZ = lambda v:{'x':v.x, 'y': v.y, 'z': v.z}

    def parse_json(j, area):
        outer = {}
        pipes = {}
        for o in j:
            p = o.get('Properties',{})
            if a := p.get('WorldAsset',{}).get('AssetPathName'):
                if t := p.get('LevelTransform'):
                    areas[a.split('.').pop()] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

            if 'Outer' in o:
                outer[':'.join((o['Name'],o['Type'],o['Outer']))] = o # pyUE4Parse 5e0e6f0
                outer[':'.join((o['Name'],o['Outer']))] = o # pyUE4Parse 90e309b

            if o['Type'] in ('PipesystemNew_C','PipesystemNewDLC_C') and 'Pipe' in p and ('OtherPipe' in p or 'otherPipeInOtherLevel' in p):
                a = ':'.join((area, p['Pipe']['Outer']))
                b = ':'.join((t['AssetPathName'].split('.').pop(),t['SubPathString'].split('.').pop()) if (t:=p.get('otherPipeInOtherLevel')) else (area, p['OtherPipe']['ObjectName']))
                pipes[ a ] = b
                pipes[ b ] = a

        for o in j:
            if not ((not marker_names or o['Name'] in marker_names) and (not marker_types or o['Type'] in marker_types)):
                continue

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties',{})
                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1)) @ matrix

                for parent in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    node = p.get(parent,{})
                    if ref := node.get('OuterIndex',{}).get('ObjectName'):
                        key = ':'.join((node.get('ObjectName',''),ref))
                        if key in outer:
                            return get_matrix(outer[key], matrix)

                return matrix

            matrix = get_matrix(o)
            if area in areas:
                matrix  = areas[area] @ matrix

            data.append({'name':o['Name'], 'type':o['Type'], 'area':area })
            unique_name = ':'.join((area, o['Name']))

            t = matrix.to_translation()
            data[-1].update({'lat': t.y, 'lng': t.x, 'alt': t.z})

            p = o.get('Properties',{})

            optKey(data[-1], 'spawns', spawns := p.get('Spawnthing',{}).get('ObjectName'))

            optKey(data[-1], 'coins', p.get('Coins'))
            optKey(data[-1], 'coins', p.get('CoinsInGold'))
            optKey(data[-1], 'coins', p.get('Value'))

            # There is at least one chest that doesn't have spawn data but actually spawns Health+1 (SL Chest31_9005)
            # There's also a chest that has coins in it but also has a "spawns" (SIU ChestAreaEnd_78)
            if o['Type'] == 'Chest_C':
                if data[-1].get('spawns') is None:
                    data[-1]['spawns'] = '_BuyHealth+1_C'
                elif data[-1].get('coins') is not None:
                    data[-1].pop('spawns')

            # Get coin count for chests that spawn "LotsOfCouns{#coins}_C" 
            if spawns is not None and spawns.startswith('LotsOfCoins'):
                data[-1]['coins'] = int(spawns[11:-2])

            # Set some default values for coins that don't have one
            if data[-1].get('coins') is None:
                if o['Type'] == "Coin_C":
                    data[-1]['coins]'] = 1;
                if o['Type'] == "CoinBig_C":
                    data[-1]['coins'] = 10;

            # Hack the spawns field so it's easier to add chest to both chests and coins layers
            if o['Type'] == "Chest_C" and spawns is None and data[-1].get('coins') is not None:
                data[-1]['spawns'] = '_CoinChest_C'

            # Not sure if this covers everything that is "buyable"
            optKey(data[-1], 'cost', p.get('Cost'))

            optKey(data[-1], 'hits', hits:= p.get('HitsToBreak'))
            optKey(data[-1], 'price_type', price_types.get(p.get('PriceType')))

            #optKey(data[-1], 'brick_type', p.get('BrickType'))
            optKey(data[-1], 'obsidian', p.get('bObsidian'))

            # We override the class of mine craft bricks that we think spawn gold and set default coins to 3
            if p.get('BrickType') == 'EMinecraftBrickType::NewEnumerator4':
                data[-1]['type'] = '_MinecraftBrickGold_C'
                if data[-1].get('coins') is None:
                    data[-1]['coins'] = 3

            if other_pipe := pipes.get(unique_name):
                optKey(data[-1], 'other_pipe', other_pipe)
                pipe_marker_indices[unique_name] = len(data)-1 
                data[-1]['color'] = PIPE_COL;
            
            if o['Type'] in ('Jumppad_C'):
                optKey(data[-1], 'relative_velocity', p.get('RelativeVelocity'))
                optKey(data[-1], 'velocity', (v:=p.get('Velocity')) and getXYZ(getVec(v)))
                optKey(data[-1], 'allow_stomp', stomp := p.get('AllowStomp'))
                optKey(data[-1], 'disable_movement', disable_move := p.get('DisableMovementInAir'))
                #optKey(data[-1], 'allow_relative_velocity', p.get('RelativeVelocity?'))
                #optKey(data[-1], 'center_actor', p.get('CenterActor'))
                data[-1]['color'] = PAD_COL_BLUE if (stomp == True or disable_move == False) else PAD_COL_RED

                d = Vector((matrix[0][2],matrix[1][2],matrix[2][2]));
                d.normalize()
                data[-1].update({'direction': getXYZ(d)})
                data[-1].update({'target': getXYZ(Vector((0,0,0)))})


    for area in config[game]['maps']:
        path = os.path.join(cache_dir, area + '.json')
        print('loading "%s" ...' % path)
        parse_json(json.load(open(path)), area)

    # Add 'target' value to pipe objects
    for i in pipe_marker_indices.values():
        omi = pipe_marker_indices[data[i]['other_pipe']]
        data[i].update({'target':{'x': data[omi]['lng'], 'y': data[omi]['lat'], 'z': data[omi]['alt']}})

    # Add 'target' value for jump pad objects
    calc_targets(data)

    # Remove unused instance data from export
    for m in data:
        m.pop('direction', None)          # used by 3d map (will break without it but leave it this way as we're not using it)
        m.pop('relative_velocity', None)  # used by 3d map
        m.pop('velocity', None)           # used by 3d map

    print('collected %d markers' % (len(data)))
    json_file = 'markers.' + game + '.json'
    print('writing "%s" ...' % json_file)
    json.dump(data, open(json_file,'w'), indent=2)

def calc_targets(data):
    # calculates target altitude from the jump pad's velocity data
    # builds 3d terrain from selected points (uses jump pad locations by default)
    # traces parabolic path and find z of an intersection with a plane defined by 3 closest points

    #allowed_points = lambda o: True # not recommended, bugs with coins, etc.
    allowed_points = lambda o: o['type'] not in ('Coin_C') # testing
    #allowed_points = lambda o: o['type'] in ('Jumppad_C') # jump pads only

    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    data_indices = [i for i,o in enumerate(data) if allowed_points(o)]

    print('collected', len(points), 'terrain points, calculating targets...')

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

