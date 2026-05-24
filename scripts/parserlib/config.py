# Data about each game based on the game code sl, slc, siu, sw
#
# appid     Steam application id
# pathmap   gives the mapping for file references that is used
#           by ObjectName/ObjectPath and AssetPathName/SubPathString
# maps      gives the name of the maps that we're actually interested in
config = {
    'sl': {
        'appids': ['813630'],
        'basename': 'Supraland',
        'pathmap': {
            'Game': 'Supraland/Content',
        },
        'maps': ['Map'],
    },
    'slc': {
        'appids': ['813630'],
        'basename': 'Supraland',
        'pathmap': {
            'Game': 'Supraland/Content',
        },
        'maps': ['Crash'],
    },
    'siu': {
        'appids': ['1522870'],
        'basename': 'SupralandSIU',
        'pathmap': {
            'Game': 'SupralandSIU/Content',
        },
        # Note: we don't include DLC2_Menu_Splash anymore as
        # it we find one secret and one pipe both of which are not usable
        # DLC2_LateChanges was added more recently
        'maps': [
            'DLC2_Complete',
            'DLC2_FinalBoss',
            'DLC2_Area0',
            'DLC2_SecretLavaArea',
            'DLC2_PostRainbow',
            'DLC2_Area0_Below',
            'DLC2_RainbowTown',
            'DLC2_Splash',
            'DLC2_Menu',
            'DLC2_LateChanges',
        ],
    },
    'sw': {
        'appids': ['1869290', '1869291'],
        'basename': 'Supraworld',
        'pathmap': {
            'Game': 'Supraworld/Content',
            'Supraworld': 'Supraworld/Plugins/GameFeatures/Supraworld/Supraworld/Content/',
            'SupraAssets': 'Supraworld/Plugins/Supra/SupraAssets/Content/',
            'SupraCore': 'Supraworld/Plugins/Supra/SupraCore/Content/',
        },
        'maps': ['Supraworld'],
    },
}
