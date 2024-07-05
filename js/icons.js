//=================================================================================================
// static class Icons
//
// L.MapIcon creates a dynamically sized Icon object
//
// Call Icons.init() to load the iconConfig.json
//      Defines the icon size, anchor, popup anchor and tooltip anchor
//      By base or full file name
//
// Create an L.MapIcon with L.mapIcon(options) where options contains {iconName, variant, game}
//
// Icon name may have optional flags: {baseName}:{flags}
//    v - add variant to filename {basename}.{variant}
//    g - add game id to filename {basename}[.{variant}].{game}
//    x{scale} - apply +ve floating point scale to size and anchor positions
//
// Example usage:
//
//      Icons.init()
//      icon = L.mapIcon({iconName: 'myicon:vx2', variant: 'red'})  - loads img/markers/myicon.red.png and applies 2x scale to corresponding config
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

class Icons {

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
    static async init (){
        return this._loadIconConfigs();
    }

    static async _loadIconConfigs(){
        return fetch('data/iconConfigs.json')
            .then((response) => response.json())
            .then((j) => this._iconConfigs = j);

        // Might be nice to compute some 
    }

    // Retrieve the configuration for the specified icon name, if no config try basename otherwise return default
    static getConfig(className) {
        const filename = className.replace('-', '.');
        return this._iconConfigs[filename] || this._iconConfigs[filename.before('.')] || _defaultConfig;
    }

    // Returns icon options given iconName, variant and game
    // If nothing provided will use _defaultIconName
    static getIconOptions(options){
        // Shallow copy so we don't mess up callers version but make sure we have a valid iconName
        const opts = Object.assign({}, options, {iconName: options.iconName || this.defaultIconName});

        const [baseName, flags] = [...opts.iconName.split(':'), ''];

        // Decode the flag values
        const variant = flags.includes('v') && opts.variant || '';
        const game = flags.includes('g') && opts.game || '';
        
        const match = flags.match(/x[\d\.]+/);
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
    static create(options){
        const opts = this.getIconOptions(options);
        let icon = this._icons[opts.className];
        if(!icon) {
            icon = this._icons[opts.className] = new L.MapIcon(opts); 
        }
        return icon;    
    }
}

var myZoomCount = 0;

// These options are provided to L.MapIcon.Initialize (and Icons.create / L.mapIcon):
//
// iconName:      name of icon with optional flags
// variant:       variant name if there is one
// game:          game id if needed (sl, siu, slc)
//
// These options are generated from basic options:
//
// className:     unique class name (needed for resizing)
// iconURL:       generated from iconName/variant/game
// iconConfig:    config data for this icon
// baseScale:     base scale to be applied to this icon (before zoom scale)
//
// These options are generated from the icon config and current scale (in initialize fn):
// 
// iconSize:      Base size for icon in pixels (can be overriden)
// iconAnchor:    Anchor position in pixels from top left corner
// popupAnchor:   Popup position in pixels from anchor point
// tooltipAnchor: Tooltip position in pixels from anchor point (if there is one)

L.MapIcon = L.Icon.extend ({

    // Pass on the options as passed in and apply scaled config
    initialize: function(options){
        L.Util.setOptions(this, options);

        this._iconScale = 1;            // Current scale embodied by options
        this._iconRefresh = false;      // Do we need to refresh CSS for icons?
        this._mapAdded = false;         // Has we been added to map?     

        this._resize();
    },

    createIcon: function(oldIcon){
        // Icon has been created while not added to map so may need CSS updating
        this._iconRefresh = !this._mapAdded;

        return L.Icon.prototype.createIcon.call(this, oldIcon);
    },

    // Resize icon on zoomend or overlayadd events 
    addTo: function(map){
        this._mapAdded = true;

        map.on('zoomend overlayadd', this._resizeEvent, this);

        this._resize(map);
        
        return this;
    },

    // Stop listening for zoomend and overlayadd events 
    removeFrom: function(map){

        this._mapAdded = false;
        this._iconRefresh = false;

        map.off('zoomend overlayadd', this._resizeEvent);

        return this;
    },

    // Called to u-date scale, applies rescaled config to options and stores new scale
    // Applies rescale to CSS if required
    _resize: function(map) {
        const scale = (map && map.getScaleForZoom() || 1) * this.options.baseScale;
        let rescaleCss = this._iconRefresh && this._mapAdded;

        // If scale has changed apply it to options
        if(scale != this._iconScale){
             for(const [k, v] of Object.entries(this.options.iconConfig)){
                this.options[k] = [Math.round(v[0] * scale), Math.round(v[1] * scale)];
            }
            this._iconScale = scale;
            rescaleCss = this._mapAdded;
        }

        if(rescaleCss){
            // Apply scale to icon CSS
            $(`#map .${this.options.className}`).css({
                'width':`${this.options.iconSize[0]}px`, 'height':`${this.options.iconSize[1]}px`,
                'margin-left':`${-this.options.iconAnchor[0]}px`, 'margin-top':`${-this.options.iconAnchor[1]}px`
            });

            this._iconRefresh = false;
            myZoomCount++;   
        }
    },

    // Event triggering resize
    _resizeEvent: function(e) {
        this._resize(e.target);     // Pass in map
    }
});

// Traditional syntactic sugar for leaflet extended object to allow instance = L.mapIcon({options}).addTo(map)
L.mapIcon = function(options) {
    return Icons.create(options);
};
