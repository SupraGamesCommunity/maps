//=================================================================================================
// mapVersion class

export class MapVersion {
  static _data;

  static async load() {
    const response = await fetch('data/versions.json');
    this._data = await response.json();
  }

  static getBuild(mapId) {
    const gamever = this._data?.[mapId].game;
    return `${gamever.build}${gamever.branch == 'beta' ? ' β' : ''}`;
  }

  static getString(mapId) {
    const gamever = this._data?.[mapId].game;
    return `${gamever.build} ${gamever.date} (${gamever.branch})`;
  }
}
