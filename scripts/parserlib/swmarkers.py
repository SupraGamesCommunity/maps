from pathlib import Path
from typing import Any, Optional

from mathutils import Matrix, Vector
from PIL import Image

from .config import config
from .fileio import load_json_file, save_json_file, load_blueprint_keys
from .ueenum import load_all_enumbp
from .swgamedefs import ea_filter, ea_fogfile, ea_proggroups, ea_areas, ea_abilities, ea_fog_bounds
from .swgamedefs import ea_fog_pixels, ea_fog_width, ea_fog_height, swcoin_defaults
from .swgamedefs import tracked_staticmeshes, staticmesh2variant, material2variant, dietype2typeprefix
from .utils import get_end_int
from .utils import getVec, getRot, getQuat
from .utils import objectRefStr, objectRef

sw_blueprint_keys_used = [
    'RequiredAbilities',
    'Area',
    'ProgressionGroup',
    'AdditionalRequirementHints',
    'AdditionalRequirements',
    'DieType',
    'Value',
    'CoinValue',
    'Coins',
    'CoinPool',
    'Cost',
    'Pickup Class',
    'CustomShopItem',
    'InventoryItem',
    'Initial Shop Inventory',
    'SupraworldLaunchComponent',
    'FrontSupraworldLaunchComponent',
    'BackSupraworldLaunchComponent',
    'AltLaunchComp',
    'SpawnerTags',
    'Spawn on Level Start',
    'DisplayName',
    'DisplayDescription',
    'Color',
    'Color_Initial',
    'Initial_Color',
    'ButtonColor',
    'LiquidColor',
    'RuneColor',
    'bHidden',
    'bHiddenInGame',
    'bInitialExists',
    'bExists',
    'Spawn on Level Start',
    'bItemIsAvailable_Initial',
]


# Load in a PNG file containing RGB values
def load_ea_fog(path: Path) -> bool:
    path = path.joinpath('mapimg', ea_fogfile)
    if not path.exists():
        print(f'Warning: Failed to load fog png ({path})')
        return False
    else:
        with Image.open(str(path)) as im:
            global ea_fog_width, ea_fog_height, ea_fog_pixels
            ea_fog_width = im.width
            ea_fog_height = im.height
            ea_fog_pixels = im.getchannel(0).load()
        return True


def in_earlyaccess(otype, p, pos):  # noqa: C901 - disable complexity warning
    if not ea_filter:
        return True

    # If it has a progression and it's not in released content then reject
    if (
        (proggroup := p.get('ProgressionGroup', {}).get('TagName'))
        and proggroup != 'None'
        and not any(proggroup.endswith(s) for s in ea_proggroups)
    ):
        return False

    # If it has an area that's not
    if (
        (swarea := p.get('Area', {}).get('TagName'))
        and swarea != 'None'
        and not any(swarea.endswith(s) for s in ea_areas)
    ):
        return False

    # Some classes should be rejected if they have no area tag
    if not swarea and otype in ['SecretVolume_C']:
        return False

    # Check if it requires abilities not yet released
    if required := p.get('RequiredAbilities'):
        for r in required:
            if isinstance(r, str) and not any(r.endswith(s) for s in ea_abilities):
                return False

    if ea_fog_pixels:
        xmin, ymin, xmax, ymax = ea_fog_bounds
        if xmin < pos.x < xmax and ymin < pos.y < ymax:
            px = (pos.x - xmin) / (xmax - xmin) * ea_fog_width
            py = (pos.y - ymin) / (ymax - ymin) * ea_fog_width
            if ea_fog_pixels[px, py] < 255:
                return False

    # Should probably check pos against a cuboid but not yet
    return True


def export_sw_markers(game: str, datadir: Path, sourcedir: Path):  # noqa: C901 - disable complexity warning
    maps = {}  # dictionary from map name to json data list
    toyeggs = {}  # Collected chocolate eggs
    staticmeshes = {}  # dictionary from outer name to static mesh name
    meshmats = {}  # dictionary from outer name to mesh material variant
    targets = {}  # dictionary from outer name to target positions
    area_mtx = {}  # Transform for each area map geometry
    data = []  # Output marker data

    # Load in any enumerations we have found / extracted
    ueenums = load_all_enumbp(path=sourcedir.joinpath('enums'))

    bp_defaults = load_blueprint_keys(
        sourcedir=sourcedir, def_keys=sw_blueprint_keys_used, type_keys={"InvFrag_SupraworldShopItem": ["Cost"]}
    )

    # Phase 1: Read all the map json files in and build a look up table for references
    # Also get any area/map file matrices (for streaming levels)
    for area in config[game]['maps']:
        # Store the map data
        maps[area] = load_json_file(path=sourcedir.joinpath('levels', f"{area}.json"))

        # Go through all objects in the map data and store lookups for later
        for oidx, o in enumerate(maps[area]):
            if not (outer := o.get('Outer')) or not (p := o.get('Properties')):
                continue
            oname = o['Name']
            otype = o['Type']

            # Keep list of static meshes by parent/outer
            if otype == 'StaticMeshComponent':
                if (sm := p.get('StaticMesh', {}).get('ObjectName')) and (
                    sm := sm.split("'")[-2]
                ) in tracked_staticmeshes:
                    staticmeshes[outer] = sm
                    if sm in staticmesh2variant:
                        meshmats[outer] = staticmesh2variant[sm]

                if oms := p.get('OverrideMaterials'):
                    for om in oms:
                        if (
                            om
                            and (v := om.get('ObjectName'))
                            and (v := material2variant.get(v.split("'")[-2].split('.')[-1]))
                        ):
                            meshmats[outer] = v

            # Keep list of Chocolate Egg interior objects
            if otype == 'ChocolateEgg_C' and (v := p.get('ToyEgg')):
                toyeggs[objectRefStr(v)] = o

            # Keep a list of launch target positions
            # I was filtering based on name but it's not reliable indicator of class
            # some rubber bands have name 'StaticMashActor_...' for example
            # and outer[0:outer.find("_C")+2] in travel_types): name
            if (
                otype == 'SupraworldLaunchComponent_C'
                and (tl := p.get('TargetLocation'))
                and not oname == 'AltLaunchComp'
            ):  # For now remove Jumppad_TwoPath_C 2nd path
                targets[outer] = [*targets.get(outer, []), {'x': tl['X'], 'y': tl['Y'], 'z': tl['Z']}]

            # For maps that are divided into multiple files, there may be a LevelTransform for entities in that
            # file relative to the persistent world that is handled by the streaming system. To correct for this
            # we construct a matrix from the Translation/Rotation members if they exit
            if (a := p.get('WorldAsset', {}).get('AssetPathName')) and (t := p.get('LevelTransform')):
                area_mtx[a.split('.').pop()] = (
                    Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()
                )

    game_classes = load_json_file(path=datadir.joinpath('gameClasses.json'))

    load_ea_fog(path=sourcedir)

    # Phase 2: Go through all the objects which have types we're interested in
    for area in maps:
        for oidx, o in enumerate(maps[area]):
            otype = o['Type']
            oname = o['Name']
            if not (outer := o.get('Outer')) or not (p := o.get('Properties')):
                continue

            if otype in bp_defaults:
                p = bp_defaults[otype] | p

            def getObject(p):
                ref = objectRef(p)
                return maps[ref[0]][ref[1]]

            def get_matrix(o, matrix=Matrix.Identity(4)):
                p = o.get('Properties', {})

                if p.get('RelativeLocation'):
                    matrix = (
                        Matrix.LocRotScale(
                            getVec(p.get('RelativeLocation')),
                            getRot(p.get('RelativeRotation')),
                            getVec(p.get('RelativeScale3D'), 1),
                        )
                        @ matrix
                    )

                for prop in ['RootObject', 'RootComponent', 'DefaultSceneRoot', 'AttachParent']:
                    if p.get(prop):
                        return get_matrix(getObject(p[prop]), matrix)
                '''
                    node = p.get(parent)
                    if type(node) is dict:
                        obj = getObject(node)
                        if type(obj) is dict:
                            return get_matrix(obj, matrix);
                '''
                return matrix

            matrix = get_matrix(o)
            if area in area_mtx:
                matrix = area_mtx[area] @ matrix
            pos = matrix.to_translation()

            # Check for early access based on type, properties and map position
            if not in_earlyaccess(otype, p, pos):
                continue

            # If this is a shop egg inside a chocolate egg then skip it (ChocolateEgg_C)
            if toyeggs.get(area + '.' + str(oidx)):
                continue

            # Convert poker chip static meshes to custom Poker Chip class
            if (v := staticmeshes.get(oname)) and v == 'Poker_Chip_1':
                otype = '_PokerChip_C'

            # Add the standard data to the object
            data.append({'name': oname, 'type': otype, 'area': area, 'lat': pos.y, 'lng': pos.x, 'alt': pos.z})

            # Hidden Flag
            if (
                p.get('bHidden') is True
                or p.get('bHiddenInGame') is True
                or p.get('bExists') is False
                or p.get('InitialExists') is False
                or p.get('Spawn on Level Start') is False
                or p.get('bItemIsAvailable_Initial') is False
            ):
                data[-1]['hidden'] = 'true'

            # Handle the Obvious Area secret
            comment = None
            if o.get('ActorLabel') == "ObviousAreaOuttaTown":
                # p['Area'] = {'TagName': 'OutskirtsStartTown'}
                comment = 'Obvious Area'

            variant = ''
            # Variants from colours or override materials
            for colkey in ['RuneColor', 'Color', 'Color_Initial', 'LiquidColor', 'ButtonColor']:
                if (color := p.get(colkey)) and isinstance(color, str):
                    color = ueenums.ue2source(color, color)
                    variant = color.removeprefix("ESupraColors::").lower()
                    break

            # Currently gold screws, puzzle cloud's and poker chips
            if v := meshmats.get(oname):
                variant = v

            if otype == 'SupraworldPlayerStart_C':
                variant = 'red'

            # Only keep gold variant of Nailscrew_C
            if otype == 'Nailscrew_C' and variant != 'gold':
                del data[-1]
                continue

            if variant:
                data[-1]['variant'] = variant

            # If it's a D6 or D6 Round then change the class (could use variant but might have coloured die in future)
            if otype == 'Die_C' and (v := dietype2typeprefix.get(p.get('DieType'))):
                data[-1]['type'] = v + ':' + otype

            if otype == 'HayGuy_C' and p.get('Collectible Tag', {}).get('TagName') == 'Stats.Collectible.Thread':
                data[-1]['type'] = '_ThreadGuy_C'

            # Solve clashes with old game classes
            if otype in ['Jumppad_C', 'KeyPlastic_C']:
                data[-1]['type'] = 'SW:' + otype

            # Grab the Area (or AreaTag) if there is one
            if v := p.get('Area', p.get('AreaTag', {})).get('TagName'):
                data[-1]['area_tag'] = v.split('.')[-1]

            # Grab progression tag
            if (v := p.get('ProgressionGroup', {}).get('TagName')) and v != "None":
                data[-1]['prog_tag'] = v.removeprefix('Supraworld.Story.').replace('.', ':')

            # Grab secret required abilities if there are any
            if otype == 'SecretVolume_C' and (v := p.get('RequiredAbilities')):
                data[-1]['abilities'] = ','.join(
                    [a.removeprefix('GameplayAbilitySystem.Ability.').replace('.', ' ') for a in v]
                )

            # If this is a chocolate egg then get the spawn property from the related toy egg (which will not be included)
            spawn_props = p
            if otype == 'ChocolateEgg_C' and (v := p.get('ToyEgg')):
                spawn_props = getObject(v)['Properties']

            # Spawners (presents, shops, eggs, launch boxes, ...)
            spawns = ''
            if v := spawn_props.get('Pickup Class'):
                spawns = v['ObjectName'].split("'")[-2]
            elif (v := spawn_props.get('InventoryItem')) or (v := spawn_props.get('CustomShopItem')):
                spawns = v['AssetPathName'].split(".")[-1]
            if spawn_props.get('bFromLootPool'):
                spawns = '_LootPool_C'

            # Cost
            if (v := bp_defaults.get(spawns, {}).get('Cost')) and otype in [
                'ShopItemSpawner_C',
                'ShopEgg_C',
                'ChocolateEgg_C',
                'ShopSlot_C',
            ]:
                data[-1]['cost'] = v

            # These classes just spawn stuff so we change the type to what it spawns
            if otype in [
                'ItemSpawner_C',
                'PickupSpawner_C',
                'ShopItemSpawner_C',
                'RespawnablePickupSpawner_C',
                'ShopSlot_C',
            ]:
                data[-1]['type'] = otype = spawns
                spawns = ''

            # Coins
            # Anything that spawns Inventory_Coin[nn]_C or RealCoinPickup_C/5Cent_C/Gumball_Machine_C
            coins = 0
            if (v := swcoin_defaults.get(otype)) or (v := swcoin_defaults.get(spawns)):
                coins = v
            if (v := p.get('Value')) and v.startswith('CoinValue::'):  # RealCoinPickup_C/5Cent_C
                coins = int(get_end_int(ueenums.ue2source(v, v)))
            if v := p.get('CoinPool'):  # Gumball_Machine_C
                coins = v
            if coins:
                data[-1]['coins'] = coins
                if spawns != '':
                    data[-1]['type'] = 'Coin:' + data[-1]['type']
                    spawns = ''

            # Loot boxes default to spawning loot pools
            if otype == 'PresentBox_Lootpools_C' and not (coins or spawns):
                spawns = '_LootPool_C'

            if spawns:
                data[-1]['spawns'] = spawns

            elif otype in ['ShopEgg_C', 'ChocolateEgg_C']:
                # Remove any empty eggs
                del data[-1]
                continue

            def filter_targets(objpos, targets, mindist):
                ov = Vector((objpos['lng'], objpos['lat'], objpos['alt']))
                keep = [
                    target
                    for target in targets
                    if (Vector((target['x'], target['y'], target['z'])) - ov).magnitude >= mindist
                ]
                return keep

            # Travel targets
            if oname in targets and (v := filter_targets(data[-1], targets[oname], 600)):
                data[-1]['targets'] = v
                data[-1]['linetype'] = 'target'

            # Type may have been modified, so only check for it at the end
            otype = data[-1]['type']

            def class_supported(otype, game):
                return (gc := game_classes.get(otype)) and gc.get('layer') and game in gc.get('games', [])

            if not class_supported(otype, game) or spawns and not class_supported(spawns, game):
                del data[-1]
                continue

            if comment:
                data[-1]['comment'] = comment

    save_json_file(data=data, path=datadir.joinpath(f'markers.{game}.json'))
    print("Done")
