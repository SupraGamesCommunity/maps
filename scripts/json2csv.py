import sys, json, os, csv, argparse
from pathlib import Path
from inspect import currentframe, getframeinfo

# Output a warning message
def warning(warnmsg):
    frameinfo = getframeinfo(currentframe().f_back)
    filename = os.path.basename(frameinfo.filename)
    lineno = frameinfo.lineno
    print(f"{filename}({lineno}): warning: {warnmsg}")

# Output an error and terminate
def error_exit(errmsg, parser=None):
    frameinfo = getframeinfo(currentframe().f_back)
    filename = os.path.basename(frameinfo.filename)
    lineno = frameinfo.lineno

    print(f"{filename}({lineno}): error: {errmsg}")

    if parser:
        parser.print_help()

    sys.exit(-1)


# We want to convert between CSV and JSON data. CSV is assumed to be a set of
# named columns (fieldnames) with sets of column data for each row.
#
# To convert to a JSON we create an array of dictionaries corresponding to the
# CSV rows with each dictionary mapping from column/field name to the value,
# and stripping out any empty/null values. 
#
# If one of the columns has unique values the rows may be turned into a
# dictionary with the values of that column as the key.
#
# Thus CSV:
# field1, field2, ...
# r1c1,r1c2,r1c3,...
# r2c1,r2c2,c2c3,...
# ...
#
# Becomes JSON:
# [
#   { 'field1': r1c1, 'field2': r1c2, 'field3': r1c3, ... },
#   { 'field1': r2c1, 'field2': r2c2, 'field3': r2c3, ... },
#   { 'field1': r3c1, 'field2': r3c2, 'field3': r3c3, ... },
#   ...
# ]
#
# or with key='field1':
# {
#   r1c1: { 'field2': r1c2, 'field3': r1c3, ... },
#   r2c1: { 'field2': r2c2, 'field3': r2c3, ... },
#   r3c1: { 'field2': r3c2, 'field3': r3c3, ... },
#   ...
# }

class CSVData:
    def __init__(self, fieldnames=[], rowdicts=[]):
        self.fieldnames = fieldnames
        self.rowdicts = rowdicts

# Load a CSV file as a dictionary
def load_csv_file(path):
    with open(path, 'r', newline='') as csvfile:
        dialect = csv.Sniffer().sniff(csvfile.read(1024))
        csvfile.seek(0)
        reader = csv.DictReader(csvfile, dialect=dialect)
        fieldnames = list(next(reader).keys())
        return CSVData(fieldnames=fieldnames, rowdicts=list(reader))

def save_csv_file(csv_data, path):
    with open(path, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, csv_data.fieldnames)
        writer.writeheader()
        for rowdict in csv_data.rowdicts:
            writer.writerow(rowdict)

def load_json_file(path):
    return json.load(open(path, 'r', encoding="utf-8-sig"))

def save_json_file(json_data, path):
    path.parent.mkdir(exist_ok=True, parents=True)
    with open(path, 'w') as file:
        json.dump(json_data, file, indent = 2)

def empty_cell(cell):
    return (cell == None or cell == '')

def csv2json(csv_data, keyname=None):
    if keyname and keyname in csv_data.fieldnames:
       json = { rowdict[keyname]: { k: v for k,v in rowdict.items() if k != keyname and not empty_cell(v) } for rowdict in csv_data.rowdicts }
    else:
       json = [ { k: v for k,v in rowdict.items() if not empty_cell(v) } for rowdict in csv_data.rowdicts ]
    return json

def json2csv(json_data, keyname=None):
    if isinstance(json_data, dict):
        if not keyname:
            keyname = 'key'
        rowdicts = [ { keyname: key, **rowdict } for key, rowdict in json_data.items() ]
    else:
        rowdicts = json_data

    fieldnames = list(dict.fromkeys([key for rowdict in rowdicts for key in rowdict]))

    return CSVData(fieldnames=fieldnames, rowdicts=rowdicts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('files', help='file(s) to process (ie *.json or *.csv)')
    parser.add_argument('-i', '--inpath', default='.', help='directory to read files from')
    parser.add_argument('-o', '--outpath', help='directory to write files to (if blank will be set to inpath)')
    parser.add_argument('-r', '--recursive', action='store_true', help='search subdirectories')
    parser.add_argument('-f', '--flatten', action='store_true', help='flatten subdirectories')
    parser.add_argument('-k', '--keyname', help='unique column/key name for dictionary conversion')
    args = parser.parse_args()

    if not (input_is_csv := args.files.endswith('.csv')) and not (args.files.endswith('.json')):
        error_exit("files argument must end with .csv or .json\n", parser)
    outext = '.json' if input_is_csv else '.csv'

    if '\\' in args.files or '/' in args.files:
        error_exit("files argument should not contain '\\' or '/'\n'")

    args.files = '**\\'+args.files if args.recursive else args.files

    ip = Path(args.inpath)
    if args.outpath is None:
        args.outpath = args.inpath
    op = Path(args.outpath)    

    for infile in ip.glob(args.files):
        outfile = op.joinpath(infile.with_suffix(outext).relative_to(ip))
        if input_is_csv:
            csv_data = load_csv_file(infile)
            if json_data := csv2json(csv_data, args.keyname):
                save_json_file(json_data, outfile)
        else:
            json_data = load_json_file(infile)
            if csv_data := json2csv(json_data, args.keyname):
                save_csv_file(csv_data, outfile)

if __name__ == '__main__':
    main()
