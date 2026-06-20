// Decoder object for UE5 save files using search rather than
// propertly reading the .sav file format

export class UE5SaveDecoder {
  // Setup data and string views and initialise reading index
  constructor(arrayData, outerPatterns) {
    this._dataview = new DataView(arrayData, arrayData.byteOffset, arrayData.byteLength);
    this._strview = new TextDecoder('latin1').decode(this._dataview);
    this._outerPatterns = outerPatterns;
    this._searchOffset = 0;
  }

  // Returns true if we've reached the end
  isAtEnd() {
    return this._searchOffset == this._strview.byteLength;
  }

  // Returns the first FString that starts with any of the matchStrings (string array),
  // stopping search at end of data or if we find any of stopStrings (string array).
  // Returns the FString found or null (check isAtEnd()).
  searchFStrings({ matchStrings = [], stopStrings = [], exact = false }) {
    if (this.isAtEnd()) {
      return false;
    }

    this.match = this.value = null;
    this.found = false;

    // Match for any int32 in range 0000-FFFF, followed by any of the match or stop strings
    // Stores the matched string in named group 'match'
    // Really we should escape the strings in matchStrings and stopStrings but for now they don't
    // contain characters that require it except '.' and that will work anyway.
    const re_match = RegExp(`[\\s\\S]{2}\\0\\0(?<match>${[...matchStrings, ...stopStrings].join('|')})`, 'gi');

    // Start searching from last position reached
    re_match.lastIndex = this._searchOffset;
    const m = re_match.exec(this._strview);

    // If m is null, we got to the end without finding anything, mark end
    if (m == null) {
      this._searchOffset = this._strview.byteLength;
      return false;
    }

    // If we matched a stop string (that isn't in matchStrings) then this is the next search position
    if (!matchStrings?.includes(m.groups.match)) {
      this._searchOffset = m.index;
      return false;
    }

    // Otherwise we found a match, advance to end of FString and store the match and remainder
    const byteLen = this._dataview.getInt32(m.index, true);
    const strIdx = m.index + 4;
    const strLen = this._dataview.getInt8(strIdx + byteLen - 1) != 0 ? byteLen : byteLen - 1;

    if (exact && m.groups.match.length != strLen) {
      return false;
    }

    this._searchOffset = strIdx + byteLen;
    this.match = m.groups.match;
    this.postmatch = this._strview.slice(strIdx + this.match.length, strIdx + strLen);
    this.found = true;

    return true;
  }

  // Returns null or the next matching outer string
  nextOuterString() {
    return this.searchFStrings({ matchStrings: this._outerPatterns });
  }

  // Returns null or the next matching fstrings, stops if it finds an outerString
  nextFString(fstring, { required = false, exact = false } = {}) {
    this.searchFStrings({
      matchStrings: [fstring],
      stopStrings: required ? [] : this._outerPatterns,
      exact,
    });
    if (!this.found && required) {
      throw new Error(`Expecting instance FString:${fstring}`);
    }
    return this.found;
  }

  // Returns empty dictionary or the next FString that looks like an instance
  nextInstance({ required = false } = {}) {
    return this.nextFString('PersistentLevel.', { required, exact: false });
  }

  // Returns next byte property (0-255)
  nextByteProperty({ required = false } = {}) {
    this.searchFStrings({
      matchStrings: ['ByteProperty'],
      stopStrings: required ? [] : this._outerPatterns,
      exact: true,
    });
    if (!this.found) {
      if (required) {
        throw new Error('Expecting instance FString:ByteProperty');
      }
      return false;
    }

    // Skip to the byte property value
    // int32 == 0, int8 = flag == 1 (hasArrayIndex), int32 == 0
    const skipBytes = '\0\0\0\0\x01\0\0\0\0';
    if (this._strview.slice(this._searchOffset, this._searchOffset + skipBytes.length) != skipBytes) {
      throw new Error('Unexpected data following FString:ByteProperty');
    }
    this._searchOffset += skipBytes.length;
    this.data = this._dataview.getUint8(this._searchOffset);
    this._searchOffset++;

    return true;
  }
}
