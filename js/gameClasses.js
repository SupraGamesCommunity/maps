// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

// Note: supraland_parser.py extracts the data from this file, so format is somewhat important
// In particular, it requires all constructor arguments to have default values.
class GameClass {
    constructor(icon = 'question_mark', layer = 'extra', nospoiler = null, lines = 'extra') {
        this.icon = icon;               // Icon used to represent instances on the map
        this.layer = layer;             // Which layer these instances should be put on
        this.nospoiler = nospoiler;     // Which no spoiler layer should these instances be put on
        this.lines = lines;             // If this object has lines then the layer to put them on (otherwise null)
    }
}

/* exported defaultGameClass */
// Defines what happens for an unrecognised class
const defaultGameClass =                  new GameClass();

/* exported disableGameClass */
// Value used for diabled game class
const disableGameClass =                  new GameClass(null, null, null, null,)

/* exported gameClasses */
const gameClasses = {
    'BP_A3_StrengthQuest_C'              : new GameClass('strong',                   'upgrades',    'shop'),
    'BP_BoneDetector_C'                  : new GameClass('loot',                     'upgrades',    'shop'),
    'BP_BuyBeamElasticity_C'             : new GameClass(null,                       'upgrades',    'shop'),
    'BP_BuyBoomerAxe_C'                  : new GameClass(null,                       'upgrades',    'shop'),
    'BP_BuyBoomeraxeDistance_C'          : new GameClass('boomeraxe_throw_distance', 'upgrades',    'shop'),
    'BP_BuyBoomeraxePenetration_C'       : new GameClass('boomeraxe_penetration',    'upgrades',    'shop'),
    'BP_BuyBoomeraxeThrowSpeed_C'        : new GameClass('boomeraxe_speed',          'upgrades',    'shop'),
    'BP_BuyFireGunAutoRecharge_C'        : new GameClass('firegun_refill',           'upgrades',    'shop'),
    'BP_BuyGunCapacity+3shots_C'         : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BP_BuyGunDamage+100pct_C'           : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BP_BuyGunDuration+2s_C'             : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BP_BuyGunRechargeTime-50pct_C'      : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BP_CookableMeat_C'                  : new GameClass('meat',                     'extra'),
    'BP_DoubleHealthLoot_C'              : new GameClass('health',                   'upgrades',    'shop'),
    'BP_EngagementCup_Base_C'            : new GameClass('trophy',                   'misc',        'collectable'),
    'BP_MonsterChest_C'                  : new GameClass('chest',                    null,          'closedChest'),
    'BP_PickaxeDamage+1_C'               : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BP_PurchaseHealth+1_C'              : new GameClass('health',                   'upgrades',    'shop'),
    'BP_PurchaseJumpHeightPlus_C'        : new GameClass('double_jump',              'upgrades',    'shop'),
    'BP_PurchaseSpeedx2_C'               : new GameClass('speed',                    'upgrades',    'shop'),
    'BP_Purchase_Crouch_C'               : new GameClass(null,                       'upgrades',    'shop'),
    'BP_Purchase_FasterPickaxe_C'        : new GameClass('boomeraxe_range',          'upgrades',    'shop'),
    'BP_Purchase_Pickaxe_Range+_C'       : new GameClass('boomeraxe_range',          'upgrades',    'shop'),
    'BP_Purchase_TranslocatorCooldown_C' : new GameClass('translocator_cooldown',    'upgrades',    'shop'),
    'BP_TrophyDetector_C'                : new GameClass(null,                       'upgrades',    'shop'),
    'BarrelColor_C'                      : new GameClass('barrel_gold',              'misc',        'collectable'),
    'BarrelRed_C'                        : new GameClass('barrel_red',               'misc',        'collectable'),
    'BarrelClosed_Blueprint_C'           : new GameClass('barrel_gold',              'misc',        'collectable'),
    'Bones_C'                            : new GameClass('bones',                    'misc',        'collectable'),
    'BuyArmor1_C'                        : new GameClass('armor',                    'upgrades',    'shop'),
    'BuyBeltRepel_C'                     : new GameClass('belt',                     'upgrades',    'shop'),
    'BuyBelt_C'                          : new GameClass('belt',                     'upgrades',    'shop'),
    'BuyBelt_DLC2_C'                     : new GameClass('belt',                     'upgrades',    'shop'),
    'BuyBrokenPipeDetector_C'            : new GameClass('pipe_detector',            'upgrades',    'shop'),
    'BuyChestDetectorRadius_C'           : new GameClass(null,                       'upgrades',    'shop'),
    'BuyChestDetector_C'                 : new GameClass('see_chest_count',          'upgrades',    'shop'),
    'BuyCoinMagnet_C'                    : new GameClass(null,                       'upgrades',    'shop'),
    'BuyCritChance+5_C'                  : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyCrystal_C'                       : new GameClass('moon_red',                 'misc',        'collectable'),
    'BuyDoubleJump_C'                    : new GameClass('double_jump',              'upgrades',    'shop'),
    'BuyElectricGun_C'                   : new GameClass('gun_electro',              'upgrades',    'shop'),
    'BuyEnemiesLoot_C'                   : new GameClass(null,                       'upgrades',    'shop'),
    'BuyFireGun_C'                       : new GameClass('gun_fire',                 'upgrades',    'shop'),
    'BuyForceBeamGold_C'                 : new GameClass('force_beam_upgrade',       'upgrades',    'shop'),
    'BuyForceBeam_C'                     : new GameClass('force_beam_upgrade',       'upgrades',    'shop'),
    'BuyForceBlockTelefrag_C'            : new GameClass('force_cube',               'upgrades',    'shop'),
    'BuyForceBlock_C'                    : new GameClass('force_cube',               'upgrades',    'shop'),
    'BuyForceCubeBeam_C'                 : new GameClass('force_beam_upgrade',       'upgrades',    'shop'),
    'BuyForceCubeStompGrave3_C'          : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuyForceCubeStompJump_C'            : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuyForceCubeStomp_C'                : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuyGraveDetector_C'                 : new GameClass(null,                       'upgrades',    'shop'),
    'BuyGun1_C'                          : new GameClass('gun_red',                  'upgrades',    'shop'),
    'BuyGunAltDamagex2_C'                : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunAlt_C'                        : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunCoin_C'                       : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunComboDamage+25_C'             : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunCriticalDamageChance_C'       : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunCriticalDamage_C'             : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunDamage+15_C'                  : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunDamage+1_C'                   : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunDamage+5_C'                   : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyGunHoly1_C'                      : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunHoly2_C'                      : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunRefillSpeed+66_C'             : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunRefireRate50_C'               : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunSpeedx2_C'                    : new GameClass('gun_upgrade',              'upgrades',    'shop'),
    'BuyGunSplashDamage_C'               : new GameClass('gun_damage',               'upgrades',    'shop'),
    'BuyHealth+15_C'                     : new GameClass('health',                   'upgrades',    'shop'),
    'BuyHealth+2_C'                      : new GameClass('health',                   'upgrades',    'shop'),
    'BuyHealth+5_C'                      : new GameClass('health',                   'upgrades',    'shop'),
    'BuyHealthRegenMax+1_C'              : new GameClass('health_regen_max',         'upgrades',    'shop'),
    'BuyHealthRegenMax10_C'              : new GameClass('health_regen_max',         'upgrades',    'shop'),
    'BuyHealthRegenMax15_C'              : new GameClass('health_regen_max',         'upgrades',    'shop'),
    'BuyHealthRegenMax5_C'               : new GameClass('health_regen_max',         'upgrades',    'shop'),
    'BuyHealthRegenSpeed_C'              : new GameClass('health_regen_speed',       'upgrades',    'shop'),
    'BuyHealthRegen_C'                   : new GameClass('health_regen',             'upgrades',    'shop'),
    'BuyHeartLuck_C'                     : new GameClass('health',                   'upgrades',    'shop'),
    'BuyJumpHeightPlus_C'                : new GameClass(null,                       'upgrades',    'shop'),
    'BuyJumpIncrease_C'                  : new GameClass('double_jump',              'upgrades',    'shop'),
    'BuyMoreLoot_C'                      : new GameClass(null,                       'upgrades',    'shop'),
    'BuyNumberRising_C'                  : new GameClass(null,                       'upgrades',    'shop'),
    'BuyQuintupleJump_C'                 : new GameClass('triple_jump',              'upgrades',    'shop'),
    'BuyShieldBreaker_C'                 : new GameClass('shield_breaker',           'upgrades',    'shop'),
    'BuyShowHealthbar_C'                 : new GameClass('see_enemy_health',         'upgrades',    'shop'),
    'BuyShowProgress_C'                  : new GameClass(null,                       'upgrades',    'shop'),
    'BuySilentFeet_C'                    : new GameClass('silent_shoes',             'upgrades',    'shop'),
    'BuySmashdownDamage+100_C'           : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdownDamage+1_C'             : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdownDamage+33_C'            : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdownDamage+3_C'             : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdownRadius+5_C'             : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdownRadius+_C'              : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySmashdown_C'                     : new GameClass('stomp_damage',             'upgrades',    'shop'),
    'BuySpeedx15_C'                      : new GameClass('speed',                    'upgrades',    'shop'),
    'BuySpeedx2_C'                       : new GameClass('speed',                    'upgrades',    'shop'),
    'BuyStats_C'                         : new GameClass('awesome',                  'upgrades',    'shop'),
    'BuySword2_C'                        : new GameClass('sword',                    'upgrades',    'shop'),
    'BuySwordCriticalDamageChance_C'     : new GameClass('sword_critical',           'upgrades',    'shop'),
    'BuySwordCriticalDamage_C'           : new GameClass('sword_critical',           'upgrades',    'shop'),
    'BuySwordDamage+02_C'                : new GameClass('sword_damage',             'upgrades',    'shop'),
    'BuySwordDamage+1_C'                 : new GameClass('sword_damage',             'upgrades',    'shop'),
    'BuySwordDamage+3_C'                 : new GameClass('sword_damage',             'upgrades',    'shop'),
    'BuySwordDoorKnocker_C'              : new GameClass('sword',                    'upgrades',    'shop'),
    'BuySwordHoly1_C'                    : new GameClass('sword_holy',               'upgrades',    'shop'),
    'BuySwordHoly2_C'                    : new GameClass('sword_holy',               'upgrades',    'shop'),
    'BuySwordRange25_C'                  : new GameClass(null,                       'upgrades',    'shop'),
    'BuySwordRefireRate-33_C'            : new GameClass(null,                       'upgrades',    'shop'),
    'BuySword_C'                         : new GameClass('sword',                    'upgrades',    'shop'),
    'BuyTranslocatorCoolDownHalf_C'      : new GameClass('translocator_cooldown',    'upgrades',    'shop'),
    'BuyTranslocatorDamagex3_C'          : new GameClass('translocator_damage',      'upgrades',    'shop'),
    'BuyTranslocatorModule_C'            : new GameClass(null,                       'upgrades',    'shop'),
    'BuyTranslocatorShotForce_C'         : new GameClass('translocator_distance',    'upgrades',    'shop'),
    'BuyTranslocatorWeight_C'            : new GameClass(null,                       'upgrades',    'shop'),
    'BuyTranslocator_C'                  : new GameClass('translocator',             'upgrades',    'shop'),
    'BuyTranslocator_Fake_C'             : new GameClass(null,                       'upgrades',    'shop'),
    'BuyTripleJump_C'                    : new GameClass('triple_jump',              'upgrades',    'shop'),
    'BuyUpgradeChestNum_C'               : new GameClass(null,                       'upgrades',    'shop'),
    'BuyUpgradeGraveNum_C'               : new GameClass(null,                       'upgrades',    'shop'),
    'BuyWalletx15_C'                     : new GameClass(null,                       'upgrades',    'shop'),
    'BuyWalletx2_C'                      : new GameClass(null,                       'upgrades',    'shop'),
    'Chest_C'                            : new GameClass('chest',                    null,          'closedChest'),
    'CoinBig_C'                          : new GameClass('coin:32',                  'coin'),
    'CoinRed_C'                          : new GameClass('coinRed',                  'misc',        'collectable'),
    'Coin_C'                             : new GameClass('coin:16',                  'coin'),
    '_CoinStack_C'                       : new GameClass('coinStash2',               'coin'),
    'Coin:DestroyablePots_C'             : new GameClass('pots',                     'coin'),
    'GoldBlock_C'                        : disableGameClass,
    'GoldNugget_C'                       : disableGameClass,
    'Jumppad_C'                          : new GameClass('jumppad',                  null,          null,           'jumppads'),
    'Jumppillow_C'                       : disableGameClass,
    'LotsOfCoins1_C'                     : new GameClass('chest_coin',               'coin'),
    'LotsOfCoins10_C'                    : new GameClass('chest_coin',               'coin'),
    'LotsOfCoins15_C'                    : new GameClass('chest_coin',               'coin'),
    'LotsOfCoins30_C'                    : new GameClass('chest_coin',               'coin'),
    'LotsOfCoins50_C'                    : new GameClass('chest_coin',               'coin'),
    'LotsOfCoins5_C'                     : new GameClass('chest_coin',               'coin'),
    'LotsofCoins200_C'                   : new GameClass('chest_coin',               'coin'),
    'Coin:Chest_C'                       : new GameClass('chest_coin',               'coin',        'closedChest'),
    'Coin:MinecraftBrick_C'              : new GameClass('brick:v',                    'coin'),
    'MoonTake_C'                         : new GameClass('moon_green',               'misc',        'collectable'),
    'PlayerStart'                        : new GameClass('awesome',                  'extra'),
    '_PlayerPosition'                    : new GameClass('player:v48',               null),
    'Plumbus_C'                          : new GameClass('plumbus',                  'extra'),
    'Purchase_DiamondPickaxe_C'          : new GameClass('pickaxe_diamond',          'upgrades',    'shop'),
    'Purchase_ForceBeam_C'               : new GameClass('beam',                     'upgrades',    'shop'),
    'Purchase_ForceCube_C'               : new GameClass('force_cube',               'upgrades',    'shop'),
    'Purchase_IronPickaxe_C'             : new GameClass('pickaxe_metal',            'upgrades',    'shop'),
    'Purchase_StonePickaxe_C'            : new GameClass('pickaxe_stone',            'upgrades',    'shop'),
    'Purchase_WoodPickaxe_C'             : new GameClass('pickaxe_wood',             'upgrades',    'shop'),
    'Purchase_SlumHouse1_C'              : new GameClass('awesome',                  'upgrades',    'shop'),
    'Scrap_C'                            : new GameClass('scrap',                    'misc',        'collectable'),
    'SlumBurningQuest_C'                 : new GameClass('shop',                     'upgrades',    'shop'),
    'SpawnEnemy3_C'                      : new GameClass(null,                       'extra'),
    'Stone_C'                            : new GameClass(null,                       'extra'),
    'UpgradeHappiness_C'                 : new GameClass('happiness',                'upgrades',    'shop'),
    'ValveCarriable_C'                   : new GameClass('valve',                    'misc',        'collectable'),
    'ValveSlot_C'                        : new GameClass('valve',                    'extra'),
    'Valve_C'                            : new GameClass('valve',                    'extra'),
    'HealingStation_C'                   : new GameClass('supradoh',                 'extra'),
    'EnemySpawn1_C'                      : new GameClass('grave_wood',               'graves'),
    'EnemySpawn2_C'                      : new GameClass('grave_stone',              'graves'),
    'EnemySpawn3_C'                      : new GameClass('grave_volcano',            'graves'),
    'Shell_C'                            : new GameClass('shell',                    'misc',        'collectable'),
    'DeadHero_C'                         : new GameClass('hero:v',                   'misc',        'collectable'),
    'EnemySpawner_C'                     : disableGameClass,
    'Enemyspawner2_C'                    : disableGameClass,
    'Juicer_C'                           : new GameClass('bucket:v',                 'upgrades',    'shop'),
    'Lever_C'                            : new GameClass('lever',                    'extra'),
    'Button_C'                           : new GameClass('button',                   'extra'),
    'ButtonFloor_C'                      : new GameClass('button_floor',             'extra'),
    'PedestalButton_C'                   : new GameClass('button_pedestal',          'extra'),
    'BallButton_C'                       : new GameClass('button_ball',              'extra'),
    'BigButton_C'                        : new GameClass('button_big',               'extra'),
    'BigButton2_C'                       : new GameClass('button_big',               'extra'),
    'BigButton2Once_C'                   : new GameClass('button_big',               'extra'),
    'BigButtonWeight_C'                  : new GameClass('button_big',               'extra'),
    'Smallbutton_C'                      : new GameClass('button',                   'extra'),
    'Smallbutton2_C'                     : new GameClass('button',                   'extra'),
    'SmallbuttonNINE_C'                  : new GameClass('button',                   'extra'),
    'SmallbuttonQuickOnoff_C'            : new GameClass('button',                   'extra'),
    'SmallbuttonOpenClose_C'             : new GameClass('button',                   'extra'),
    'SmallbuttonMultipleActors_C'        : new GameClass('button',                   'extra'),
    'SmallbuttonOnceMultipleActors_C'    : new GameClass('button',                   'extra'),
    'SmallbuttonWhile_C'                 : new GameClass('button',                   'extra'),
    'SmallbuttonFlipFlop_C'              : new GameClass('button',                   'extra'),
    'Door_C'                             : new GameClass('door',                     'extra'),
    'Door2_C'                            : new GameClass('door',                     'extra'),
    'Door3_C'                            : new GameClass('door',                     'extra'),
    'DoorAnna_C'                         : new GameClass('door',                     'extra'),
    'DoorStone_C'                        : new GameClass('door',                     'extra'),
    'JailDoor_C'                         : new GameClass('door',                     'extra'),
    'DoorLego_C'                         : new GameClass('door',                     'extra'),
    'DoorInverted_C'                     : new GameClass('door',                     'extra'),
    'DoorPhysical_C'                     : new GameClass('door',                     'extra'),
    'BP_ElevatorDoor_C'                  : new GameClass('door',                     'extra'),
    'BP_Fix_A4_CombatArenaDoor_C'        : new GameClass('door',                     'extra'),
    'SwingingDoor_C'                     : new GameClass('door',                     'extra'),
    'SwingingDoorResetVolume_C'          : new GameClass('door',                     'extra'),
    'Battery_C'                          : new GameClass('battery',                  'extra'),
    'ExplodingBattery_C'                 : new GameClass('battery',                  'extra'),
    'Key_C'                              : new GameClass('key',                      'extra'),
    'KeyLock_C'                          : new GameClass('lock',                     'extra'),
    'KeyPlastic_C'                       : new GameClass('key_plastic',              'extra'),
    'KeyLockPlastic_C'                   : new GameClass('lock_plastic',             'extra'),
    'TalkingSpeaker_C'                   : new GameClass('speaker',                  'extra'),
    'KeycardColor_C'                     : new GameClass('keycard:v',                'extra'),
    'KeycardReader_C'                    : new GameClass('keycard_reader',           'extra'),
    'MetalBall_C'                        : new GameClass('metal_ball',               'extra'),
    'Anvil_C'                            : new GameClass('anvil',                    'extra'),
    'Lift1_C'                            : new GameClass('lift',                     'extra'),
    'Sponge_C'                           : new GameClass('sponge',                   'extra'),
    'SpongeBig_C'                        : new GameClass('sponge',                   'extra'),
    'Sponge_Large_C'                     : new GameClass('sponge',                   'extra'),
    'Supraball_C'                        : new GameClass('supraball',                'extra'),
    'Seed_C'                             : new GameClass('seed:v',                   'extra'),
    'RingColorerFlower_C'                : new GameClass('flower:v',                 'extra'),
    'Trash_C'                            : new GameClass('trash',                    'extra'),
    'MatchBox_C'                         : new GameClass('matchbox',                 'extra'),
    'PhysicalCoin_C'                     : new GameClass('coin',                     'coin'),
    'RedGuy_C'                           : new GameClass('guy:v',                    'extra'),
    'BP_UnlockMap_C'                     : new GameClass('map',                      'upgrades',    'shop'),
    'MinecraftBrick_C'                   : new GameClass('brick:v',                  'extra'),
    'MinecraftBrickRespawnable_C'        : new GameClass('brick:v',                  'extra'),
    'SecretFound_C'                      : new GameClass(null,                       'extra'),
    'SnappyPipe'                         : new GameClass('pipe',                     'extra'),
    'CarryPipe_C'                        : new GameClass('pipe',                     'extra'),
    'PipeCap_C'                          : new GameClass('pipe_cap',                 'extra'),
    'Pipesystem_C'                       : new GameClass('pipe',                     null,        null,           'pipesys'),
    'PipesystemNew_C'                    : new GameClass('pipe',                     null,        null,           'pipesys'),
    'PipesystemNewDLC_C'                 : new GameClass('pipe',                     null,        null,           'pipesys'),
    'TriggerVolume_C'                    : new GameClass('trigger_volume',           'extra'),
    'BP_TriggerVolume_C'                 : new GameClass('trigger_volume',           'extra'),
    'Lighttrigger_C'                     : new GameClass('trigger_light',           'extra'),
    'Lighttrigger2_C'                    : new GameClass('trigger_light',           'extra'),
}

// Returns the [icon, size] based on the decorated icon name plus a variant if supplied
/* exported decodeIconName */
function decodeIconName(icon, variant = null) {
    let size = 32
    let ci = icon.indexOf(':');
    if(ci >= 0) {
        let flags = icon.substring(ci+1);
        icon = icon.substring(0, ci);

        if(variant && flags.indexOf('v') >= 0)
            icon += '_'+variant;
        let n = flags.replace(/[^0-9]/g,"");
        if(n)
            size = Number(n);
    }
    return [icon, size];
}

// Returns the [icon, size] for the given class. If variant is not supplied it
// is treated as null.
/* exported getClassIcon */
function getClassIcon(cls, variant = null)
{
    return decodeIconName(cls.icon ? cls.icon : 'question_mark', variant)
}

// Returns [icon, size] for the given object. If variant not supplied its taken
// from the object.
/* exported getObjectIcon */
function getObjectIcon(object, variant = null)
{
    variant = variant ? variant : object.variant;
    if(object.icon)
        return decodeIconName(object.icon, variant);
    else
        return getClassIcon(object.type, variant)    
}
