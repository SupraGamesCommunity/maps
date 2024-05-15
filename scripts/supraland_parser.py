# install UE4Parse module: pip install git+https://github.com/joric/pyUE4Parse.git
# install dependencies: pip install mathutils aes
# see https://github.com/MinshuG/pyUE4Parse/issues/9 about outer nodes
# see https://github.com/MinshuG/pyUE4Parse/issues/20 about python 3.12

from UE4Parse.Assets.Objects.FGuid import FGuid
from UE4Parse.Provider import DefaultFileProvider, MappingProvider
from UE4Parse.Versions import EUEVersion, VersionContainer
from UE4Parse.Encryption import FAESKey
from mathutils import *
from math import *
import logging, gc, json, gc, os, sys, csv, argparse, tempfile

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
  'HealingStation_C','MatchBox_C','EnemySpawn1_C','EnemySpawn2_C','EnemySpawn3_C'
}

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
    assets = {}
    optKey = lambda d,k,v: v and d.__setitem__(k,v)
    getVec = lambda d,v=0: Vector((d['X'], d['Y'], d['Z'])) if d else Vector((v,v,v))
    getRot = lambda d,v=0: Euler(( radians(d['Roll']), radians(d['Pitch']), radians(d['Yaw'])) ) if d else Euler((v,v,v))
    getQuat= lambda d,v=0: Quaternion((d['W'], d['X'], d['Y'], d['Z'])) if d else Quaternion((v,v,v,v))

    def parse_json(j, area):
        outer = {}
        for o in j:
            if 'Outer' in o:
                outer[':'.join((o['Name'],o['Type'],o['Outer']))] = o # pyUE4Parse 5e0e6f0
                outer[':'.join((o['Name'],o['Outer']))] = o # pyUE4Parse 90e309b

        for i, o in enumerate(j):
            prop = o.get('Properties',{})
            if asset:=prop.get('WorldAsset',{}).get('AssetPathName'):
                asset = asset.split('.').pop()
                t = prop.get('LevelTransform',{})
                assets[asset] = Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()

            if not ((not marker_names or o['Name'] in marker_names) and (not marker_types or o['Type'] in marker_types)):
                continue

            data.append({'name':o['Name'], 'type':o['Type'], 'area':area })
            optKey(data[-1], 'coins', prop.get('Coins',0))
            optKey(data[-1], 'coins', prop.get('CoinsInGold',0))
            optKey(data[-1], 'cost', prop.get('Cost',0))
            optKey(data[-1], 'spawns', prop.get('Spawnthing',{}).get('ObjectName'))
            optKey(data[-1], 'hits', prop.get('HitsToBreak',0))
            optKey(data[-1], 'obsidian', prop.get('bObsidian',0))

            vector = Vector((0,0,0))

            def f(r, k=''):
                nonlocal vector
                p = r.get('Properties',{})

                if p.get('RelativeLocation'):
                    matrix = Matrix.LocRotScale(getVec(p.get('RelativeLocation')), getRot(p.get('RelativeRotation')), getVec(p.get('RelativeScale3D'), 1))
                    vector = matrix @ vector

                for parent in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    node = p.get(parent,{})
                    if ref := node.get('OuterIndex',{}).get('ObjectName'):
                        key = ':'.join( ( node.get('ObjectName',''), ref ) )
                        if key in outer:
                            return f( outer[key], key )
            f(o)

            if area in assets:
                vector = assets[area] @ vector

            data[-1].update({'lat': vector.y, 'lng': vector.x, 'alt': vector.z})

    for area in config[game]['maps']:
        path = os.path.join(cache_dir, area + '.json')
        print('loading "%s" ...' % path)
        parse_json(json.load(open(path)), area)

    print('collected %d markers' % (len(data)))
    json_file = 'markers.' + game + '.json'
    print('writing "%s" ...' % json_file)
    json.dump(data, open(json_file,'w'), indent=2)

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

