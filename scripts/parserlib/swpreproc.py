from pathlib import Path
from .fileio import load_json_file, save_json_file, save_text_file, load_filelist, save_assetlist
from .ueenum import isenum, isueenum, load_all_enumbp


# We presume export.cmd has been used to export a set of map files for the game to
# a sub-directory of 'sourcedir'. We are going to go through the map and generate
# information about the
def preproc_levels(game: str, datadir: Path, sourcedir: Path) -> None:  # noqa: C901 - disable complexity warning

    # Load in any enumerations we have found / extracted
    ueenums = load_all_enumbp(path=sourcedir.joinpath('enums'))

    # Load current gameClasses.json so we know which classes we currently know about for this game
    game_classes = load_json_file(path=datadir.joinpath('gameClasses.json'))

    # Load the game's PAK file list so we can look up where to find enums
    gamefilelist = load_filelist(path=sourcedir)

    # Set of blueprint CUE4Parse asset paths for types in gameClasses.json
    # and set of other classes which end in _C
    bp_assetlist = set()
    area_names = set()
    ignored_types = set()
    classprops = {}

    # Set of property:type pairs for all key:value pairs in game maps
    propset = {'Root': set(), 'Properties': set(), 'Other': set()}

    # Loop through all the level json's we've extracted
    for filename in sourcedir.joinpath('levels').glob('*.json'):
        # Area name is everything between last '\' and the '.json'
        filestr = str(filename)
        area = filestr[filestr.rfind('\\') + 1 : -5]
        area_names.add(area)

        # Read the level file in and loop through the outer list of objects)
        level = load_json_file(path=filename)
        level_changed = False
        for obj in level:
            if (
                not (otype := obj.get('Type'))
                or not (oname := obj.get('Name'))
                or not (obp := obj.get('Class').split("'")[1].split('.')[0])
            ):
                print(f'Warning: Object missing something in {filename} Type:{otype} Name:{oname} BP:{obp}')
                continue

            # Collect any classes which use the properties we're interested
            if p := obj.get('Properties'):
                for prop in [
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
                ]:
                    if prop in p:
                        classprops[otype] = set([*list(classprops.get(otype, set())), prop])

            # Remember blueprint paths of types we're interested in
            # And the base type of any other custom types
            # Note: old SL based game classes don't necessarily have games member
            if otype in game_classes and game in game_classes[otype].get('games', ['sl', 'slc', 'siu']):
                bp_assetlist.add(obp if obp[0] != '/' else obp[1:])
                p = obj['Properties']
                # Collect those classes we're interested that use these properties
                for prop in [
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
                ]:
                    if prop in p:
                        classprops[otype] = set([*list(classprops.get(otype, set())), prop])
            elif otype.endswith('_C'):
                ignored_types.add(otype)

            # Walk all data in the level remembering property names/types
            # Any enum types used and if possible remap enum attributes to source names
            def gather_properties(obj: dict, setkey: str):
                nonlocal level_changed

                for ref, value in obj.items() if isinstance(obj, dict) else enumerate(obj):
                    proptype = type(value).__name__
                    if isenum(value):
                        proptype = value[0 : value.find('::')]
                        ueenums.addueattr(value)
                        if isueenum(value):
                            if source := ueenums.ue2source(value):
                                obj[ref] = source
                                level_changed = True

                    if isinstance(obj, dict):
                        otype = None
                        if ref == 'ObjectName' and value.startswith('BlueprintGeneratedClass'):
                            otype = value.split("'")[1]
                            obp = obj['ObjectPath'].split('.')[0]
                        if ref == 'AssetPathName' and value and '.' in value:
                            obp, otype = value.split('.')
                        if otype:
                            if (
                                otype == 'Jumppad_C'
                                or otype in game_classes
                                and game in game_classes[otype].get('games', ['sl', 'slc', 'siu'])
                            ):
                                bp_assetlist.add(obp if obp[0] != '/' else obp[1:])
                            elif otype.endswith('_C'):
                                ignored_types.add(otype)
                            continue
                        propset[setkey].add(ref + ':' + proptype)

                    if isinstance(value, (dict, list)):
                        gather_properties(obj=value, setkey='Properties' if ref == 'Properties' else 'Other')

            gather_properties(obj=obj, setkey='Root')

        # If we changed this level map's enumerations then write it out again
        if level_changed:
            save_json_file(data=level, path=filename)

    save_assetlist(items=bp_assetlist, filelist=gamefilelist, path=sourcedir.joinpath('bpassetlist.txt'))
    save_assetlist(
        items=ueenums.types, filelist=gamefilelist, path=sourcedir.joinpath('enumassetlist.txt'), prefer="Enums"
    )
    save_text_file(lines=sorted(area_names), path=sourcedir.joinpath("areanames.txt"))

    for k, v in classprops.items():
        classprops[k] = sorted(list(v))
    levelprops = {
        "ClassProps": dict(sorted(classprops.items())),
        "IgnoredTypes": sorted(list(ignored_types)),
        "EnumTypes": sorted(list(ueenums.types)),
        "EnumValues": ueenums.map,
        "RootProps": sorted(list(propset['Root'])),
        "Properties": sorted(list(propset['Properties'])),
        "OtherProps": sorted(list(propset['Other'])),
    }
    save_json_file(data=levelprops, path=sourcedir.joinpath('levelprops.json'))
