marker_types = {
    'PlayerStart',
    'Jumppad_C',
    'Bones_C',
    'Chest_C',
    'BarrelColor_C',
    'BarrelRed_C',
    'Battery_C',
    'BP_A3_StrengthQuest_C',
    'Lift1_C',
    'DeadHero_C',
    'ExplodingBattery_C',
    'GoldBlock_C',
    'GoldNugget_C',
    'Jumppillow_C',
    'MoonTake_C',
    'Plumbus_C',
    'Stone_C',
    'ValveCarriable_C',
    'ValveSlot_C',
    'Valve_C',
    'MatchBox_C',
    'Shell_C',
    'BarrelClosed_Blueprint_C',
    'MetalBall_C',
    'Supraball_C',
    'Key_C',
    'KeyLock_C',
    'KeycardColor_C',
    'PipeCap_C',
    'Sponge_C',
    'Juicer_C',
    'Seed_C',
    'Anvil_C',
    'Map_C',
    'NomNomFlies_C',
    'CarrotPhysical_C',
    'RingColorer_C',
    'RespawnActor_C',
    'CarryStones_Heavy_C',
    'CarryStones_C',
    'Crystal_C',
    'RingRusty_C',
    'SecretFound_C',
    # slc
    'Scrap_C',
    'TalkingSpeaker_C',
    'Sponge_Large_C',
    # siu
    'HealingStation_C',
    'BP_EngagementCup_Base_C',
    'SlumBurningQuest_C',
    'Trash_C',
    'BP_Area2_Uncloged_Quest_C',
    'BathGuyVolume_C',
    'BP_A3_RobBoss_C',
    'BP_Area2_FatGuyQuest_C',
    'BP_ParanoidQuest_C',
    'BP_A3_BBQ_C',
    'BP_RebuildSlum_C',
}

starts_with = {
    'Pipesystem',
    'Buy',
    'BP_Buy',
    'BP_Purchase',
    'BP_Unlock',
    'Purchase',
    'Upgrade',
    'Button',
    'Smallbutton',
    'Coin',
    'Lighttrigger',
    'LotsOfCoins',
    'EnemySpawn',
    'Destroyable',
    'BP_Pickaxe',
    'Door',
    'Key',
    'ProjectileShooter',
    'MinecraftBrick',  # can be MinecraftBrick_C and MinecraftBrickRespawnable_C
    'CrashEnemySpawner_C',
}

ends_with = {
    'Chest_C',
    'Button_C',
    'Lever_C',
    'Meat_C',
    'Loot_C',
    'Detector_C',
    'Door_C',
    'Flower_C',
    'Coin_C',
    'Guy_C',
    'TriggerVolume_C',  # opens pipes in SIU
}

properties = [
    'IsInShop',
    'canBePickedUp',
    'PriceType',  # BP_UnlockMap_C, etc.
    'Coins',
    'CoinsInGold',
    'Cost',
    'Value',  # Chest_C
    'HitsToBreak',
    'bObsidian',
    'HitsTaken',
    'BrickType',  # Minecraftbrick_C
    'AllowEnemyProjectiles',
    'RequiresPurpleShot?',
    'ButtonType',
    'Shape',  # Button_C
    'Color',
    'OriginalColor',  # Seed_C/*Flower_C/Keycard*_C (0 - white, 1 - yellow, 2 - red, 5 - green)
    'RelativeVelocity',
    'AllowStomp',
    'DisableMovementInAir',
    'RelativeVelocity?',
    'CenterActor',  # jumpppad_c
    'Achievement?',
    'Achievement Name',  # trigger volumes
    'Contains Coin',  # DestroyablePots_C
    'bDoesntRotate',  # Coin_C, CoinBig_C
    'Scrapamount',  # Scrap_C
]


# Number of coins given by classes if not explicit
# Coin pots provide 1 if the flag is true
# THis should probably be split between SW and SL
slcoin_defaults = {
    'Coin_C': 1,
    'CoinBig_C': 10,
    'LotsOfCoins1_C': 1,
    'LotsOfCoins5_C': 5,
    'LotsOfCoins10_C': 10,
    'LotsOfCoins15_C': 15,
    'LotsOfCoins30_C': 30,
    'LotsOfCoins50_C': 50,
    'LotsofCoins200_C': 200,  # Note lower case 'of'
    'PhysicalCoin_C': 1,
}
