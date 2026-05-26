from pathlib import Path
from typing import Any, Optional

import networkx as nx
import numpy as np
from libpysal import weights
from mathutils import Matrix, Vector
from sklearn.neighbors import KDTree

from .config import config
from .fileio import read_savedpadpipes, load_json_file, save_json_file
from .gamedefs import colors, brick_types, price_types, exported_properties
from .slgamedefs import marker_types, starts_with, ends_with, properties, slcoin_defaults
from .utils import camel_to_snake
from .utils import optColor, optKey, getVec, getRot, getQuat, getXYZ
from .utils import objectRef


def export_markers(game: str, datadir: Path, sourcedir: Path) -> None:  # noqa: C901 - disable complexity warning
    maps = {}  # dictionary from map name to json data list
    area_mtx = {}  # Transform for each area map geometry
    data = []  # Output marker data

    pipes = {}
    objects = {}

    data_lookup = {}

    # Phase 1: Read all the map json files in and build a look up table for references
    # Also get any area/map file matrices (for streaming levels)
    for area in config[game]['maps']:
        # Store the map data
        maps[area] = load_json_file(path=sourcedir.joinpath('levels', f"{area}.json"))

        # Go through all objects in the map data and store lookups for later
        for oidx, o in enumerate(maps[area]):
            if not o.get('Outer') or not (p := o.get('Properties')):
                continue
            oname = o['Name']
            otype = o['Type']

            # For maps that are divided into multiple files, there may be a LevelTransform for entities in that
            # file relative to the persistent world that is handled by the streaming system. To correct for this
            # we construct a matrix from the Translation/Rotation members if they exit
            if (a := p.get('WorldAsset', {}).get('AssetPathName')) and (t := p.get('LevelTransform')):
                area_mtx[a.split('.').pop()] = (
                    Matrix.Translation(getVec(t.get('Translation'))) @ getQuat(t.get('Rotation')).to_matrix().to_4x4()
                )

            if otype.startswith('Pipesystem') and 'Pipe' in p and ('OtherPipe' in p or 'otherPipeInOtherLevel' in p):
                # p['Pipe']
                #     ObjectName: StaticMeshComponent'DLC2_Complete:PersistentLevel.HealingStation13_44.Pipe'
                #     ObjectPath: SupralandSIU/Content/FirstPersonBP/Maps/DLC2_Complete.58973
                # p['OtherPipe']
                #     ObjectName: PipesystemNew_C'DLC2_Complete:PersistentLevel.PipesystemNew10'
                #     ObjectPath: SupralandSIU/Content/FirstPersonBP/Maps/DLC2_Complete.19652
                # p['otherPipeInOtherLevel']
                #     AssetPathName: /Game/FirstPersonBP/Maps/DLC2_Complete.DLC2_Complete
                #     SubPathString: PersistentLevel.PipeToArea2
                # {ComponentType/class}'{map}'
                def getPipeObjectName(o):
                    t = o['ObjectName'].split('.')
                    r = t[-2] if t[-1] == "Pipe'" else t[-1]
                    return r.replace("'", "")

                a = ':'.join((area, getPipeObjectName(p['Pipe'])))
                if t := p.get('otherPipeInOtherLevel'):
                    b = ':'.join((t['AssetPathName'].split('.').pop(), t['SubPathString'].split('.').pop()))
                else:
                    b = ':'.join((area, getPipeObjectName(p['OtherPipe'])))
                pipes[a] = b
                print(f"{a} -> {b}")
                # pipes [b] = a # links may be single-sided

            objects[area + ':' + oname] = o

    for area in maps:
        for oidx, o in enumerate(maps[area]):
            otype = o['Type']
            oname = o['Name']

            allowed_items = (
                marker_types
                and otype in marker_types
                or any(otype.startswith(s) for s in starts_with)
                or any(otype.endswith(s) for s in ends_with)
            )
            if not allowed_items:
                continue

            if not o.get('Outer') or not (p := o.get('Properties')):
                continue

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
                return matrix

            matrix = get_matrix(o)
            if area in area_mtx:
                matrix = area_mtx[area] @ matrix

            # some MetalBall_C are Anvils, do the replacement
            if (
                o['Type'] == 'MetalBall_C'
                and o.get('Properties', {}).get('Mesh?', {}).get('ObjectName') == "StaticMesh'Anvil'"
            ):
                o['Type'] = 'Anvil_C'

            # some RingRusty_C are pickaxes, cannot be determined by meshes
            if game == 'sl' and o['Name'].startswith('RingRusty'):
                for i in range(10, 16 + 1):
                    if o['Name'] == 'RingRusty' + str(i):
                        o['Type'] = '_Pickaxe_C'
                        # special type, an item

            data.append({'name': o['Name'], 'type': o['Type'], 'area': area})
            data_lookup[':'.join((area, o['Name']))] = data[-1]

            t = matrix.to_translation()
            data[-1].update({'lat': t.y, 'lng': t.x, 'alt': t.z})

            p = o.get('Properties', {})

            for key in properties:
                optKey(data[-1], camel_to_snake(key), p.get(key))

            def class_from_objectname(props: dict, prop: str):
                c = props.get(prop, {}).get('ObjectName')
                return c.split("'")[1] if c else None

            optKey(data[-1], 'spawns', class_from_objectname(p, 'Spawnthing'))
            optKey(data[-1], 'spawns', class_from_objectname(p, 'Class'))
            optKey(data[-1], 'other_pipe', pipes.get(':'.join((area, o['Name']))))
            optKey(data[-1], 'custom_color', optColor(p.get('CustomColor')))

            if o['Type'] in ('Jumppad_C'):
                optKey(data[-1], 'velocity', (v := p.get('Velocity')) and getXYZ(getVec(v)))
                d = Vector((matrix[0][2], matrix[1][2], matrix[2][2]))
                d.normalize()
                data[-1].update({'direction': getXYZ(d)})
                data[-1].update({'target': getXYZ(Vector((0, 0, 0)))})

    calc_pads(data)
    calc_pipes(data)

    # Merge in custom and legacy data, clean the properties and remove ones we don't need
    cleanup_objects(game=game, datadir=datadir, sourcedir=sourcedir, data_lookup=data_lookup, data=data)

    print('collected %d markers' % (len(data)))
    save_json_file(data=data, path=datadir.joinpath(f'markers.{game}.json'))


def calc_pipes(data):
    # I could not find hierarchy connection between pipe caps and pipe systems
    # so I decided to search for the nearest pipe cap
    # It should work fine most of the time
    def allowed_points(o):
        return o['type'] in ('PipeCap_C')

    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    data_indices = [i for i, o in enumerate(data) if allowed_points(o)]
    print('collected', len(points), 'pipe caps, calculating links...')

    if not points:
        return

    tree = KDTree(points)

    lookup = {}
    cap_indices = {}

    # update pipe system, find nearest caps
    for i, o in enumerate(data):
        if not o['type'].startswith('Pipesystem'):
            continue
        x, y, z = o['lng'], o['lat'], o['alt']

        query_point = [x, y, z]
        _, indices = tree.query([query_point], k=3)
        indices = indices[0]
        j = data_indices[indices[0]]
        p = data[j]
        dist = (Vector((x, y, z)) - Vector((p['lng'], p['lat'], p['alt']))).length
        if dist <= 1500:
            nearest_cap = p['area'] + ':' + p['name']
            cap_indices[nearest_cap] = j
            data[i].update({'nearest_cap': nearest_cap})
            a = o['area'] + ':' + o['name']
            lookup[a] = o

    ''' just add nearest cap for now ^. handle the rest in frontend
    # update caps with cross-references
    # not all pipes have caps, unfortunately
    # some only have level geometry that's not in the classes
    for i, o in enumerate(data):
        if o['type'] not in ('PipesystemNew_C', 'PipesystemNewDLC_C'):
            continue
        # get nearest cap, get other pipe, update other pipe's cap
        if 'nearest_cap' in o and 'other_pipe' in o:
            if nearest_cap := o.get('nearest_cap'):
                if other_pipe := o.get('other_pipe'):
                    if p:=lookup.get(other_pipe):
                        if other_cap := p.get('nearest_cap'):
                            if j := cap_indices.get(nearest_cap):
                                data[j].update({'other_cap': other_cap})
    '''


def calc_pads(data):  # noqa: C901 - disable complexity warning
    # calculates target altitude from the jump pad's velocity data
    # builds 3d terrain from selected points (uses jump pad locations by default)
    # traces parabolic path and find z of an intersection with a plane defined by 3 closest points

    def allowed_points(o):
        # return True   # not recommended, bugs with coins, etc.
        return o['type'] not in (
            'Coin_C',
            'BP_TriggerVolume_C',
            'Button_C',
            'Door_C',
            'Chest_C',
        )  # testing

    # def allowed_points(o):
    #     return o['type'] in ('Jumppad_C') # jump pads only

    points = [(o['lng'], o['lat'], o['alt']) for o in data if allowed_points(o)]
    # data_indices = [i for i, o in enumerate(data) if allowed_points(o)]

    print('collected', len(points), 'terrain points, calculating targets...')

    if not points:
        return

    tree = KDTree(points)
    jumppads = []
    matches = {}

    for i, o in enumerate(data):
        if o['type'] != 'Jumppad_C':
            continue
        jumppads.append(o)
        matches[':'.join((o['area'], o['name']))] = {'obj': o, 'targets': []}

        x, y, z = o['lng'], o['lat'], o['alt']
        k = o.get('relative_velocity', 1000)
        v = o.get('direction', {'x': 0, 'y': 0, 'z': 0})

        vx = v['x'] * k
        vy = v['y'] * k
        vz = v['z'] * k

        if (v := o.get('velocity')) and o.get('allow_stomp'):
            vx = v['x']
            vy = v['y']
            vz = v['z']

        dt = 0.01
        g = 9.8
        m = 95
        h = 0
        t = 0
        last_z = z
        s = Vector((x, y, z))
        while t < 20:
            vz -= g * m * dt
            x += vx * dt
            y += vy * dt
            z += vz * dt
            t += dt

            query_point = [x, y, z]
            _, indices = tree.query([query_point], k=3)
            indices = indices[0]
            triangle = [points[j] for j in indices]
            h = get_z(x, y, triangle)

            dist = (Vector((x, y, z)) - s).length

            # print([round(v, 2) for v in [x, y, z]], 'h', round(h, 2), 'nearest triangle', [ data[data_indices[j]]['name']+':'+str([round(x, 2)for x in points[j]]) for j in indices])
            if dist > 250 and last_z > z and h > z:  # only check on decline
                break

            last_z = z

        # print('pad', o['name'], 'velocity', vx, vy, vz, 'target', x, y, z)
        data[i].update({'target': {'x': x, 'y': y, 'z': z}})

    # Now we try to find pairs of jumppads. For each jump pad, find all the other jumppads close to the target
    # If two jumppads are both in each other's lists then we can consider merging

    def getdir(o):
        v = o.get('direction', {'x': 0, 'y': 0, 'z': 0})
        vx = -v['x']
        vy = -v['y']
        vz = v['z']

        if (v := o.get('velocity')) and o.get('allow_stomp'):
            vx = v['x']
            vy = v['y']
            vz = v['z']
        return Vector((vx, vy, vz)).normalized()

    for o in jumppads:
        if abs(getdir(o).z) > 0.99:
            continue

        ov = Vector((o['lng'], o['lat'], 0))
        otv = Vector((o['target']['x'], o['target']['y'], 0))
        do = (otv - ov).normalized()

        tdist = (otv - ov).length  # Distance between object and its target

        for tj in jumppads:
            if tj is o:
                continue
            if abs(getdir(tj).z) > 0.99:
                continue

            jv = Vector((tj['lng'], tj['lat'], 0))
            jtv = Vector((tj['target']['x'], tj['target']['y'], 0))
            dt = (jtv - jv).normalized()

            no2j = (jv - ov).normalized()
            dist = (otv - jv).length
            # distance between target and prospective match

            # Distance threshold is compared to the distance between the pads
            # Check that the pads are pointing in opposite directions
            # And that the pads are facing each other (rather than opposite directions)
            if dist < 0.3 * tdist and do.dot(dt) < -0.98 and no2j.dot(do) > 0.97 and no2j.dot(dt) < -0.97:
                # print(o['name'], tj['name'], do.dot(dt), no2j.dot(do), no2j.dot(-dt), round(dist/tdist, 2))
                alt = ':'.join((o['area'], o['name']))
                matches[alt]['targets'].append(tj)

    plist = {}
    for m in matches.values():
        o = m['obj']
        for t in m['targets']:
            if t is o:
                continue
            alt = ':'.join((t['area'], t['name']))
            for tt in matches[alt]['targets']:
                if tt is o:
                    if not plist.get(o['name']) and not plist.get(t['name']):
                        plist[o['name']] = t['name']
                        o['target']['x'] = t['lng']
                        o['target']['y'] = t['lat']
                        o['target']['z'] = t['alt']
                        o['other_pad'] = alt
                        o['twoway'] = 1
                        t['target']['x'] = o['lng']
                        t['target']['y'] = o['lat']
                        t['target']['z'] = o['alt']
                        t['twoway'] = 2
                        t['other_pad'] = ':'.join((o['area'], o['name']))


def get_z(x, y, triangle):
    v1, v2, v3 = triangle
    denominator = (v2[1] - v3[1]) * (v1[0] - v3[0]) + (v3[0] - v2[0]) * (v1[1] - v3[1])
    if denominator == 0:
        return v1[2]
    alpha = ((v2[1] - v3[1]) * (x - v3[0]) + (v3[0] - v2[0]) * (y - v3[1])) / denominator
    beta = ((v3[1] - v1[1]) * (x - v3[0]) + (v1[0] - v3[0]) * (y - v3[1])) / denominator
    gamma = 1 - alpha - beta
    if alpha >= 0 and beta >= 0 and gamma >= 0:
        z = alpha * v1[2] + beta * v2[2] + gamma * v3[2]
    else:
        alpha = max(0, min(1, alpha))
        beta = max(0, min(1, beta))
        gamma = 1 - alpha - beta
        z = alpha * v1[2] + beta * v2[2] + gamma * v3[2]
    return z


# The purpose of this code is to walk through all the objects we've gathered and prepare them for
# display by the map.
#
# classes is a set of all 'type' names
# lookup is a dictionary from area:name to objects
# data is an array of the same objects
# each object is a dictionary of k, v pairs
def cleanup_objects(  # noqa: C901 - disable complexity warning
    game: str, datadir: Path, sourcedir: Path, data_lookup: dict, data: list[dict]
) -> None:
    def get_xyz(o):
        return dict(x=o['lng'], y=o['lat'], z=o['alt'])

    def get_nc_xyz(o):
        return get_xyz(data_lookup[o['nearest_cap']]) if 'nearest_cap' in o else get_xyz(o)

    # Read the set of pads and pipes we found save data for
    savedpadpipes = read_savedpadpipes(game=game, sourcedir=sourcedir)

    # Filter out classes that won't get used
    # Note: consider checking for 'dev' layers as well as undefined
    game_classes = load_json_file(path=datadir.joinpath('gameClasses.json'))

    def is_class_used(item: dict) -> bool:
        return (
            (gc := game_classes.get(item['type']))
            and game in gc.get('games', ['sl', 'slc', 'siu'])
            and (gc.get('layer') or gc.get('nospoiler'))
        )

    for item in data[:]:
        if not is_class_used(item):
            data.remove(item)

    # Walk the remaining instances and fix up entries
    # We loop over a copy to allow us to remove entries we don't want
    for o in data[:]:
        alt = ':'.join((o['area'], o['name']))

        # Merge the various gold properties into one (we'll remove the properties later)
        # and deal with defaults for all coin or coin spawning classes
        # also takes care of DestroyablePots_C
        coins = o.get('coins') or o.get('coins_in_gold') or o.get('value') or (1 if o.get('contains_coin') else None)
        if coins is not None:
            o['coins'] = coins
        else:
            if o['type'] in slcoin_defaults:
                o['coins'] = slcoin_defaults[o['type']]
            elif o.get('spawns') in slcoin_defaults:
                o['coins'] = slcoin_defaults[o['spawns']]

        # There is at least one chest that doesn't have spawn data but actually spawns Health+1 (SL Chest31_9005)
        if o['type'] == 'Chest_C' and o.get('spawns') is None:
            o['spawns'] = 'BP_PurchaseHealth+1_C'

        # If this is the stolen coins chest then set coins to 'some' it will remove the spawns property later
        if o.get('spawns') == 'StolenCoins_C':
            o['coins'] = 'varies'

        # Minecraft bricks may contain coins, but if they are not specified gold ones default to 3
        # variant is set to the brick type
        if o['type'] == 'MinecraftBrick_C':
            if game == 'siu':
                if type(bt := o.get('brick_type')) is str:
                    o['variant'] = bt.rsplit('::')[-1].lower()
                else:
                    o['variant'] = brick_types[4 if not bt and o.get('coins') else 0]
                if o['variant'] == 'gold' and not o.get('coins'):
                    o['coins'] = 3
                if o.get('coins') is not None and o['variant'] != 'gold':
                    print(f'Non gold coin containing MinecraftBrick_C:{o["variant"]}:{o["coins"]}')

        # Player icon changes colour based on game
        if o['type'] == 'PlayerStart':
            o['variant'] = 'blue' if game == 'siu' else 'red'

        # Deal with Waldo's in SLC
        if o['type'] == 'RedGuy_C' and o['name'].startswith('Waldo'):
            o['type'] = 'Waldo:' + o['type']

        # Allow things with colors can have variants (minecraft bricks have type and colour)
        if o.get('variant') is None:
            color = o.get('color') or o.get('original_color')
            if color and type(color) is int and color >= 0 and color < len(colors):
                o['variant'] = colors[color]
            elif color and type(color) is str and (color := color.split('::')[-1]):
                o['variant'] = color.lower()

        if (pt := o.get('price_type')) is not None and type(pt) is str:
            o['price_type'] = price_types.index(pt.split('::')[-1].lower())

        # Anything that has coins gets a subclass (chests, minecraft bricks, destroyable pots...)
        # Anything that provides coins and spawns we clear the spawns field (chests can't do both)
        # There's also a chest that has coins in it but also has a "spawns" (SIU ChestAreaEnd_78)
        if o.get('coins') is not None:
            if o['type'] not in slcoin_defaults:  # don't add subclass to coins
                o['type'] = 'Coin:' + o['type']
            if o.get('spawns') is not None:
                del o['spawns']

        # Create line data

        if o.get('other_pipe'):
            o['linetype'] = 'pipe'
            if o.get('nearest_cap'):
                # We used to put this in startpos but we just move the pipe now
                nc = data_lookup[o['nearest_cap']]
                o['lat'], o['lng'], o['alt'] = nc['lat'], nc['lng'], nc['alt']
            if o['other_pipe'] == alt:
                del o['linetype']
                del o['other_pipe']  # Some pipes point at themselves (basically in only)
            else:
                opo = data_lookup[o['other_pipe']]
                o['target'] = get_nc_xyz(opo)
                if alt == opo.get('other_pipe'):
                    o['twoway'] = 1
                    opo['twoway'] = 2
        elif o['type'] == 'Jumppad_C':
            o['linetype'] = 'jumppad'
            if (o.get('allow_stomp')
                    or o.get('disable_movement_in_air') == False):   # fmt: skip # noqa: E712 default for DisableMovementInAir is True
                o['variant'] = 'blue'
            else:
                o['variant'] = 'red'

        # Mark pads/pipes for which we haven't identified save information
        if o['type'] == 'Jumppad_C' and alt not in savedpadpipes['pads']:
            o['notsaved'] = True
        if (
            'Pipesystem' in o['type']
            and alt not in savedpadpipes['pipes']
            and ((nc := o.get('nearest_cap')) and nc not in savedpadpipes['pipes'] or not nc)
        ):
            o['notsaved'] = True

    # Convert piles of non-rotating coins to stack markers
    create_coinstacks(data_lookup, data)

    # Strip properties we don't need to export
    for o in data:
        for prop in list(o.keys()):
            if prop not in exported_properties:
                del o[prop]


# Goes through all the non-rotating coins and looks for groups of more than 3 to combine into coinstacks
# Adds the new stack objects to our collection and removes the original coins
def create_coinstacks(data_lookup, data) -> None:

    threshold = 400

    # Positions of all non-rotating coins and their corresponding indices in data
    points = []
    dataidx = []
    for idx, o in enumerate(data):
        if o['type'] in ['Coin_C', 'CoinBig_C'] and o.get('is_doesnt_rotate'):
            points.append([o['lng'], o['lat'], o['alt']])
            dataidx.append(idx)

    if len(points) == 0:
        return

    # Creates a graph of connected elements that are within the distance threshold ie sets of
    # points that all fit within a sphere of max radius 'threshold'
    graph = weights.DistanceBand.from_array(points, threshold=threshold, silence_warnings=True).to_networkx()

    # Create an array of new stack objects to add and a list of old coin indices to remove
    stackId = 0
    stacks = []
    delobj = []
    for cc in nx.connected_components(graph):
        # Note inc should be adfter the condition however there is custom
        # data depending on the number now and it only matters they are unique
        stackId += 1
        if len(cc) > 3:
            coins = 0
            old_coins = {}
            for idx in cc:
                o = data[dataidx[idx]]
                coins += o['coins']
                old_coins[o['name']] = o['coins']
                area = o['area']
                delobj.append(data[dataidx[idx]])
            c = np.r_[points][list(cc)].mean(axis=0)

            stacks.append(
                {
                    'name': f'CoinStack{stackId}',
                    'type': '_CoinStack_C',
                    'area': area,
                    'lat': c[1],
                    'lng': c[0],
                    'alt': c[2],
                    'coins': str(coins),
                    'old_coins': old_coins,
                }
            )

    # Delete the old coins and add the new ones - we don't bother clearing out data_lookup
    delcount = len(delobj)
    for o in delobj:
        data.remove(o)

    for stack in stacks:
        data.append(stack)
        data_lookup[':'.join((stack['area'], stack['name']))] = stack

    print(f'Replaced {delcount} coins with {len(stacks)} stacks')
