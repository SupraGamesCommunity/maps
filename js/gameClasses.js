// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

class GameClass {
    constructor(icon, layer, nospoiler = null, lines = null) {
        this.icon = icon;               // Icon used to represent instances on the map
        this.layer = layer;             // Which layer these instances should be put on 
        this.nospoiler = nospoiler;     // Which no spoiler layer should these instances be put on
        this.lines = lines;             // If this object has lines then the layer to put them on (otherwise null)
    }
}

/* exported gameClasses */
const gameClasses = {
    "BP_A3_StrengthQuest_C"             : new GameClass("strong",                   "upgrades",    "shop"),
    "BP_BoneDetector_C"                 : new GameClass("loot",                     "upgrades",    "shop"),
    "BP_BuyBeamElasticity_C"            : new GameClass(null,                       "upgrades",    "shop"),
    "BP_BuyBoomerAxe_C"                 : new GameClass(null,                       "upgrades",    "shop"),
    "BP_BuyBoomeraxeDistance_C"         : new GameClass("boomeraxe_throw_distance", "upgrades",    "shop"),
    "BP_BuyBoomeraxePenetration_C"      : new GameClass("boomeraxe_penetration",    "upgrades",    "shop"),
    "BP_BuyBoomeraxeThrowSpeed_C"       : new GameClass("boomeraxe_speed",          "upgrades",    "shop"),
    "BP_BuyFireGunAutoRecharge_C"       : new GameClass("firegun_refill",           "upgrades",    "shop"),
    "BP_BuyGunCapacity+3shots_C"        : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BP_BuyGunDamage+100pct_C"          : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BP_BuyGunDuration+2s_C"            : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BP_BuyGunRechargeTime-50pct_C"     : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BP_CookableMeat_C"                 : new GameClass("meat",                     "extra"),
    "BP_DoubleHealthLoot_C"             : new GameClass("health",                   "upgrades",    "shop"),
    "BP_EngagementCup_Base_C"           : new GameClass("trophy",                   "misc",        "collectable"),
    "BP_MonsterChest_C"                 : new GameClass("chest",                    null,          "cloasedChest"),
    "BP_PickaxeDamage+1_C"              : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BP_PurchaseHealth+1_C"             : new GameClass("health",                   "upgrades",    "shop"),
    "BP_PurchaseJumpHeightPlus_C"       : new GameClass("double_jump",              "upgrades",    "shop"),
    "BP_PurchaseSpeedx2_C"              : new GameClass("speed",                    "upgrades",    "shop"),
    "BP_Purchase_Crouch_C"              : new GameClass(null,                       "upgrades",    "shop"),
    "BP_Purchase_FasterPickaxe_C"       : new GameClass("boomeraxe_range",          "upgrades",    "shop"),
    "BP_Purchase_Pickaxe_Range+_C"      : new GameClass("boomeraxe_range",          "upgrades",    "shop"),
    "BP_Purchase_TranslocatorCooldown_C": new GameClass("translocator_cooldown",    "upgrades",    "shop"),
    "BP_TrophyDetector_C"               : new GameClass(null,                       "upgrades",    "shop"),
    "BarrelColor_C"                     : new GameClass("barrel_gold",              "misc",        "collectable"),
    "BarrelRed_C"                       : new GameClass("barrel_red",               "misc",        "collectable"),
    "BarrelClosed_Blueprint_C"          : new GameClass("barrel_gold",              "misc",        "collectable"),
    "Battery_C"                         : new GameClass(null,                       "extra"),
    "Bones_C"                           : new GameClass("bones",                    "misc",        "collectable"),
    "BuyArmor1_C"                       : new GameClass("armor",                    "upgrades",    "shop"),
    "BuyBeltRepel_C"                    : new GameClass("belt",                     "upgrades",    "shop"),
    "BuyBelt_C"                         : new GameClass("belt",                     "upgrades",    "shop"),
    "BuyBelt_DLC2_C"                    : new GameClass("belt",                     "upgrades",    "shop"),
    "BuyBrokenPipeDetector_C"           : new GameClass("pipe_detector",            "upgrades",    "shop"),
    "BuyChestDetectorRadius_C"          : new GameClass(null,                       "upgrades",    "shop"),
    "BuyChestDetector_C"                : new GameClass("see_chest_count",          "upgrades",    "shop"),
    "BuyCoinMagnet_C"                   : new GameClass(null,                       "upgrades",    "shop"),
    "BuyCritChance+5_C"                 : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyCrystal_C"                      : new GameClass("moon_red",                 "misc",        "collectable"),
    "BuyDoubleJump_C"                   : new GameClass("double_jump",              "upgrades",    "shop"),
    "BuyElectricGun_C"                  : new GameClass("gun_electro",              "upgrades",    "shop"),
    "BuyEnemiesLoot_C"                  : new GameClass(null,                       "upgrades",    "shop"),
    "BuyFireGun_C"                      : new GameClass("gun_fire",                 "upgrades",    "shop"),
    "BuyForceBeamGold_C"                : new GameClass("force_beam_upgrade",       "upgrades",    "shop"),
    "BuyForceBeam_C"                    : new GameClass("force_beam_upgrade",       "upgrades",    "shop"),
    "BuyForceBlockTelefrag_C"           : new GameClass("force_cube",               "upgrades",    "shop"),
    "BuyForceBlock_C"                   : new GameClass("force_cube",               "upgrades",    "shop"),
    "BuyForceCubeBeam_C"                : new GameClass("force_beam_upgrade",       "upgrades",    "shop"),
    "BuyForceCubeStompGrave3_C"         : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuyForceCubeStompJump_C"           : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuyForceCubeStomp_C"               : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuyGraveDetector_C"                : new GameClass(null,                       "upgrades",    "shop"),
    "BuyGun1_C"                         : new GameClass("gun_red",                  "upgrades",    "shop"),
    "BuyGunAltDamagex2_C"               : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunAlt_C"                       : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunCoin_C"                      : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunComboDamage+25_C"            : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunCriticalDamageChance_C"      : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunCriticalDamage_C"            : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunDamage+15_C"                 : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunDamage+1_C"                  : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunDamage+5_C"                  : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyGunHoly1_C"                     : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunHoly2_C"                     : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunRefillSpeed+66_C"            : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunRefireRate50_C"              : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunSpeedx2_C"                   : new GameClass("gun_upgrade",              "upgrades",    "shop"),
    "BuyGunSplashDamage_C"              : new GameClass("gun_damage",               "upgrades",    "shop"),
    "BuyHealth+15_C"                    : new GameClass("health",                   "upgrades",    "shop"),
    "_BuyHealth+1_C"                    : new GameClass("health",                   "upgrades",    "shop"),
    "BuyHealth+2_C"                     : new GameClass("health",                   "upgrades",    "shop"),
    "BuyHealth+5_C"                     : new GameClass("health",                   "upgrades",    "shop"),
    "BuyHealthRegenMax+1_C"             : new GameClass("health_regen_max",         "upgrades",    "shop"),
    "BuyHealthRegenMax10_C"             : new GameClass("health_regen_max",         "upgrades",    "shop"),
    "BuyHealthRegenMax15_C"             : new GameClass("health_regen_max",         "upgrades",    "shop"),
    "BuyHealthRegenMax5_C"              : new GameClass("health_regen_max",         "upgrades",    "shop"),
    "BuyHealthRegenSpeed_C"             : new GameClass("health_regen_speed",       "upgrades",    "shop"),
    "BuyHealthRegen_C"                  : new GameClass("health_regen",             "upgrades",    "shop"),
    "BuyHeartLuck_C"                    : new GameClass(null,                       "upgrades",    "shop"),
    "BuyJumpHeightPlus_C"               : new GameClass(null,                       "upgrades",    "shop"),
    "BuyJumpIncrease_C"                 : new GameClass("double_jump",              "upgrades",    "shop"),
    "BuyMoreLoot_C"                     : new GameClass(null,                       "upgrades",    "shop"),
    "BuyNumberRising_C"                 : new GameClass(null,                       "upgrades",    "shop"),
    "BuyQuintupleJump_C"                : new GameClass("triple_jump",              "upgrades",    "shop"),
    "BuyShieldBreaker_C"                : new GameClass("shield_breaker",           "upgrades",    "shop"),
    "BuyShowHealthbar_C"                : new GameClass("see_enemy_health",         "upgrades",    "shop"),
    "BuyShowProgress_C"                 : new GameClass(null,                       "upgrades",    "shop"),
    "BuySilentFeet_C"                   : new GameClass("silent_shoes",             "upgrades",    "shop"),
    "BuySmashdownDamage+100_C"          : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdownDamage+1_C"            : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdownDamage+33_C"           : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdownDamage+3_C"            : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdownRadius+5_C"            : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdownRadius+_C"             : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySmashdown_C"                    : new GameClass("stomp_damage",             "upgrades",    "shop"),
    "BuySpeedx15_C"                     : new GameClass("speed",                    "upgrades",    "shop"),
    "BuySpeedx2_C"                      : new GameClass("speed",                    "upgrades",    "shop"),
    "BuyStats_C"                        : new GameClass(null,                       "upgrades",    "shop"),
    "BuySword2_C"                       : new GameClass("sword",                    "upgrades",    "shop"),
    "BuySwordCriticalDamageChance_C"    : new GameClass("sword_critical",           "upgrades",    "shop"),
    "BuySwordCriticalDamage_C"          : new GameClass("sword_critical",           "upgrades",    "shop"),
    "BuySwordDamage+02_C"               : new GameClass("sword_damage",             "upgrades",    "shop"),
    "BuySwordDamage+1_C"                : new GameClass("sword_damage",             "upgrades",    "shop"),
    "BuySwordDamage+3_C"                : new GameClass("sword_damage",             "upgrades",    "shop"),
    "BuySwordDoorKnocker_C"             : new GameClass("sword",                    "upgrades",    "shop"),
    "BuySwordHoly1_C"                   : new GameClass("sword_holy",               "upgrades",    "shop"),
    "BuySwordHoly2_C"                   : new GameClass("sword_holy",               "upgrades",    "shop"),
    "BuySwordRange25_C"                 : new GameClass(null,                       "upgrades",    "shop"),
    "BuySwordRefireRate-33_C"           : new GameClass(null,                       "upgrades",    "shop"),
    "BuySword_C"                        : new GameClass("sword",                    "upgrades",    "shop"),
    "BuyTranslocatorCoolDownHalf_C"     : new GameClass("translocator_cooldown",    "upgrades",    "shop"),
    "BuyTranslocatorDamagex3_C"         : new GameClass("translocator_damage",      "upgrades",    "shop"),
    "BuyTranslocatorModule_C"           : new GameClass(null,                       "upgrades",    "shop"),
    "BuyTranslocatorShotForce_C"        : new GameClass("translocator_distance",    "upgrades",    "shop"),
    "BuyTranslocatorWeight_C"           : new GameClass(null,                       "upgrades",    "shop"),
    "BuyTranslocator_C"                 : new GameClass("translocator",             "upgrades",    "shop"),
    "BuyTranslocator_Fake_C"            : new GameClass(null,                       "upgrades",    "shop"),
    "BuyTripleJump_C"                   : new GameClass("triple_jump",              "upgrades",    "shop"),
    "BuyUpgradeChestNum_C"              : new GameClass(null,                       "upgrades",    "shop"),
    "BuyUpgradeGraveNum_C"              : new GameClass(null,                       "upgrades",    "shop"),
    "BuyWalletx15_C"                    : new GameClass(null,                       "upgrades",    "shop"),
    "BuyWalletx2_C"                     : new GameClass(null,                       "upgrades",    "shop"),
    "Chest_C"                           : new GameClass("chest",                    "closedChest"),
    "CoinBig_C"                         : new GameClass("coin_big",                 "coin"),
    "CoinRed_C"                         : new GameClass("coinRed",                  "coin"),
    "Coin_C"                            : new GameClass("coin_small",               "coin"),
    "_CoinStash"                        : new GameClass("coinStash2",               "coin"),
    "DeadHero_C"                        : new GameClass("hero_placeholder",         "misc",        "collectable"),
    "DestroyablePots_C"                 : new GameClass("pots",                     "extra"),
    "EnemySpawner_C"                    : new GameClass(null,                       "extra"),
    "Enemyspawner2_C"                   : new GameClass(null,                       "extra"),
    "ExplodingBattery_C"                : new GameClass(null,                       "extra"),
    "GoldBlock_C"                       : new GameClass(null,                       "extra"),
    "GoldNugget_C"                      : new GameClass(null,                       "extra"),
    "Jumppad_C"                         : new GameClass("map",                      "jumppads",    null,           'jumppads'),
    "Jumppillow_C"                      : new GameClass(null,                       "extra"),
    "Key_C"                             : new GameClass(null,                       "extra"),
    "KeycardColor_C"                    : new GameClass(null,                       "extra"),
    "LotsOfCoins10_C"                   : new GameClass("chest_coin",               "coin"),
    "LotsOfCoins15_C"                   : new GameClass("chest_coin",               "coin"),
    "LotsOfCoins30_C"                   : new GameClass("chest_coin",               "coin"),
    "LotsOfCoins50_C"                   : new GameClass("chest_coin",               "coin"),
    "LotsOfCoins5_C"                    : new GameClass("chest_coin",               "coin"),
    "LotsofCoins200_C"                  : new GameClass("chest_coin",               "coin"),
    "_CoinChest_C"                      : new GameClass("chest_coin",               "coin"),
    "MinecraftBrick_C"                  : new GameClass("brick",                    "extra"),
    "_MinecraftBrickGold_C"             : new GameClass("brick",                    "coin"),
    "MoonTake_C"                        : new GameClass("moon_green",               "misc",        "collectable"),
    "PlayerStart"                       : new GameClass("awesome",                  "extra"),
    "Plumbus_C"                         : new GameClass(null,                       "extra"),
    "Purchase_DiamondPickaxe_C"         : new GameClass("pickaxe_diamond",          "upgrades",    "shop"),
    "Purchase_ForceBeam_C"              : new GameClass("beam",                     "upgrades",    "shop"),
    "Purchase_ForceCube_C"              : new GameClass("force_cube",               "upgrades",    "shop"),
    "Purchase_IronPickaxe_C"            : new GameClass("pickaxe_metal",            "upgrades",    "shop"),
    "Purchase_StonePickaxe_C"           : new GameClass("pickaxe_stone",            "upgrades",    "shop"),
    "Purchase_WoodPickaxe_C"            : new GameClass("pickaxe_wood",             "upgrades",    "shop"),
    "Scrap_C"                           : new GameClass("scrap",                    "misc",        "collectable"),
    "SlumBurningQuest_C"                : new GameClass("shop",                     "shop",        "upgrades"),
    "SpawnEnemy3_C"                     : new GameClass(null,                       "extra"),
    "Stone_C"                           : new GameClass(null,                       "extra"),
    "UpgradeHappiness_C"                : new GameClass("happiness",                "upgrades",    "shop"),
    "ValveCarriable_C"                  : new GameClass("valve",                    "misc",        "collectable"),
    "ValveSlot_C"                       : new GameClass("valve",                    "extra"),
    "Valve_C"                           : new GameClass("valve",                    "extra"),
    "HealingStation_C"                  : new GameClass("health",                   "extra"),
    "MatchBox_C"                        : new GameClass("gun_upgrade",              "extra"),
    "EnemySpawn1_C"                     : new GameClass("grave_wood",               "graves"),
    "EnemySpawn2_C"                     : new GameClass("grave_stone",              "graves"),
    "EnemySpawn3_C"                     : new GameClass("grave_volcano",            "graves"),
    "Lift1_C"                           : new GameClass("question_mark",            "extra"),
    "PipeCap_C"                         : new GameClass("pipe_red",                 null,          null,           null),
    "PipesystemNew_C"                   : new GameClass("pipe_green",               "pipesys",     null,           'pipesys'),
    "PipesystemNewDLC_C"                : new GameClass("pipe_blue",                "pipesys",     null,           'pipesys'),
    "Shell_C"                           : new GameClass("shell",                    "misc",        "collectable"),
    "MetalBall_C"                       : new GameClass(null,                       "extra"),
    "Supraball_C"                       : new GameClass(null,                       "extra"),
    "Trash_C"                           : new GameClass(null,                       "extra")
}