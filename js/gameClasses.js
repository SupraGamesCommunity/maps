//=================================================================================================
// Supraland GameClasses
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps (gameClasses.json).

export class GameClasses {
  static _data;
  static _defaultClass = {
    'friendly': null,
    'icon': 'question_mark',
    'layer': 'dev',
    'nospoiler': null,
    'lines': 'dev',
  };

  static async loadClasses() {
    return fetch('data/gameClasses.json')
      .then((response) => response.json())
      .then((j) => {
        GameClasses._data = j;
      });
  }

  // Return matching class or default if no match
  static get(type, def = this._defaultClass) {
    return GameClasses._data?.[type] ?? def;
  }
}
