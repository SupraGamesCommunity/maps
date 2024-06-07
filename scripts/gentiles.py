#!/usr/bin/env python3
"""
GENERATE SLIPPY MAP TILES
Jeff Thompson | 2016 | jeffreythompson.org
Dan Davis     | 2021 | danizen.net - conversion to Python 3 and Pillow
Joric         | 2022 | jpeg output, 0 scale level

Takes a large image as the input, outputs map tiles
at the appropriate size and file structure for use
in frameworks like leaflet.js, MapBox, etc.

ARGS:
input_file      large image file to split (JPG, PNG, or TIFF)
zoom_level              zoom level(s) to generate (0 to 18); either 
            integer or range (ex: 2-6)
output_folder           folder name to write tiles to (will be created 
            if does not exist)

OPTIONAL:
-h, --help              show this help message and exit
-w --resize_width   dimension in pixels for outputted tiles (default 256px)
-q, --quiet             suppress all output from program (useful for 
            integrating into larger projects)

DETAILS:
Resulting tiles are 256px square, regardless of the
size of the source image. The number of tiles wide/
high is determined by the "zoom level", which is
2^zoom. In other words, a zoom level of 3 = 8 tiles,
each resized to 256 pixels square.

Way more info here:
http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Resolution_and_Scale

REQUIRES:
ImageMagick and Python bindings for splitting 
images, resizing tiles, etc
http://www.imagemagick.org
https://github.com/ahupp/python-magic

FILE STRUCTURE
Slippy maps require tiles to be stored in a specific
file structure:
    output_folder/zoom_level/x/y.png

This is the standard arrangement (some frameworks let
you specify others), and should be noted in your Javascript.
For example, if using leaflet.js, you would use:
    tiles/{z}/{x}/{y}.png

ADDING MORE ZOOM LEVELS
Want to add more levels? Just run this script again; it 
will append the new zoom level to the same location.

CREATING A SOURCE IMAGE
If combining many smaller images, the easiest method
is to use ImageMagick's 'montage' command.

Your images should be the same size, or at least the
same height. You can do this using ImageMagick as well:
    mogrify -geometry x400 *.jpg

Arguments:
    x400            height to set images to
    *.jpg           gets all jpg images from a folder

Then combine into a single image:
    montage *.jpg -gravity center -tile NxN -geometry +0+0 output.jpg

Arguments:
    *.jpg           gets all jpg images from a folder
    -gravity        centers rows/columns
    -tile           how many images per row/column in final image
    -geometry       no extra space between images (or +N+N for padding)
    -background     none or "rgb(255,255,255)"
    output.jpg      output filename and format

VERY LARGE IMAGES:
When working with extra big images, ImageMagick makes
some suggestions where RAM may run out:
http://www.imagemagick.org/Usage/files/#massive
"""
import argparse
import glob
import logging
import math
import os
import re
import shutil
import sys
from argparse import ArgumentParser, ArgumentError
from pathlib import Path

from PIL import Image, UnidentifiedImageError

LOG = logging.getLogger('gentiles')


def power_of(num, base):
    """checks if a number is a power another"""
    while(num % base == 0):
        num = num / base
    return num == 1


def generate(image, outpath, zoom_level, resize_width, format='png'):
    """
    generates map tiles from large image
    """

    # how many tiles will that be?
    num_tiles = 1 << zoom_level
    LOG.info('Zoom level ' + str(zoom_level) + ' = ' + str(num_tiles) + ' tiles')

    # get image dims (without loading into memory)
    # via: http://stackoverflow.com/a/19035508/1167783
    LOG.info('Getting source image dimensions...')
    width, height = image.size    
    LOG.info('%d x %d pixels', width, height)

    # get details for ImageMagick
    LOG.info('Splitting to...')
    tile_width = int(math.ceil(width / num_tiles))
    LOG.info('' + str(tile_width) + ' x ' + str(tile_width) + ' px tiles')
    pad = len(str(num_tiles * num_tiles))

    # create output directory
    outpath.mkdir(exist_ok=True)
    outpath = outpath.joinpath(str(zoom_level))
    outpath.mkdir(exist_ok=True)

    # Remove existing children
    for child in outpath.rglob('*.'+format):
        child.unlink()

    for x in range(num_tiles):
        outpath.joinpath(str(x)).mkdir(exist_ok=True)
        for y in range(num_tiles):
            left = tile_width * x
            top = tile_width * y
            right = left + tile_width
            bottom = top + tile_width
            tile = image.crop([left, top, right, bottom])
            tile = tile.resize([resize_width, resize_width])
            tile_path = outpath.joinpath(f'{x}/{y}.'+format)
            tile.save(tile_path, quality=85)
            #tile.save(tile_path)
            print('.', end='')
            sys.stdout.flush()
            # Note on quality: We were using about 75 but it comes out with lots of JPG compression artefacts
            # 95 is pretty much perfect. 85 is a fair compromise
    print('')

    LOG.info('- done!')


def zoom_range_type(value):
    try:
        value = value.strip()
        if '-' in value:
            match = re.search(r'^([0-9]+)-([0-9]+)$', value)
            if not match:
                raise ArgumentError('should be a zoom level or range')
            zoom_min = int(match.group(1))
            zoom_max = int(match.group(2))
            if zoom_min > zoom_max:
                raise ArgumentError('should be a zoom level or range')
            if zoom_min < 0:
                raise ArgumentError('should be a zoom level or range')
        else:
            zoom_min = zoom_max = int(value) 
            if zoom_min < 0:
                raise ArgumentError('should be a zoom level or range')
    except ValueError:
        raise ArgumentError('should be a zoom level or range')
    return (zoom_min, zoom_max)


def positive_int_type(rawvalue):
    try:
        value = int(rawvalue.strip())
    except ValueError:
        raise ArgumentError('should be a positive integer')
    if value <= 0:
        raise ArgumentError('should be a positive integer')
    return value


def create_parser(prog_name):
    parser = ArgumentParser(prog=prog_name, description="Generate map files for leaflet")
    parser.add_argument('input_file',
                        help='large image file to split (JPG, PNG, or TIFF)')
    parser.add_argument('zoom_level', type=zoom_range_type,
                        help='zoom level(s) to generate (0 to 18); either integer or range (ex: 2-6)')
    parser.add_argument('output_folder',
                        help='folder name to write tiles to (will be created if does not exist)')
    parser.add_argument('-w', '--resize_width', metavar='', type=positive_int_type, default=256,
                        help='dimension in pixels for outputted tiles (default 256px)')
    parser.add_argument('-q', '--quiet', action='store_true', default=False,
                        help='suppress all output from program (useful for integrating into larger projects)')
    parser.add_argument('-t', '--format', default='png',
                        help='output format (png or jpeg)')
    return parser


def setup_logging(quiet=False):
    logging.basicConfig(format='%(levelname)s: %(message)s', stream=sys.stderr)
    LOG.setLevel(logging.WARNING if quiet else logging.INFO)


def main():
    parser = create_parser(sys.argv[0])
    args = parser.parse_args(sys.argv[1:])

    input_path = args.input_file
    zoom_min, zoom_max = args.zoom_level
    output_folder = args.output_folder
    resize_width = args.resize_width
    format = args.format
    setup_logging(args.quiet)

    # open the image
    try:
        image = Image.open(input_path)
        width, height = image.size
        if not power_of(width, 2):
            LOG.warning('Source image dims should be power of 2! Continuing anyway...')
        if width != height:
            LOG.error('Source image should be square! Quitting...')
            sys.exit(1)
    except UnidentifiedImageError:
        LOG.error('%s: cannot open image file', input_path)
        sys.exit(1)

    output_path = Path(output_folder)

    LOG.info('Generating tiles for leaflet.js for zoom levels %d to %d to %s',
             zoom_min, zoom_max, output_folder)

    # if multiple zoom levels, run them all
    for z in range(zoom_min, zoom_max+1):
        LOG.info('generate zoom level %d' % z)
        generate(image, output_path, z, resize_width, format)
    # that's it!
    LOG.info('FINISHED!')


if __name__ == '__main__':
    main()
