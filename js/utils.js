/* global $, L */

//=================================================================================================
// Utility functions

//=================================================================================================
// Browser related functions

export const browser = {
    // Are we running in Firefox browser, ideally only use to deal with bugs in 3rd party libraries on
    // specific browsers, otherwise we should be using capabilities.
    get isFirefox() {
        return window.navigator.userAgent.toLowerCase().includes('firefox');
    },

    // Are we running in VS Code embedded browser? Used to detect if we should use modal dialogs etc.
    get isCode() {
        return window.navigator.userAgent.toLowerCase().includes('code');
    },

    // Returns best guess as to preferred user language from browser
    getLanguage: function(){
        let language;
        if (window.navigator.languages) {
            language = window.navigator.languages[0];
        } else {
            language = window.navigator.userLanguage || window.navigator.language;
        }
        return language;
    },

    // Returns user language that matches one of the languages in 'locales', if no match then
    // returns the first locale in the list as a default.
    getUserLanguage: function(locales){
        let language = browser.getLanguage();
        if(language){
            if(locales.includes(language))
                return language;
            language = language.before('-');
            if(locales.includes(language))
                return language;
        }
        return locales[0];
    },
};

// Retrieves the CSS for 'className' and builds a dictionary from property to value
// for any of the properties in 'props' specified in the CSS. Very much doesn't handle
// the full CSS syntax.
export function cssGetProps(className, props) {
    const div = $("<div>").addClass(className).appendTo(document.body);
    let cssProps = {};
    for(const p of props){
        if(div.css(p)){
            let val = div.css(p);
            val = !isNaN(val) ? Number(val) : val.endsWith('px') ? Number(val.substring(0, val.length-2)) : val.endsWith('%') ? Number(val.substring(0, val.length - 1)) / 100 : val;
            val = typeof val == 'string' ? val.replace(/["']/g, '') : val;
            cssProps[p] = val;
        }
    }
    div.remove();
    return cssProps;
}

//=================================================================================================

// Save a formatted Json version of specified object to the file name (in downloads directory)
export function SaveObjectToJsonFile(obj, fileName) {
    const body = document.body;
    const a = document.createElement("a");
    const file = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});
    a.href = URL.createObjectURL(file);
    a.setAttribute("download", fileName);
    body.appendChild(a)
    a.click();
    body.removeChild(a);
}

//=================================================================================================

// Adds a non-enumerable/configurable/writable function to a base class. Function
// cannot be anonymous
function extendClass(type, fn){
    Object.defineProperty(type.prototype, fn.name, {
        enumerable: false, configurable: false, writable: false,
        value: fn
    });
}

// Returns true if 'item' is an object but not an array (won't handle something like Date)
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

// merges two objects with string members, doesn't handle arrays or other corner cases
export function mergeDeep(target, ...sources) {
    if (!sources.length)
        return target;

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if(!isObject(target[key]))
                    Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}
    
//=================================================================================================
// String extension functions
//
// Extending base classes may be 'evil' on the basis that you are poluting the global namespace
// and could collide with some other library/js environment definition.
//
// We use _ to denote a "private" extension and make all their properties false so any collision
// will hopefully trigger an exception. 


// Returns characters up to first instance of str. If str not found whole string is returned.
extendClass(String, function before(str) {
    let index = this.indexOf(str);
    if(index >= 0) {
        return this.slice(0, index);
    }
    return this;
});

// Returns characters after first instance of str. If str not found empty string is returned  
extendClass(String, function after(str) {
    let index = this.indexOf(str);
    if(index >= 0) {
        return this.slice(index+1);
    }
    return '';
});

// Returns first integer found within string (null if there isn't one)
extendClass(String, function firstInteger() {
    const match = this.match(/\d+/);
    return match && match[0];
}); 

// Returns first fixed floating point number found within string (null if there isn't one)
extendClass(String, function firstFixedFloat() {
    const match = this.match(/[-+]?[0-9]+\. [0-9]+/);
    return match && match[0];
}); 

// Converts camel case string to equivalent snake case
extendClass(String, function camelToSnakeCase() {
    return this.replace(/(.)([A-Z][a-z]+)/, '$1_$2').replace(/([a-z0-9])([A-Z])/, '$1_$2').toLowerCase()
});

// Convert snake (or kebab) case string to equivalent camel case. Note: if multiple _ will only remove one.
// Use: text.replace(/[_]+/g, '_')
extendClass(String, function snakeToCamelCase() {
    return this.toLowerCase().replace(/[-_][a-z0-9]/g, (group) => group.slice(-1).toUpperCase());
});


//=================================================================================================
// Object extension functions

// Mutating non-recursive function to remove null, undefined and empty string members of object/dictionary
extendClass(Object, function removeEmpty(){
    Object.keys(this).forEach((k) => (this[k] === null || this[k] === undefined || this[k] === '') && delete this[k]);
    return this;
});

// Non-mutating non-recursive function to remove null, undefined and empty string members of object/dictionary
extendClass(Object, function emptyRemoved() {
    const ret = {...this};
    Object.keys(ret).forEach((k) => (ret[k] === null || ret[k] === undefined || ret[k] === '') && delete ret[k]);
    return ret;
});

//=================================================================================================
// Leaflet map utility extensions

L.Map.include({
    // By default when zooming in and out everything stays the same size, which means as you zoom out
    // things get bigger relative to the map. To counteract this provides a zoom dependent scale
    // to apply to icons sizes and similar pixel space characteristics.
    _zoomForScaleConfig: {
        scaleZoom0: 0.6,    // Scale factor when map zoom is 0
        zoom1: 3,           // Zoom when scale should be 1:1 (set to -1 for no dynamic scaling)
    },

    // Returns scale to apply to objects based on config and current map zoom
    getScaleForZoom() {
        const scalePower = -Math.log2(this._zoomForScaleConfig.scaleZoom0) / this._zoomForScaleConfig.zoom1;
        return Math.pow(2, this._zoom * scalePower) * this._zoomForScaleConfig.scaleZoom0;
    },

    // Configure the zoom scaling calculation
    configureScaleForZoom(scaleZoom0 = 0.6, zoom1 = 3) {
        this._zoomForScaleConfig.scaleZoom0 = scaleZoom0;
        this._zoomForScaleConfig.zoom1 = zoom1;
    },
 });
 