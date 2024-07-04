//=================================================================================================
// Utility functions

/* global browser */

//=================================================================================================
// Browser related functions

/* exported browser */
let browser = {
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

//=================================================================================================
// String extension functions

// Returns characters up to first instance of str. If str not found whole string is returned.
String.prototype.before = function(str) {
    let index = this.indexOf(str);
    if(index >= 0) {
        return this.slice(0, index);
    }
    return this;
} 

// Returns characters after first instance of str. If str not found empty string is returned  
String.prototype.after = function(str) {
    let index = this.indexOf(str);
    if(index >= 0) {
        return this.slice(index+1);
    }
    return '';
}

// Returns first integer string found within string (null if there isn't one)
String.prototype.firstInteger = function(){
    const match = this.match(/\d+/g);
    return match && match[0];
}


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
 