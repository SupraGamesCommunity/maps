from pathlib import Path
from typing import Any, Optional

from parserlib.fileio import load_json_file


# Return True if this string looks like some kind of enumeration
def isenum(s: Any) -> bool:
    return (
        isinstance(s, str)
        and '::' in s
        and set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:0123456789")
    )


# Return True if this string looks like an Unreal renamed enumeration
def isueenum(s: Any) -> bool:
    return isinstance(s, str) and '::NewEnumerator' in s


class UEEnums:
    def __init__(self):
        self.map = {}
        self.types = set()

    def loadenumbp(self, path: Path):
        # Read the file as a JSON
        j = load_json_file(path=path, quiet=True)

        # Check that it is formatted as we expect
        if (
            not isinstance(j, list)
            or not j  # We have a non empty list
            or not isinstance(j[0], dict)  # containing a dictionary
            or not j[0].get('Type') == 'UserDefinedEnum'
        ):  # of the right type
            print(f"Warning: {path[-1]} does not appear to be an Unreal enumeration")
            return

        name = j[0]['Name']

        for e in j[0]['Properties']['DisplayNameMap']:
            k, v = e['Key'], e['Value']
            if (s := v.get('SourceString')) or (s := v.get('CultureInvariantString')):
                if s != k:
                    self.map[name + '::' + k] = name + '::' + s
            else:
                print(f"Warning: in {path[-1]} {k} Value does not have SourceString nor CultureInvariantString'")

        self.types.add(name)

    # If s is an enumeration name we're aware of convert it to the source form
    def ue2source(self, s: str, default: Optional[str] = None) -> str:
        return self.map.get(s, default)

    # Returns true if the two enum strings match. First may be a UE renamed enum
    # or a source enum, second should be an untranslated source name
    def match(self, ue: str, s: str) -> bool:
        return ue == s or self.ue2source(ue) == s

    # If first argument is a UE enum then add it
    def addueattr(self, ue: str, s: Optional[str] = None) -> None:
        if isueenum(ue):
            if s and s != ue:
                self.map[ue] = s
            self.types.add(ue[0 : ue.find('::')])


# Load all enumerations
def load_all_enumbp(path: Path) -> UEEnums:
    ueenums = UEEnums()
    for filename in path.glob('*.json'):
        ueenums.loadenumbp(filename)
    return ueenums
