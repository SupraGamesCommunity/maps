// Decoder object for UE5 save files using search rather than
// propertly reading the .sav file format

export class UE5SaveDecoder {
  static INSTANCE_PATTERN = 'PersistentLevel.';

  // Setup data and string views and initialise reading index
  constructor(arrayData, outerPatterns) {
    this.dataview = new DataView(arrayData, arrayData.byteOffset, arrayData.byteLength);
    this.strview = new TextDecoder('latin1').decode(this.dataview);
    this.outerPatterns = outerPatterns;
    this.searchOffset = 0;
  }

  // Returns true if we've reached the end
  isAtEnd() {
    return this.searchOffset == this.strview.byteLength;
  }

  // Returns the first FString that starts with any of the matchStrings (string array),
  // stopping search at end of data or if we find any of stopStrings (string array).
  // Returns the FString found or null (check isAtEnd()).
  searchFStrings({ matchStrings = [], stopStrings = [] }) {
    if (this.isAtEnd()) return {};

    // Match for any int32 in range 0000-FFFF, followed by any of the match or stop strings
    // Stores the matched string in named group 'match'
    const re_match = RegExp(`[\\s\\S]{2}\\0\\0(?<match>${[...matchStrings, ...stopStrings].join('|')})`, 'gi');

    // Start searching from last position reached
    re_match.lastIndex = this.searchOffset;
    const m = re_match.exec(this.strview);

    // If m is null, we got to the end without finding anything, so
    if (m == null) {
      this.searchOffset = this.strview.byteLength;
      return {};
    }

    // If we matched a stop string (that isn't in matchStrings) then this is the next search position
    if (!matchStrings?.includes(m.groups.match)) {
      this.searchOffset = m.index;
      return {};
    }

    // Otherwise we found a match, advance to end of FString and return the string
    const byteLen = this.dataview.getInt32(m.index, true);
    const strIdx = m.index + 4;
    const strLen = this.dataview.getInt8(strIdx + byteLen - 1) != 0 ? byteLen : byteLen - 1;

    this.searchOffset = strIdx + byteLen;

    if (m.groups.match == UE5SaveDecoder.INSTANCE_PATTERN) {
      return {
        isInstance: true,
        found: this.strview.slice(strIdx + m.groups.match.length, strIdx + strLen),
      };
    } else {
      return { found: this.strview.slice(strIdx, strIdx + strLen) };
    }
  }

  // Returns null or the next matching outer string
  nextOuterString() {
    return this.searchFStrings({ matchStrings: this.outerPatterns });
  }

  // Returns null or the next matching fstrings, stops if it finds an outerString
  nextFString(fstring, { required = false } = {}) {
    const match = this.searchFStrings({
      matchStrings: [fstring],
      stopStrings: required ? [] : this.outerPatterns,
    });
    if (!match.found && required) {
      throw new Error(`Expecting instance FString:${fstring}`);
    }
    return match;
  }

  // Returns next byte property (0-255)
  nextByteProperty({ required = false } = {}) {
    const match = this.searchFStrings({
      matchStrings: ['ByteProperty'],
      stopStrings: required ? [] : this.outerPatterns,
    });
    if (!match.found) {
      if (required) {
        throw new Error('Expecting instance FString:ByteProperty');
      }
      return match;
    }
    // int32 == 0, int8 = flag == 1 (hasArrayIndex), int32 == 0
    this.searchOffset += 4 + 1 + 4;
    const value = this.dataview.getUint8(this.searchOffset);
    this.searchOffset += 1;
    return { found: value };
  }
}
