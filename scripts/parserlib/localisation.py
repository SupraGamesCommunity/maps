from pathlib import Path
from typing import Any, Optional

from .fileio import load_json_file, save_json_file


# Read's gameClasses.json and then tries to find friendly names and descriptions and their
# corresponding loc keys by reading the corresponding blueprint files looking for the strings
# It avoids overwriting values in gameClasses
#
# SIU and SL share class names, so we use the same strings for both, which one is chosen depends
# on which is read first (traditionally SL then SIU)
#
# For some things we didn't find the strings/keys in the blueprint but hand added the values
# by finding the strings in the loc data.
#
# Further edits were made to the strings/keys to make a few fixups to the english
def export_class_loc(game: str, datadir: Path, sourcedir: Path) -> None:  # noqa: C901 - disable complexity warning

    game_classes = load_json_file(path=datadir.joinpath('gameClasses.json'))

    classes = set()
    propcount = 0
    propmatches = 0

    def optKeyLoc(class_name: str, k: str, v):
        nonlocal propcount, propmatches
        if v:
            if class_name not in game_classes:
                game_classes[class_name] = {}
            classes.add(class_name)
            propcount += 1
            if k not in game_classes[class_name]:
                print(f'{class_name}.{k} => "{v}"')
                game_classes[class_name][k] = v
            elif game_classes[class_name][k] == v:
                propmatches += 1
            else:
                print(f'{class_name}.{k} == "{game_classes[class_name][k]}" != "{v}"')

    def is_class_used(cls_name):
        return cls_name in game_classes and game in game_classes[cls_name].get('games', ['sl', 'slc', 'siu'])

    # Loop through all the blueprint files we find that are referenced in gameClasses.json
    for blueprint_file in sourcedir.joinpath('bp').glob('*.json'):
        cls_name = blueprint_file.stem + '_C'
        if not is_class_used(cls_name):
            continue

        blueprints = load_json_file(path=blueprint_file, quiet=True)

        def bp_may_have_strings(bp):
            return ((otype := bp.get('Type')) == cls_name or otype == 'TextRenderComponent') and 'Properties' in bp

        # Loop through array of blueprints from json file that may have strings
        for bp in (bp for bp in blueprints if bp_may_have_strings(bp)):

            # Loop through game classes for that include the base class name (handles something like 'Coin:Chest_C')
            for gc in (c for c in game_classes if cls_name in c):
                props = bp['Properties']

                if props.get('Text'):
                    optKeyLoc(class_name=gc, k='friendly', v=props['Text'].get('SourceString'))
                    optKeyLoc(class_name=gc, k='friendly_key', v=props['Text'].get('Key'))

                if props.get('UpgradeName'):
                    optKeyLoc(class_name=gc, k='friendly', v=props['UpgradeName'].get('SourceString'))
                    optKeyLoc(class_name=gc, k='friendly_key', v=props['UpgradeName'].get('Key'))

                if props.get('UpgradeDescription'):
                    optKeyLoc(class_name=gc, k='description', v=props['UpgradeDescription'].get('SourceString'))
                    optKeyLoc(class_name=gc, k='description_key', v=props['UpgradeDescription'].get('Key'))

    print("Classes: ", len(classes), "Props: ", propcount, "Matches: ", propmatches)
    save_json_file(data=game_classes, path=datadir.joinpath('gameClasses.json'))


# Read custom-loc.json and merge it into gameClasses.json and write it out
# Then collect all the keys found the various frontend data files and
# come up with a stripped down version of the loc files with the keys for
# all of them
def export_loc_files(game: str, datadir: Path, sourcedir: Path) -> None:  # noqa: C901 - disable complexity warning
    # Merge custom-loc.json into gameClasses.json
    print('Merging custom-loc.json into gameClasses.json...')
    classes = load_json_file(path=datadir.joinpath('gameClasses.json'))
    customLoc = load_json_file(path=datadir.joinpath('custom-loc.json'))
    for c, d in customLoc.items():
        classes[c] = classes[c] | d
    save_json_file(data=classes, path=datadir.joinpath('gameClasses.json'))

    # Make a list of the keys that are referenced in the various files
    keys = set()
    key_files = [
        'gameClasses.json',
        'layerConfigs.json',
        'custom-loc.json',
        f'markers.{game}.json',
        f'custom-markers.{game}.json',
    ]
    print('Reading files to determine loc keys required...')
    for fn in key_files:
        path = datadir.joinpath(fn)
        if path.exists():
            data = load_json_file(path=path)
            for entry in data if type(data) is list else data.values():
                for k in ['friendly_key', 'name_key', 'description_key', 'key']:
                    if entry.get(k):
                        keys.add(entry[k])

    print(f'Found {len(keys)} keys')

    print('Writing loc files to data directory')

    # Loop through all languages present
    for loc in sourcedir.joinpath('loc').glob('*/'):
        loc_file = datadir.joinpath(f'loc/locstr-{loc.name}.json')

        # Read existing keys if there are any
        usedlocstr = load_json_file(path=loc_file) if loc_file.exists() else {}

        # Read the games data for this language and add key/string pairs that we're interested in
        # Note: for some reason file is of the form { "": {"loc key": "loc string"...  } } so
        # get the dictionary entry for key ''
        locstr = load_json_file(path=sourcedir.joinpath(f'loc/{loc.name}/Game.json'))['']
        for k in locstr.keys():
            if k in keys:
                usedlocstr[k] = locstr[k]

        save_json_file(data=usedlocstr, path=loc_file)
