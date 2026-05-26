from pathlib import Path
import re
from typing import Any, Optional

from .config import config
from .fileio import load_json_file, save_json_file
from .utils import get_ints

try:
    import win32com.client
except ModuleNotFoundError:
    pass


# Retrieve Unreal version information from the EXE file properties using
# windows shell API. These are the properties on the file properties -> details
# tab in explorer.
# The API NameSpace.GetDetailsOf usually has a fixed index to properties relationship,
# but only some seem to be officially documented, we're after the 'File version' and
# may at some point need 'Product version'. We've now seen two different indices for
# 'File version' so we search rather than use a hard coded index and log the info for
# awareness.
def get_unreal_version(exepath: Path) -> dict[str, int]:
    uever = {}
    sh = win32com.client.gencache.EnsureDispatch('Shell.Application', 0)
    ns = sh.NameSpace(str(exepath.parent))
    item = ns.Items()[exepath.name]

    print(f"Retrieving UE version from '{exepath}'")
    file_version_indices = [166, 167]
    product_version_indices = [301]

    # Search all commonly used indices. We could probably narrow this range as many are fixed
    for i in range(350):
        # Calling GetDetailsOf with the file name (or None) gets you the property name for index
        prop = ns.GetDetailsOf(item.Name, i)
        if 'version' in prop.lower():
            # Calling GetDetailsOf with the item gets you the value of the property
            value = ns.GetDetailsOf(item, i)

            if 'product' in prop.lower():
                print(
                    f"'{prop}' index={i} ({value}) {'** unexpected index' if i not in product_version_indices else ''}"
                )

            if 'file' in prop.lower():
                print(f"'{prop}' index={i} ({value}) {'** unexpected index' if i not in file_version_indices else ''}")
                file_version = value

    if not file_version:
        print(f'Error: Failed to find file version for {exepath}')
        exit(-1)

    uever['ver'] = ns.GetDetailsOf(item, 167)
    vernums = uever['ver'].split('.')
    uever['major'] = int(vernums[0])
    uever['minor'] = int(vernums[1])
    return uever


# Retrieves the steam branch name
def get_steam_branch(game: str, path: Path) -> str:

    # Get path to app manifest from game install path and appid
    basepath = str(path)[0 : str(path).find('common')]
    for appid in config[game]['appids']:
        manifest = Path(f'{basepath}appmanifest_{appid}.acf')

        # If the file exists, open it and read contents
        if manifest.is_file():
            print(f"Retrieving branch from '{manifest}'")
            # Search for the current user config beta key
            if match := re.search(r'UserConfig"[\s\S]*?"BetaKey"\s*"([^"]*)', manifest.read_text()):
                return match.group(1)

    return 'public'


def get_swbuild_info(installdir: Path) -> dict[str, str]:
    print(f"Retrieving build info from '{installdir}\\build.vc'")
    with installdir.joinpath('build.vc').open('r') as file:
        build = file.readline().rstrip()
        date = file.readline().rstrip()
    return {"build": build, "date": date}


# Update Supraworld version information based on steam version installed in 'installdir'
def update_swversion_info(game: str, datadir: Path, sourcedir: Path, mapimage: Optional[str] = None) -> None:

    versions = load_json_file(path=datadir.joinpath('versions.json'))

    # versions JSON looks something like this:
    # {
    #     ...
    #     "sw": {
    #         "ue": {"major": 5, "minor": 6, "ver": "5.6.1.0" },
    #         "game": {"version": "EarlyAccess", "build": 10596, "date": "08/04/2026 - 13:37 UTC", "branch": "public", "type": "Shipping", "mapver": "V8" }
    #     }
    # }

    basename = config['sw']['basename']
    exe_file = Path(list(sourcedir.joinpath(basename, 'Binaries\\Win64').glob(f"{basename}-Win64*.exe"))[0])

    uever = get_unreal_version(exepath=exe_file)
    versions['sw']['ue'].update(uever)

    gamever = get_swbuild_info(installdir=sourcedir)
    gamever['branch'] = get_steam_branch(game='sw', path=sourcedir)
    gamever['type'] = exe_file.stem.split('-')[-1]

    if mapimage:
        gamever['mapver'] = 'V' + str(get_ints(mapimage)[0])

    versions['sw']['game'].update(gamever)

    save_json_file(data=versions, path=datadir.joinpath('versions.json'))

    print("SW Version: ", f'{gamever | {'ue': uever['ver']}}')  # version, build, date, branch, type, mapver
