# Variant names for the colours of keys, keycards, flowers, seeds...
colors = {
    0: 'white',  # FFFFFF
    1: 'yellow',  # FFFF66
    2: 'red',  # FF0000
    3: 'blue',  # 1E90FF
    4: 'purple',  # 9933ff
    5: 'green',  # 4DFF00
    6: 'orange',  # ff9900
}

# Variant names for minecraft bricks
brick_types = {
    0: 'stone',
    1: 'obsidian',
    2: 'metal',
    3: 'diamond',
    4: 'gold',
}

price_types = [
    "coin",
    "coal",
    "iron",
    "diamond",
    "supranium",
    "scrap",
    "bone",
]

# Which properties we allow to be exported for each instance
exported_properties = [
    'name',
    'type',
    'area',
    'lat',
    'lng',
    'alt',  # all instances have these
    'spawns',  # generates some other class (chest or quest)
    'coins',  # generates coins when taken (coin chest, pots, bricks and various coin types)
    'cost',
    'price_type',  # cost when purchased (shops, quests...) and units (defaults to coins)
    'icon',  # explicit icon override
    'variant',  # variant allows change of marker
    'friendly',  # Friendly name for the marker
    'other_pipe',  # For pipes we store the pipe at the other end
    'nearest_cap',  # Nearest pipecap we are connected to if there is one
    'other_pad',  # For two way pads we store the pad at the other end
    'linetype',  # Trigger, pad, pipe, target
    'twoway',  # Pipe or pad is two way if True
    'notsaved',  # Pipe or pad is not saved
    'target',  # where to draw line to for pipes and pads
    'targets',  # array of dictionaries 'type' and target position
    'old_coins',  # For _CoinStack_C's a dictionary of old coin name to value (for save game handling)
    'scrapamount',  # For Scrap_C gives amount of scrap
    # 'image',
    'yt_video',
    'yt_start',
    'yt_end',  # data pulled from matched legacy data
]
