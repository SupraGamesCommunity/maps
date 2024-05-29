# Converts gameClasses.js to layers.csv

import re
import sys
import os

gameclasses_fn = '..\\js\\gameClasses.js'
layerscsv_fn = "types.csv"

# Open and read the file if it exists
if not os.path.exists(gameclasses_fn):
    sys.exit('..\\gameClasses.js not found')

# Read the whole text file
with open(gameclasses_fn, 'r', encoding='utf-8-sig') as fh:
    gc_txt = fh.read()

# Find constructor parameters and slice them out
if not (m := re.search('constructor *?\\( *', gc_txt)):
    sys.exit('Unexpected format: Can\'t find "constructor("')

# First column is always 'type'
line = 'type,'
cols = 1

# Add the constructor arguments to the header line
next_idx = m.span()[1]
while True:
    m = re.search(" *([^ ,)]*).*? *([,\\)])", gc_txt[next_idx:], re.M)
    if m is None: sys.exit('Unexpected format: Reading constructor arguments')
    next_idx += m.span()[1]
    cols += 1
    line += m.groups()[0]
    if(m.groups()[1]==','):
        line += ','
    else:
        break;

# Write the header line
with open(layerscsv_fn, "w", encoding='utf-8-sig') as fh:
    fh.write(line+'\n')

    # Find the initialiser
    m = re.search('gameClasses *= *\\{ *\n', gc_txt[next_idx:], re.S)
    next_idx += m.span()[1]

    class_count = 0

    # For each line of the initialiser until we hit the closing }
    while gc_txt[next_idx:next_idx+1] != '}':
        line = ''
        sep = ''
        i = 0
        while i < cols:
            m = re.search('[^\n]*?(?:(null)|["\'](.*?)["\'])[, )]*', gc_txt[next_idx:])
            if m is None or gc_txt[next_idx] == '\n':
                break

            next_idx += m.span()[1]
            i += 1

            line += sep;
            if grp := m.groups()[1]:
                line += grp
            if not sep:
                sep = ','

        while i < cols:
            line += sep
            i += 1
    
        next_idx += 1
        fh.write(line+'\n')
        class_count += 1

print('Success: {} classes processed with {} columns each'.format(class_count, cols))
