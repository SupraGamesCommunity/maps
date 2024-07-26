import { GameClasses } from './gameClasses.js';
import { browser } from './utils.js'

export const locStr = {

  // These are the languages we support
  _locales: ['en', 'de', 'es', 'fi', 'fr', 'hu', 'it-IT', 'ja', 'ko', 'pl', 'pt-PT', 'ru', 'sr', 'tr', 'zh-Hans', 'zh-Hant'],

  // Current selected language
  _language: 'en',

  // Localisation strings (dictionary of key => string)
  _locStr: {},

  // Load language strings from json data
  // Set locale to specific language code (null for default from browser)
  // Note: Retuns immediately but loads asynchronously
  loadStrings: async function (lang = null) {
    this._language = lang || browser.getUserLanguage(this._locales);

    // Read the loc strings (we don't actually need english)
    const response = await fetch(`data/loc/locstr-${this._language}.json`);
    const json = await response.json();
    this._locStr = json;
  },

  // Current active language
  getLanguage: function () {
    return this._language;
  },

  // Return value for key or otherwise provided string
  str: function (enStr, lkey) {
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
      }[m];
    });
  },

  // Returns loc str for object containing a 'dkey' and a 'dkey'_key
  objKey: function (dkey, obj, ctype, mapid) {
    const mapIdKey = dkey + '_' + mapid;
    let str;
    if (obj) {
      if (mapIdKey in obj) {
        str = this.str(obj[mapIdKey], obj[mapIdKey + '_key']);
      }
      else {
        str = this.str(obj[dkey], obj[dkey + '_key']);
      }
    }
    if (!str) {
      const gc = GameClasses.get(ctype);
      if (mapIdKey in gc) {
        str = this.str(gc[mapIdKey], gc[mapIdKey + '_key']);
      }
      else {
        str = this.str(gc[dkey], gc[dkey + '_key']);
      }
    }
    if (str) {
      str = this.decodeLocString(ctype, str);
    }
    return str;
  },

  // Convert a SL class name to something a bit more human readable. Not sure this should really be here
  // but it is the simplest place to put it.
  humanReadable: function (type) {
    let s = type;
    s = s.replace('BP_Purchase', '').replace('BP_Buy', '').replace('BP_', '').replace('Purchase_', '').replace('Buy', '')
    s = s.replace(/_C$/, '').replace(/.*:/, '').replace('^_', '');
    s = s.replace(/([A-Z]+|[\d]+)/g, ' $1').replace(/^ /, ''); // camel case to space-separated
    return s;
  },

  // Returns friendly name string for this object (or if none then the type)
  friendly: function (obj, ctype, mapid) {
    return this.objKey('friendly', obj, ctype, mapid) || this.humanReadable(ctype);
  },

  // Returns description name string for this object (null if none)
  description: function (obj, ctype, mapid) {
    return this.objKey('description', obj, ctype, mapid);
  },

  // Returns comment string for this object (null if none)
  comment: function (obj, ctype, mapid) {
    return this.objKey('comment', obj, ctype, mapid);
  },

  coins: function (coins) {
    return this.cost(0, coins);
  },

  // Returns string describing price given priceType code
  cost: function (priceType, price) {
    const priceTypes = {
      0: 'coin',
      5: 'scrap',
      6: 'bone',
      7: 'red moon',
    };
    priceType = priceType || 0;
    return `${price} ${priceTypes[priceType]}${price != 1 && priceType != 5 ? 's' : ''}`;
  }
}