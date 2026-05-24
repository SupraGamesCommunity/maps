from argparse import ArgumentParser
from os import environ
from pathlib import Path
from typing import Any, Optional

from parserlib.localisation import export_class_loc, export_loc_files
from parserlib.slmarkers import export_markers
from parserlib.swmarkers import export_sw_markers
from parserlib.swpreproc import preproc_levels
from parserlib.swversion import update_swversion_info


def main() -> None:
    parser = ArgumentParser()

    # game, data and source directory used by all commands
    parser.add_argument('-g', '--game', choices=['sl', 'slc', 'siu', 'sw'], default='sw', help='game name')
    parser.add_argument('-d', '--data', default='..\\public\\data', help='output json data directory')
    parser.add_argument('-s', '--source', default='..\\source', help='location of game data needed by command')

    # these are the core operations
    parser.add_argument('-p', '--preproc', action='store_true', help='preprocess level files to gather ')
    parser.add_argument('-m', '--markers', action='store_true', help='export markers as json (need json levels)')
    parser.add_argument(
        '-v', '--version', action='store_true', help='update version information (set source to install directory)'
    )
    parser.add_argument('-o', '--loc', action='store_true', help='extract required loc strings for game')
    args = parser.parse_args()

    # Grab source directory and cleanup slc differences
    sourcedir = args.source
    if sourcedir == '..\\source':
        sourcedir += '\\' + (args.game if args.game != 'slc' else 'sl')
    if sourcedir.endswith('\\slc'):
        sourcedir = sourcedir[:-1]

    datadir = Path(args.data)
    sourcedir = Path(sourcedir)
    if args.preproc:
        preproc_levels(game=args.game, datadir=datadir, sourcedir=sourcedir)
    elif args.markers:
        if args.game == 'sw':
            export_sw_markers(game=args.game, datadir=datadir, sourcedir=sourcedir)
        else:
            export_markers(game=args.game, datadir=datadir, sourcedir=sourcedir)
    elif args.version:
        if args.game == 'sw':
            if not args.source:
                sourcedir = Path(environ.get('SWROOT'))
            update_swversion_info(
                game=args.game, datadir=datadir, sourcedir=sourcedir, mapimage=environ.get('SWMAPIMAGE')
            )
    elif args.loc:
        # Read the blueprint files to get the keys we need and then process the loc strings
        export_class_loc(game=args.game, datadir=datadir, sourcedir=sourcedir)
        export_loc_files(game=args.game, datadir=datadir, sourcedir=sourcedir)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
