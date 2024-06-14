// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

// Note: supraland_parser.py extracts the data from this file, so format is somewhat important
// In particular, it requires all constructor arguments to have default values.
class GameClass {
    constructor(friendly = null, icon = 'question_mark', layer = 'extra', nospoiler = null, lines = 'extra') {
        this.friendly = friendly;       // Friend name for the class
        this.icon = icon;               // Icon used to represent instances on the map
        this.layer = layer;             // Which layer these instances should be put on
        this.nospoiler = nospoiler;     // Which no spoiler layer should these instances be put on
        this.lines = lines;             // If this object has lines then the layer to put them on (otherwise null)
    }
}

/* exported defaultGameClass */
// Defines what happens for an unrecognised class
const defaultGameClass =                  new GameClass();

/* exported gameClasses */
const gameClasses = {
    'BP_A3_StrengthQuest_C'                   : new GameClass('Strength',                         'strong',                   'upgrades', 'shop'),
    'BP_BoneDetector_C'                       : new GameClass('Bone Detector',                    'loot',                     'upgrades', 'shop'),
    'BP_BuyBeamElasticity_C'                  : new GameClass('Beam Elasticity',                  'force_beam_upgrade',       'upgrades', 'shop'),
    'BP_BuyBoomerAxe_C'                       : new GameClass('Throw Pickaxe',                    'boomeraxe_speed',          'upgrades', 'shop'),
    'BP_BuyBoomeraxeDistance_C'               : new GameClass('Thrown Distance +',                'boomeraxe_throw_distance', 'upgrades', 'shop'),
    'BP_BuyBoomeraxePenetration_C'            : new GameClass('Thrown Penetration +',             'boomeraxe_penetration',    'upgrades', 'shop'),
    'BP_BuyBoomeraxeThrowSpeed_C'             : new GameClass('Throw Speed +',                    'boomeraxe_speed',          'upgrades', 'shop'),
    'BP_BuyFireGunAutoRecharge_C'             : new GameClass('Firegun Automatic Refill',         'firegun_refill',           'upgrades', 'shop'),
    'BP_BuyGunCapacity+3shots_C'              : new GameClass('Ammo Capacity+',                   'gun_upgrade',              'upgrades', 'shop'),
    'BP_BuyGunDamage+100pct_C'                : new GameClass('Gun Damage +100%',                 'gun_damage',               'upgrades', 'shop'),
    'BP_BuyGunDuration+2s_C'                  : new GameClass('Stun duration + 2',                'loot',                     'upgrades', 'shop'),
    'BP_BuyGunRechargeTime-50pct_C'           : new GameClass('Reload time -50%',                 'loot',                     'upgrades', 'shop'),
    'BP_CookableMeat_C'                       : new GameClass('Cookable Meat',                    'meat',                     'extra'),
    'BP_DoubleHealthLoot_C'                   : new GameClass('Double Healing Drops',             'health',                   'upgrades', 'shop'),
    'BP_EngagementCup_Base_C'                 : new GameClass('Engagement Trophy',                'trophy',                   'misc',     'collectable'),
    'BP_MonsterChest_C'                       : new GameClass('Monster Chest',                    'chest',                    null,       'closedChest'),
    'BP_PickaxeDamage+1_C'                    : new GameClass('Pickaxe Damage +1',                'sword_damage',             'upgrades', 'shop'),
    'BP_PurchaseHealth+1_C'                   : new GameClass('Max Health +1',                    'health',                   'upgrades', 'shop'),
    'BP_PurchaseJumpHeightPlus_C'             : new GameClass('Jump Height +',                    'stomp_damage',             'upgrades', 'shop'),
    'BP_PurchaseSpeedx2_C'                    : new GameClass('Speed x2',                         'speed',                    'upgrades', 'shop'),
    'BP_Purchase_Crouch_C'                    : new GameClass('Knee Bending',                     'loot',                     'upgrades', 'shop'),
    'BP_Purchase_FasterPickaxe_C'             : new GameClass('Pickaxe Cooldown-',                'pickaxe_cooldown',         'upgrades', 'shop'),
    'BP_Purchase_Pickaxe_Range+_C'            : new GameClass('Pickaxe Swing Range +',            'boomeraxe_range',          'upgrades', 'shop'),
    'BP_Purchase_TranslocatorCooldown_C'      : new GameClass('Translocator Cooldown',            'translocator_cooldown',    'upgrades', 'shop'),
    'BP_TrophyDetector_C'                     : new GameClass('Trophy Detector',                  'loot',                     'upgrades', 'shop'),
    'BarrelColor_C'                           : new GameClass('Gold Barrel',                      'barrel_gold',              'misc',     'collectable'),
    'BarrelRed_C'                             : new GameClass('Red Barrel',                       'barrel_red',               'misc',     'collectable'),
    'BarrelClosed_Blueprint_C'                : new GameClass('Gold Barrel',                      'barrel_gold',              'misc',     'collectable'),
    'Bones_C'                                 : new GameClass('Bones',                            'bones',                    'misc',     'collectable'),
    'BuyArmor1_C'                             : new GameClass('Armor',                            'armor',                    'upgrades', 'shop'),
    'BuyBeltRepel_C'                          : new GameClass('Magnet Repel',                     'belt',                     'upgrades', 'shop'),
    'BuyBelt_C'                               : new GameClass('Float Buckle',                     'belt',                     'upgrades', 'shop'),
    'BuyBelt_DLC2_C'                          : new GameClass('Float Buckle',                     'belt',                     'upgrades', 'shop'),
    'BuyBrokenPipeDetector_C'                 : new GameClass('Blocked Pipe Detector',            'pipe_detector',            'upgrades', 'shop'),
    'BuyChestDetectorRadius_C'                : new GameClass('Chest Detector Radius x2',         'see_chest_count',          'upgrades', 'shop'),
    'BuyChestDetector_C'                      : new GameClass('Chest Detector',                   'see_chest_count',          'upgrades', 'shop'),
    'BuyCoinMagnet_C'                         : new GameClass('Coin Magnet',                      'loot',                     'upgrades', 'shop'),
    'BuyCritChance+5_C'                       : new GameClass('Crit Chance +5%',                  'sword_damage',            'upgrades', 'shop'),
    'BuyCrystal_C'                            : new GameClass('Red Moon',                         'moon_red',                 'misc',     'collectable'),
    'BuyDoubleJump_C'                         : new GameClass('Double Jump',                      'double_jump',              'upgrades', 'shop'),
    'BuyElectricGun_C'                        : new GameClass('Portable Tesla Coil',              'gun_electro',              'upgrades', 'shop'),
    'BuyEnemiesLoot_C'                        : new GameClass('Loot',                             'loot',                     'upgrades', 'shop'),
    'BuyFireGun_C'                            : new GameClass('Fire Redistributer',               'gun_fire',                 'upgrades', 'shop'),
    'BuyForceBeamGold_C'                      : new GameClass('Force Beam Gold Module',           'force_beam_upgrade',       'upgrades', 'shop'),
    'BuyForceBeam_C'                          : new GameClass('Force Beam',                       'beam',                     'upgrades', 'shop'),
    'BuyForceBlockTelefrag_C'                 : new GameClass('Force Cube Telefrag',              'force_cube',               'upgrades', 'shop'),
    'BuyForceBlock_C'                         : new GameClass('Force Cube',                       'force_cube',               'upgrades', 'shop'),
    'BuyForceCubeBeam_C'                      : new GameClass('Force Beam/Cube Compatability',    'force_beam_upgrade',       'upgrades', 'shop'),
    'BuyForceCubeStompGrave3_C'               : new GameClass('Volcano Sealer',                   'force_cube',               'upgrades', 'shop'),
    'BuyForceCubeStompJump_C'                 : new GameClass('Force Cube Stomp Jump',            'stomp_damage',             'upgrades', 'shop'),
    'BuyForceCubeStomp_C'                     : new GameClass('Force Cube Stomp',                 'force_cube',               'upgrades', 'shop'),
    'BuyGraveDetector_C'                      : new GameClass('Grave Detector',                   'see_grave_count',          'upgrades', 'shop'),
    'BuyGun1_C'                               : new GameClass('Mighty MacGuffin',                 'gun_red_wood',             'upgrades', 'shop'),
    'BuyGunAltDamagex2_C'                     : new GameClass('Gun Alt Damage x2',                'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunAlt_C'                             : new GameClass('Gun 2nd Fire',                     'gun_red',                  'upgrades', 'shop'),
    'BuyGunCoin_C'                            : new GameClass('Gun Picks Up Coins',               'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunComboDamage+25_C'                  : new GameClass('Combo Damage +25',                 'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunCriticalDamageChance_C'            : new GameClass('Gun Critical Damage Chance +5%',   'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunCriticalDamage_C'                  : new GameClass('Gun Critical Damage',              'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunDamage+15_C'                       : new GameClass('Gun Damage +15',                   'gun_damage',               'upgrades', 'shop'),
    'BuyGunDamage+1_C'                        : new GameClass('Gun Damage +1',                    'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunDamage+5_C'                        : new GameClass('Gun Damage +5',                    'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunHoly1_C'                           : new GameClass('Gun Destroy Wooden Graves',        'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunHoly2_C'                           : new GameClass('Gun Destroy Stone Graves',         'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunRefillSpeed+66_C'                  : new GameClass('Ammo Refill Speed + 66%',          'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunRefireRate50_C'                    : new GameClass('Gun Cooldown Halfed',              'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunSpeedx2_C'                         : new GameClass('Gun Speed x2',                     'gun_upgrade',              'upgrades', 'shop'),
    'BuyGunSplashDamage_C'                    : new GameClass('Gun Splash Damage',                'gun_upgrade',              'upgrades', 'shop'),
    'BuyHealth+15_C'                          : new GameClass('Max Health +15',                   'health',                   'upgrades', 'shop'),
    '_BuyHealth+10_C'                         : new GameClass('Max Health +10',                   'health',                   'upgrades', 'shop'),
    'BuyHealth+2_C'                           : new GameClass('Max Health +2',                    'health',                   'upgrades', 'shop'),
    'BuyHealth+5_C'                           : new GameClass('Max Health +5',                    'health',                   'upgrades', 'shop'),
    'BuyHealthRegenMax+1_C'                   : new GameClass('Regeneration +',                   'health_regen_max',         'upgrades', 'shop'),
    'BuyHealthRegenMax10_C'                   : new GameClass('Health Regeneration +10',          'health_regen_max',         'upgrades', 'shop'),
    'BuyHealthRegenMax15_C'                   : new GameClass('Health Regen Max +15',             'health_regen_max',         'upgrades', 'shop'),
    'BuyHealthRegenMax5_C'                    : new GameClass('Health Regeneration +5',           'health_regen_max',         'upgrades', 'shop'),
    'BuyHealthRegenSpeed_C'                   : new GameClass('Regeneration Speed x2',            'health_regen_speed',       'upgrades', 'shop'),
    'BuyHealthRegen_C'                        : new GameClass('Health Regen',                     'health_regen',             'upgrades', 'shop'),
    'BuyHeartLuck_C'                          : new GameClass('Loot Luck',                        'loot_luck',                'upgrades', 'shop'),
    'BuyJumpHeightPlus_C'                     : new GameClass('Jump Height+',                     'stomp_damage',             'upgrades', 'shop'),
    'BuyJumpIncrease_C'                       : new GameClass('Jump +1',                          'double_jump',              'upgrades', 'shop'),
    'BuyMoreLoot_C'                           : new GameClass('More Loot',                        'loot',                     'upgrades', 'shop'),
    'BuyNumberRising_C'                       : new GameClass('Enemy Health',                     'see_enemy_health',         'upgrades', 'shop'),
    'BuyQuintupleJump_C'                      : new GameClass('Quintuple Jump',                   'triple_jump',              'upgrades', 'shop'),
    'BuyShieldBreaker_C'                      : new GameClass('Shield Breaker',                   'shield_breaker',           'upgrades', 'shop'),
    'BuyShowHealthbar_C'                      : new GameClass('Health Bar',                       'see_health_bar',           'upgrades', 'shop'),
    'BuyShowProgress_C'                       : new GameClass('Awesome-Meter',                    'awesome',                  'upgrades', 'shop'),
    'BuySilentFeet_C'                         : new GameClass('Silent Shoes',                     'silent_shoes',             'upgrades', 'shop'),
    'BuySmashdownDamage+100_C'                : new GameClass('Stomp Damage +100',                'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdownDamage+1_C'                  : new GameClass('Stomp Damage +1',                  'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdownDamage+33_C'                 : new GameClass('Stomp Damage +33%',                'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdownDamage+3_C'                  : new GameClass('Stomp Damage +3',                  'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdownRadius+5_C'                  : new GameClass('Stomp Radius +5',                  'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdownRadius+_C'                   : new GameClass('Stomp Radius +55cm',               'stomp_damage',             'upgrades', 'shop'),
    'BuySmashdown_C'                          : new GameClass('Stomp Shoes',                      'shoes',                    'upgrades', 'shop'),
    'BuySpeedx15_C'                           : new GameClass('Speed x15',                        'speed',                    'upgrades', 'shop'),
    'BuySpeedx2_C'                            : new GameClass('Speed x2',                         'speed',                    'upgrades', 'shop'),
    'BuyStats_C'                              : new GameClass('Stats',                            'loot',                     'upgrades', 'shop'),
    'BuySword2_C'                             : new GameClass('Supra Sword',                      'sword_red',                'upgrades', 'shop'),
    'BuySwordCriticalDamageChance_C'          : new GameClass('Sword Critical Damage Chance +5%', 'sword_damage',             'upgrades', 'shop'),
    'BuySwordCriticalDamage_C'                : new GameClass('Sword Critical Damage',            'sword_damage',             'upgrades', 'shop'),
    'BuySwordDamage+02_C'                     : new GameClass('Sword Damage +2',                  'sword_damage',             'upgrades', 'shop'),
    'BuySwordDamage+1_C'                      : new GameClass('Sword Damage +1',                  'sword_damage',             'upgrades', 'shop'),
    'BuySwordDamage+3_C'                      : new GameClass('Sword Damage +3',                  'sword_damage',             'upgrades', 'shop'),
    'BuySwordDoorKnocker_C'                   : new GameClass('Door Knocker',                     'sword',                    'upgrades', 'shop'),
    'BuySwordHoly1_C'                         : new GameClass('Holy Sword Wooden Graves',         'sword_holy',               'upgrades', 'shop'),
    'BuySwordHoly2_C'                         : new GameClass('Holy Sword Stone Graves',          'sword_holy',               'upgrades', 'shop'),
    'BuySwordRange25_C'                       : new GameClass('Sword Range +25%',                 'sword_damage',             'upgrades', 'shop'),
    'BuySwordRefireRate-33_C'                 : new GameClass('Sword 33% Faster',                 'sword_speed',              'upgrades', 'shop'),
    'BuySword_C'                              : new GameClass('Sword',                            'sword',                    'upgrades', 'shop'),
    'BuyTranslocatorCoolDownHalf_C'           : new GameClass('Translocator Cooldown 50%',        'translocator_cooldown',    'upgrades', 'shop'),
    'BuyTranslocatorDamagex3_C'               : new GameClass('Translocator Damage x2',           'translocator_damage',      'upgrades', 'shop'),
    'BuyTranslocatorModule_C'                 : new GameClass('Translocator Module',              'translocator_cooldown',    'upgrades', 'shop'),
    'BuyTranslocatorShotForce_C'              : new GameClass('Shot Force x2',                    'translocator_distance',    'upgrades', 'shop'),
    'BuyTranslocatorWeight_C'                 : new GameClass('Translocator Weight',              'translocator_damage',      'upgrades', 'shop'),
    'BuyTranslocator_C'                       : new GameClass('Translocator',                     'translocator:g',           'upgrades', 'shop'),
    'BuyTranslocator_Fake_C'                  : new GameClass('Fake Translocator',                null,                       'upgrades', 'shop'),
    'BuyTripleJump_C'                         : new GameClass('Triple Jump',                      'triple_jump',              'upgrades', 'shop'),
    'BuyUpgradeChestNum_C'                    : new GameClass('Remaining Chest Count',            'see_chest_count',          'upgrades', 'shop'),
    'BuyUpgradeGraveNum_C'                    : new GameClass('See Grave Count',                  'see_grave_count',          'upgrades', 'shop'),
    'BuyWalletx15_C'                          : new GameClass('Max Coins x1.5',                   'wallet',                   'upgrades', 'shop'),
    'BuyWalletx2_C'                           : new GameClass('Max Coins x2',                     'wallet',                   'upgrades', 'shop'),
    'Chest_C'                                 : new GameClass('Chest',                            'chest',                    null,       'closedChest'),
    'CoinBig_C'                               : new GameClass('Big Coin',                         'coin',                     'coin'),
    'CoinRed_C'                               : new GameClass('Red Coin',                         'coinRed',                  'misc',     'collectable'),
    'Coin_C'                                  : new GameClass('Coin',                             'coin:16',                  'coin'),
    '_CoinStack_C'                            : new GameClass('Coin Stack',                       'coinStash2',               'coin'),
    'DestroyablePots_C'                       : new GameClass('Destroyable Pots',                 'pots',                     null,       null,           null),
    'Coin:DestroyablePots_C'                  : new GameClass('Destroyable Pots',                 'pots',                     'coin'),
    'GoldBlock_C'                             : new GameClass('Gold Block',                       null,                       null,       null,           null),
    'GoldNugget_C'                            : new GameClass('Gold Nugget',                      null,                       null,       null,           null),
    'Jumppillow_C'                            : new GameClass('Bouncy Mattress',                  null,                       null,       null,           null),
    'Jumppad_C'                               : new GameClass('Jumppad',                          'jumppad:v',                'dev',      null,           'dev'),
    'Jumppad_FT'                              : new GameClass('Jumppad',                          'jumppad:v',                'jumppads', null,           'jumppads'),
    'LotsOfCoins1_C'                          : new GameClass('Lots Of Coins 1',                  'chest_coin',               'coin'),
    'LotsOfCoins10_C'                         : new GameClass('Lots Of Coins 10',                 'chest_coin',               'coin'),
    'LotsOfCoins15_C'                         : new GameClass('Lots Of Coins 15',                 'chest_coin',               'coin'),
    'LotsOfCoins30_C'                         : new GameClass('Lots Of Coins 30',                 'chest_coin',               'coin'),
    'LotsOfCoins50_C'                         : new GameClass('Lots Of Coins 50',                 'chest_coin',               'coin'),
    'LotsOfCoins5_C'                          : new GameClass('Lots Of Coins 5',                  'chest_coin',               'coin'),
    'LotsofCoins200_C'                        : new GameClass('Lotsof Coins 200',                 'chest_coin',               'coin'),
    'Coin:Chest_C'                            : new GameClass('Coin Chest',                       'chest_coin',               'coin',     'closedChest'),
    'Coin:MinecraftBrick_C'                   : new GameClass('Gold Minecraft Brick',             'brick:v',                  'coin'),
    'MoonTake_C'                              : new GameClass('Green Moon',                       'moon_green',               'misc',     'collectable'),
    'PlayerStart'                             : new GameClass('Player Start',                     'awesome',                  'extra'),
    '_PlayerPosition'                         : new GameClass('Player Position',                  'player:v48',               null),
    'Plumbus_C'                               : new GameClass('Plumbus',                          'plumbus',                  'extra'),
    'Purchase_DiamondPickaxe_C'               : new GameClass('Diamond Pickaxe',                  'pickaxe_diamond',          'upgrades', 'shop'),
    'Purchase_ForceBeam_C'                    : new GameClass('Force Beam',                       'beam',                     'upgrades', 'shop'),
    'Purchase_ForceCube_C'                    : new GameClass('Force Cube',                       'force_cube',               'upgrades', 'shop'),
    'Purchase_IronPickaxe_C'                  : new GameClass('Iron Pickaxe',                     'pickaxe_metal',            'upgrades', 'shop'),
    'Purchase_StonePickaxe_C'                 : new GameClass('Stone Pickaxe',                    'pickaxe_stone',            'upgrades', 'shop'),
    'Purchase_WoodPickaxe_C'                  : new GameClass('Wooded Pickaxe',                   'pickaxe_wood',             'upgrades', 'shop'),
    'Scrap_C'                                 : new GameClass('Scrap',                            'scrap',                    'misc',     'collectable'),
    'SpawnEnemy3_C'                           : new GameClass('Spawn Enemy 3',                    null,                       'extra'),
    'Stone_C'                                 : new GameClass('Stone',                            null,                       'extra'),
    'UpgradeHappiness_C'                      : new GameClass('Happiness',                        'happiness',                'upgrades', 'shop'),
    'ValveCarriable_C'                        : new GameClass('Carriable Valve',                  'valve',                    'extra'),
    'ValveSlot_C'                             : new GameClass('Valve Slot',                       'valve',                    'extra'),
    'Valve_C'                                 : new GameClass('Valve',                            'valve',                    'extra'),
    'HealingStation_C'                        : new GameClass('Healing Station',                  'supradoh',                 'extra'),
    'EnemySpawn1_C'                           : new GameClass('Wooden Cross',                     'grave_wood',               'graves'),
    'EnemySpawn2_C'                           : new GameClass('Stone Grave',                      'grave_stone',              'graves'),
    'EnemySpawn3_C'                           : new GameClass('Volcano',                          'grave_volcano',            'graves'),
    'Shell_C'                                 : new GameClass('Shell',                            'shell',                    'misc',     'collectable'),
    'DeadHero_C'                              : new GameClass('Dead Hero',                        'hero:v',                   'misc',     'collectable'),
    'EnemySpawner_C'                          : new GameClass('Enemy Spawner',                    null,                       null,       null,           null),
    'Enemyspawner2_C'                         : new GameClass('Enemyspawner 2',                   null,                       null,       null,           null),
    'Juicer_C'                                : new GameClass('Juicer',                           'bucket:v',                 'upgrades', 'shop'),
    'Lever_C'                                 : new GameClass('Lever',                            'lever',                    'extra'),
    'Button_C'                                : new GameClass('Button',                           'button',                   'extra'),
    'ButtonFloor_C'                           : new GameClass('Button Floor',                     'button_floor',             'extra'),
    'PedestalButton_C'                        : new GameClass('Pedestal Button',                  'button_pedestal',          'extra'),
    'BallButton_C'                            : new GameClass('Ball Button',                      'button_ball',              'extra'),
    'BigButton_C'                             : new GameClass('Big Button',                       'button_big',               'extra'),
    'BigButton2_C'                            : new GameClass('Big Button 2',                     'button_big',               'extra'),
    'BigButton2Once_C'                        : new GameClass('Big Button 2 Once',                'button_big',               'extra'),
    'BigButtonWeight_C'                       : new GameClass('Big Button Weight',                'button_big',               'extra'),
    'Smallbutton_C'                           : new GameClass('Smallbutton',                      'button',                   'extra'),
    'Smallbutton2_C'                          : new GameClass('Smallbutton 2',                    'button',                   'extra'),
    'SmallbuttonNINE_C'                       : new GameClass('Smallbutton NINE',                 'button',                   'extra'),
    'SmallbuttonQuickOnoff_C'                 : new GameClass('Smallbutton Quick Onoff',          'button',                   'extra'),
    'SmallbuttonOpenClose_C'                  : new GameClass('Smallbutton Open Close',           'button',                   'extra'),
    'SmallbuttonMultipleActors_C'             : new GameClass('Smallbutton Multiple Actors',      'button',                   'extra'),
    'SmallbuttonOnceMultipleActors_C'         : new GameClass('Smallbutton Once Multiple Actors', 'button',                   'extra'),
    'SmallbuttonWhile_C'                      : new GameClass('Smallbutton While',                'button',                   'extra'),
    'SmallbuttonFlipFlop_C'                   : new GameClass('Smallbutton Flip Flop',            'button',                   'extra'),
    'Door_C'                                  : new GameClass('Door',                             'door',                     'extra'),
    'Door2_C'                                 : new GameClass('Door 2',                           'door',                     'extra'),
    'Door3_C'                                 : new GameClass('Door 3',                           'door',                     'extra'),
    'DoorAnna_C'                              : new GameClass('Door Anna',                        'door',                     'extra'),
    'DoorStone_C'                             : new GameClass('Door Stone',                       'door',                     'extra'),
    'JailDoor_C'                              : new GameClass('Jail Door',                        'door',                     'extra'),
    'DoorLego_C'                              : new GameClass('Door Lego',                        'door',                     'extra'),
    'DoorInverted_C'                          : new GameClass('Door Inverted',                    'door',                     'extra'),
    'DoorPhysical_C'                          : new GameClass('Door Physical',                    'door',                     'extra'),
    'BP_ElevatorDoor_C'                       : new GameClass('Elevator Door',                    'door',                     'extra'),
    'BP_Fix_A4_CombatArenaDoor_C'             : new GameClass('Fix A4 Combat Arena Door',         'door',                     'extra'),
    'SwingingDoor_C'                          : new GameClass('Swinging Door',                    'door',                     'extra'),
    'SwingingDoorResetVolume_C'               : new GameClass('Swinging Door Reset Volume',       'door',                     'extra'),
    'Battery_C'                               : new GameClass('Battery',                          'battery',                  'extra'),
    'ExplodingBattery_C'                      : new GameClass('Exploding Battery',                'battery',                  'extra'),
    'Key_C'                                   : new GameClass('Key',                              'key',                      'extra'),
    'KeyLock_C'                               : new GameClass('Key Lock',                         'lock',                     'extra'),
    'KeyPlastic_C'                            : new GameClass('Key Plastic',                      'key_plastic',              'extra'),
    'KeyLockPlastic_C'                        : new GameClass('Key Lock Plastic',                 'lock_plastic',             'extra'),
    'TalkingSpeaker_C'                        : new GameClass('Talking Speaker',                  'speaker',                  'extra'),
    'KeycardColor_C'                          : new GameClass('Keycard Color',                    'keycard:v',                'extra'),
    'KeycardReader_C'                         : new GameClass('Keycard Reader',                   'keycard_reader',           'extra'),
    'MetalBall_C'                             : new GameClass('Metal Ball',                       'metal_ball',               'extra'),
    'Anvil_C'                                 : new GameClass('Anvil',                            'anvil',                    'extra'),
    'Lift1_C'                                 : new GameClass('Lift 1',                           'lift',                     'extra'),
    'Sponge_C'                                : new GameClass('Sponge',                           'sponge',                   'extra'),
    'SpongeBig_C'                             : new GameClass('Sponge Big',                       'sponge',                   'extra'),
    'Sponge_Large_C'                          : new GameClass('Sponge Large',                     'sponge',                   'extra'),
    'Supraball_C'                             : new GameClass('Supraball',                        'supraball',                'extra'),
    'Seed_C'                                  : new GameClass('Seed',                             'seed:v',                   'extra'),
    'RingColorerFlower_C'                     : new GameClass('Flower',                           'flower:v',                 'extra'),
    'Trash_C'                                 : new GameClass('Trash',                            'trash',                    'extra'),
    'MatchBox_C'                              : new GameClass('Match Box',                        'matchbox',                 'extra'),
    'PhysicalCoin_C'                          : new GameClass('Physical Coin',                    'coin',                     'coin'),
    'RedGuy_C'                                : new GameClass('Red Guy',                          'guy:v',                    'extra'),
    'Waldo:RedGuy_C'                          : new GameClass('Waldo',                            'waldo',                    'misc',     'collectable',  'misc'),
    'BP_UnlockMap_C'                          : new GameClass('Map',                              'map',                      'upgrades', 'shop'),
    'MinecraftBrick_C'                        : new GameClass('Minecraft Brick',                  'brick:v',                  'extra'),
    'MinecraftBrickRespawnable_C'             : new GameClass('Minecraft Brick',                  'brick:v',                  'extra'),
    'SecretFound_C'                           : new GameClass('Secret Found',                     'secret:24',                'extra'),
    'SnappyPipe'                              : new GameClass('Snappy Pipe',                      'pipe',                     'extra'),
    'CarryPipe_C'                             : new GameClass('Carry Pipe',                       'pipe',                     'extra'),
    'PipeCap_C'                               : new GameClass('Pipe Cap',                         'pipe',                     null, null, null),
    'Pipesystem_C'                            : new GameClass('Pipe',                             'pipe',                     'dev',           null,           'dev'),
    'Pipesystem_FT'                           : new GameClass('Pipe',                             'pipe',                     'pipesys',       null,           'pipesys'),
    'PipesystemNew_C'                         : new GameClass('Pipe',                             'pipe',                     'dev',           null,           'dev'),
    'PipesystemNewDLC_C'                      : new GameClass('Pipe',                             'pipe',                     'dev',           null,           'dev'),
    'TriggerVolume_C'                         : new GameClass('Trigger Volume',                   'trigger_volume',           'extra'),
    'BP_TriggerVolume_C'                      : new GameClass('Trigger Volume',                   'trigger_volume',           'extra'),
    'Lighttrigger_C'                          : new GameClass('Lighttrigger',                     'trigger_light',            'extra'),
    'Lighttrigger2_C'                         : new GameClass('Lighttrigger 2',                   'trigger_light',            'extra'),
    'Coin:BP_Area2_Uncloged_Quest_C'          : new GameClass('Valve Quest',                      'chest_coin',               'coin',     'closedChest'),
    'BathGuyVolume_C'                         : new GameClass('Too Hot Quest',                    'health',                   'upgrades', 'shop'),
    'BP_A3_RobBoss_C'                         : new GameClass('Rob Quest',                        'chest',                    null,       'closedChest'),
    'Coin:BP_Area2_FatGuyQuest_C'             : new GameClass('BBQ Quest',                        'meat',                     'coin'),
    'BP_ParanoidQuest_C'                      : new GameClass('Candle Quest',                     'health',                   'upgrades', 'shop'),
    'BP_A3_BBQ_C'                             : new GameClass('BBQ Quest',                        'meat',                     'coin'),
    'BP_RebuildSlum_C'                        : new GameClass('Rebuild Slum',                     'pickaxe_cooldown',         'upgrades', 'shop'),
}

// Returns the [icon, size] based on the decorated icon name plus a variant if supplied
/* exported decodeIconName */
function decodeIconName(icon, game, variant = null) {
    let size = 32
    let ci = icon.indexOf(':');
    if(ci >= 0) {
        let flags = icon.substring(ci+1);
        icon = icon.substring(0, ci);

        if(game && flags.indexOf('g') >= 0)
            icon += '_'+game;
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
function getClassIcon(cls, game, variant = null)
{
    return decodeIconName(cls.icon ? cls.icon : 'question_mark', game, variant)
}

// Returns [icon, size] for the given object. If variant not supplied its taken
// from the object.
/* exported getObjectIcon */
function getObjectIcon(object, game, variant = null)
{
    variant = variant ? variant : object.variant;
    if(object.icon)
        return decodeIconName(object.icon, variant);
    else
        return getClassIcon(object.type, game, variant)    
}

