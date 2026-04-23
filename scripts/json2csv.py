import json
import os
import sys
from argparse import ArgumentParser
from csv import DictReader, DictWriter, Sniffer
from dataclasses import dataclass, field
from inspect import currentframe, getframeinfo
from pathlib import Path
from typing import Any, Optional, Union

type JsonData = Any


# Output a warning message
def warning(warnmsg: str) -> None:
    frameinfo = getframeinfo(currentframe().f_back)
    filename = os.path.basename(frameinfo.filename)
    lineno = frameinfo.lineno
    print(f"{filename}({lineno}): warning: {warnmsg}")


# Output an error and terminate
def error_exit(errmsg: str, parser: Optional[ArgumentParser] = None) -> None:
    frameinfo = getframeinfo(currentframe().f_back)
    filename = os.path.basename(frameinfo.filename)
    lineno = frameinfo.lineno

    print(f"{filename}({lineno}): error: {errmsg}")

    if parser:
        parser.print_help()

    sys.exit(1)


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


@dataclass
class CSVData:
    fieldnames: list[str] = field(default_factory=list)
    rowdicts: list[dict] = field(default_factory=list)


# Load a CSV file as a dictionary
def load_csv_file(path: Path) -> CSVData:
    with path.open('r', newline='') as csvfile:
        dialect = Sniffer().sniff(csvfile.read(1024))
        csvfile.seek(0)
        reader = DictReader(csvfile, dialect=dialect)
        fieldnames = list(next(reader).keys())
        return CSVData(fieldnames=fieldnames, rowdicts=list(reader))


def save_csv_file(csv_data: CSVData, path: Path) -> None:
    with path.open('w', newline='') as csvfile:
        writer = DictWriter(csvfile, csv_data.fieldnames)
        writer.writeheader()
        for rowdict in csv_data.rowdicts:
            writer.writerow(rowdict)


def load_json_file(path: Path) -> JsonData:
    with path.open('r', encoding="utf-8-sig") as fh:
        return json.load(fh)


def save_json_file(json_data: JsonData, path: Path) -> None:
    path.parent.mkdir(exist_ok=True, parents=True)
    with path.open('w') as file:
        json.dump(json_data, file, indent=2)


def empty_cell(cell: Any) -> bool:
    return cell is None or cell == ''


def csv2json(csv_data: CSVData, keyname: Optional[str] = None) -> JsonData:
    if keyname and keyname in csv_data.fieldnames:
        json = {
            rowdict[keyname]: {k: v for k, v in rowdict.items() if k != keyname and not empty_cell(v)}
            for rowdict in csv_data.rowdicts
        }
    else:
        json = [{k: v for k, v in rowdict.items() if not empty_cell(v)} for rowdict in csv_data.rowdicts]
    return json


def json2csv(json_data: JsonData, keyname: Optional[str] = None) -> CSVData:
    if isinstance(json_data, dict):
        if not keyname:
            keyname = 'key'
        rowdicts = [{keyname: key, **rowdict} for key, rowdict in json_data.items()]
    else:
        rowdicts = json_data

    fieldnames = list(dict.fromkeys([key for rowdict in rowdicts for key in rowdict]))

    return CSVData(fieldnames=fieldnames, rowdicts=rowdicts)


def main() -> None:
    parser = ArgumentParser()
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

    args.files = '**\\' + args.files if args.recursive else args.files

    ip = Path(args.inpath)
    if args.outpath is None:
        args.outpath = args.inpath
    op = Path(args.outpath)

    for infile in ip.glob(args.files):
        outfile: Path = op.joinpath(infile.with_suffix(outext).relative_to(ip))
        if input_is_csv:
            csv_data = load_csv_file(path=Path(infile))
            if json_data := csv2json(csv_data=csv_data, keyname=args.keyname):
                save_json_file(json_data=json_data, path=outfile)
        else:
            json_data = load_json_file(path=Path(infile))
            if csv_data := json2csv(json_data=json_data, keyname=args.keyname):
                save_csv_file(csv_data=csv_data, path=outfile)


if __name__ == '__main__':
    main()
