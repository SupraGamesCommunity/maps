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


# Number of coins given by classes if not explicit
# Coin pots provide 1 if the flag is true
# THis should probably be split between SW and SL
swcoin_defaults = {
    '5Cent_C': 5,
    'RealCoinPickup_C': 1,
    'Inventory_Coin_C': 1,
    'Inventory_Coin3_C': 3,
    'Inventory_Coin5_C': 5,
    'Inventory_Coin10_C': 10,
    'Gumball_Machine_C': 0,
}


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
material_types = ["Nailscrew_C", "PuzzleCloud_C"]

tracked_staticmeshes = ['Poker_Chip_1']

staticmesh2variant = {'Poker_Chip_1': 'red'}

material2variant = {
    'Metal_Base_Golden': 'gold',
    'CloudPurple': 'purple',
    'CloudCyan': 'cyan',
    'CloudRed': 'red',
    'CloudBlue': 'blue',
    'CloudWhite': 'white',
    'Poker_Chip_Base_Red': 'red',
    'Poker_Chip_Black': 'black',
    'Poker_Chip_Blue': 'blue',
    'Poker_Chip_Brown': 'brown',
    'Poker_Chip_Green': 'green',
    'Poker_Chip_Pink': 'pink',
    'Poker_Chip_Purple': 'purple',
    'Poker_Chip_Yellow': 'yellow',
    'Poker_Chip_YellowBlack': 'yellowblack',
}


dietype2typeprefix = {
    'DieType::D6': 'D6',
    'DieType::D6 Round': 'D6R',
}

# Currently there are three Loot Pools:
#
# Lootpool1: Inventory_BlowgunBlowTime1_C
# Lootpool2: Inventory_DashDamage_C, Inventory_DashBurstRange_C, Inventory_ToothpickDamage_C, Inventory_MaxHealth_C
# Lootpool3Money: Inventory_Coin3_C
