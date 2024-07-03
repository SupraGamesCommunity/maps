/* global locStr */

/* exported locStr */
const locStr = {

    // These are the languages we support
    _locales: ['en', 'de', 'es', 'fi', 'fr', 'hu', 'it-IT', 'ja', 'ko', 'pl', 'pt-PT', 'ru', 'sr', 'tr', 'zh-Hans', 'zh-Hant'],

    // Current selected language
    _language: 'en',

    // Localisation strings (dictionary of key => string)
    _locStr: {},

    // Fetch the language strings and process them
    init: async function(lang = null) {
        this.setLanguage(lang);
    },

    // Set locale to specific language code (null for default from browser)
    // Note: Retuns immediately but loads asynchronously
    setLanguage: async function(lang = null){
        this._language = lang || browser.getUserLanguage(this._locales);

        // Read the loc strings (we don't actually need english)
        const response = await fetch(`data/loc/locstr-${this._language}.json`);
        const json = await response.json();
        this._locStr = json;
    },

    // Current active language
    getLanguage: function(){
        return this._language;
    },

    // Return value for key or otherwise provided string
    str: function(enStr, lkey){
        return this._locStr && lkey && this._locStr[lkey] || enStr;
    },

    // Replace the form of template literals in the loc strings.
    decodeLocString: function (ctype, str) {
        return str.replace(/\{.*\}/g, (m) => {
            let n = ctype.firstInteger(ctype);
            return {
                '{damageNumber}': n,
                '{percentage}': n,
                '{duration}': n,
                '{healthIncrease}': n,
                '{regenCeiling}': '?',
                '{#}': '?',
            } [m];
        }); 
    },

    // Returns loc str for object containing a 'dkey' and a 'dkey'_key
    objKey: function(dkey, obj, ctype, mapid) {
        const siukey = dkey+'_siu'  
        let str;
        if(obj){
            if(mapid == 'siu' && siukey in obj) {
                str = this.str(obj[siukey], obj[siukey+'_key']);
            }
            else {
                str = this.str(obj[dkey], obj[dkey+'_key']);
            }
        }
        if(!str){
            const gc = gameClasses[ctype] || defaultGameClass;
            if(mapid == 'siu' && siukey in gc) {
                str = this.str(gc[siukey], gc[siukey+'_key']);
            }
            else {
                str = this.str(gc[dkey], gc[dkey+'_key']);
            }
        }
        if(str) {
            str = locStr.decodeLocString(ctype, str);
        }
        return str;
    },

    // Returns friendly name string for this object
    friendly: function(obj, ctype, mapid) {
        return this.objKey('friendly', obj, ctype, mapid)
    },

    // Returns description name string for this object
    description: function(obj, ctype, mapid) {
        return this.objKey('description', obj, ctype, mapid)
    }
}