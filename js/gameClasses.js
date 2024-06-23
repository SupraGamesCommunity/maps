// Supraland Game Classes
//
// All the data we extract from the game data files consist of instances of specific game classes/blueprints.
// For each class we hold a bunch of data specifying how to deal with the class in the maps.

/* exported gameClasses */
let gameClasses = null;

const defaultGameClass = {
    'friendly': null,
    'icon': 'question_mark',
    'layer': 'dev',
    'nospoiler': null,
    'lines': 'dev',
}

/* exported gameClassesInit */
function gameClassesInit() {
    return fetch('data/gameClasses.json')
        .then((response) => response.json())
        .then((j) => gameClasses = j);
}

// Returns the [icon, size] based on the decorated icon name plus a variant if supplied
/* exported decodeIconName */
function decodeIconName(icon, game, variant = null) {
    let size = 32
    let ci = icon.indexOf(':');
    if(ci >= 0) {
        let flags = icon.substring(ci+1);
        icon = icon.substring(0, ci);

        if(game && flags.indexOf('g') >= 0)
            icon += '_'+game;
        if(variant && flags.indexOf('v') >= 0)
            icon += '_'+variant;
        let n = flags.replace(/[^0-9]/g,"");
        if(n)
            size = Number(n);
    }
    return [icon, size];
}

// Returns the [icon, size] for the given class. If variant is not supplied it
// is treated as null.
/* exported getClassIcon */
function getClassIcon(cls, game, variant = null)
{
    return decodeIconName(cls.icon ? cls.icon : 'question_mark', game, variant)
}

// Returns [icon, size] for the given object. If variant not supplied its taken
// from the object.
/* exported getObjectIcon */
function getObjectIcon(object, game, variant = null)
{
    variant = variant ? variant : object.variant;
    if(object.icon)
        return decodeIconName(object.icon, variant);
    else
        return getClassIcon(object.type, game, variant)    
}

