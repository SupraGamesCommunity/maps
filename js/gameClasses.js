// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

export class GameClasses {
    static _data;
    static _defaultClass = {
        'friendly': null,
        'icon': 'question_mark',
        'layer': 'dev',
        'nospoiler': null,
        'lines': 'dev',
    };

    static async init() {
        return fetch('data/gameClasses.json')
            .then((response) => response.json())
            .then((j) => {
                GameClasses._data = j;
            });
    }

    // type null/undefined return null. Otherwise return matching class or default if no match
    static get(type) {
        return type && (GameClasses?._data[type] ?? GameClasses._default ?? GameClasses._defaultClass) || null;
    }

}
