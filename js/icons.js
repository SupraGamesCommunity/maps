import { L_mapIcon } from './mapIcon.js'

//=================================================================================================
// static class Icons
//
// L.MapIcon creates a dynamically sized Icon object
//
// Call Icons.init() to load the iconConfig.json
//      Defines the icon size, anchor, popup anchor and tooltip anchor
//      By base or full file name
//
// Create an L_MapIcon with Icons.get(options) where options contains {iconName, variant, game}
//
// Icon name may have optional flags: {baseName}:{flags}
//    v - add variant to filename {basename}.{variant}
//    g - add game id to filename {basename}[.{variant}].{game}
//    x{scale} - apply +ve floating point scale to size and anchor positions
//
// Example usage:
//
//      Icons.loadIcons()
//      icon = Icons.get({iconName: 'myicon:vx2', variant: 'red'})  - loads img/markers/myicon.red.png and applies 2x scale to corresponding config
//
//      Corresponding iconConfigs.json entry:
//      {
//          "myicon": {
//              "iconSize": [32, 32],
//              "iconAnchor": [16, 16],
//              "popupAnchor": [0, -16],
//              "tooltipAnchor": [16, 16]
//          }
//      }

export class Icons {

    static _iconConfigsFile = 'data/iconConfigs.json';

    static _imgPath = 'img/markers/';                   // Relative path to marker icon directory
    static _imgExt = '.png';                            // All icon images are 32 bit pngs

    static _defaultIconName = 'question_mark';

    static _defaultConfig = {
        iconSize:      [32,  32],   // Base size for icon in pixels (can be overriden)
        iconAnchor:    [16,  16],   // Anchor position in pixels from top left corner
        popupAnchor:   [ 0, -16],   // Popup position in pixels from anchor point
        tooltipAnchor: [16,  16],   // Tooltip position in pixels from anchor point (if there is one)
    }

    static _iconConfigs = {};        // Dictionary from base name or fullname to icon config

    static _icons = {};             // Dictionary from class name to icon object

    // Load in icon configurations
    static async loadIconConfigs (){
        return fetch('data/iconConfigs.json')
            .then((response) => response.json())
            .then((j) => this._iconConfigs = j);
    }

    // Retrieve the configuration for the specified icon name, if no config try basename otherwise return default
    static getConfig(className) {
        const filename = className.replace('-', '.');
        return this._iconConfigs[filename] || this._iconConfigs[filename.before('.')] || this._defaultConfig;
    }

    // Returns icon options given iconName, variant and game
    // If nothing provided will use _defaultIconName
    static getIconOptions(options){
        // Shallow copy so we don't mess up callers version but make sure we have a valid iconName
        const opts = Object.assign({}, options, {iconName: options.iconName || this._defaultIconName});

        const [baseName, flags] = [...opts.iconName.split(':'), ''];

        // Decode the flag values
        const variant = flags.includes('v') && opts.variant || '';
        const game = flags.includes('g') && opts.game || '';
        
        const match = flags.match(/x[\d.]+/);
        const scale = parseFloat(match && match[0].slice(1)) || 1;    // :x{scale}
    
        // Generate options required for L.MapIcon
        opts.className = [baseName, variant, game, `x${scale.toString().replace('.', '-')}`].filter(Boolean).join('-');
        opts.iconUrl = `${this._imgPath}${[baseName, variant, game].filter(Boolean).join('.')}${this._imgExt}`;
        opts.iconConfig = this.getConfig(opts.className);
        opts.baseScale = scale;
    
        return opts;
    }

    // Returns icon with matching className or generates a new icon. Icon should be
    // added to map to get zoom computed correctly.
    static get(options){
        const opts = this.getIconOptions(options);
        let icon = this._icons[opts.className];
        if(!icon) {
            icon = this._icons[opts.className] = L_mapIcon(opts); 
        }
        return icon;    
    }
}
