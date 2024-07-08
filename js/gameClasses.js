// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

export let gameClasses = null;

export const defaultGameClass = {
    'friendly': null,
    'icon': 'question_mark',
    'layer': 'dev',
    'nospoiler': null,
    'lines': 'dev',
}

export async function gameClassesInit() {
    return fetch('data/gameClasses.json')
        .then((response) => response.json())
        .then((j) => gameClasses = j);
}
