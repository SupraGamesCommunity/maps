import { L_mapIcon } from './mapIcon.js';
import { isSupraColor } from './supraDefs.js';

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
//          "myicon": {         **** TODO: Out of date documentation - format has changed
//              "iconSize": [32, 32],
//              "iconAnchor": [16, 16],
//              "popupAnchor": [0, -16],
//              "tooltipAnchor": [16, 16]
//          }
//      }

export class Icons {
  static _iconConfigsFile = 'data/iconConfigs.json';

  static _imgPath = 'img/markers/'; // Relative path to marker icon directory

  // All FA generated icons are png, everything else is given by the style
  static getImgExt(style) {
    return style.startsWith('fa') ? 'png' : style;
  }

  static _defaultIconName = 'question_mark';

  static _pointConfig = {
    type: 'point', // Point style marker icon
    style: 'png', // Raw PNG style
    iconSize: [32, 32], // Base size for icon in pixels (can be overriden)
    iconAnchor: [16, 16], // Anchor position in pixels from top left corner
    popupAnchor: [0, -16], // Popup position in pixels from anchor point
    tooltipAnchor: [16, 16], // Tooltip position in pixels from anchor point (if there is one)
  };

  static _pinConfig = {
    type: 'pin', // Pin style marker icon
    style: 'png', // Font Awesome Solid (options: fas..., fapng, png)
    iconSize: [32, 32], // Base size for icon in pixels (can be overriden)
    iconAnchor: [16, 32], // Anchor position in pixels from top left corner
    popupAnchor: [0, -32], // Popup position in pixels from anchor point
    tooltipAnchor: [16, 0], // Tooltip position in pixels from anchor point (if there is one)
  };

  static _iconConfigs = {}; // Dictionary from base name or fullname to icon config

  static _icons = {}; // Dictionary from class name to icon object

  // Load in icon configurations
  static async loadIconConfigs() {
    const response = await fetch('data/iconConfigs.json');
    const j = await response.json();
    this._iconConfigs = j;
  }

  // Retrieve the configuration for the specified icon name, if no config try basename otherwise return default
  static getConfig(className) {
    const filename = className.replace('-', '.');
    const cfg = this._iconConfigs[filename] || this._iconConfigs[filename.before('.')] || {};
    return Object.assign({}, cfg.type == 'pin' ? this._pinConfig : this._pointConfig, cfg); // fill in defaults
  }

  // Returns icon options given iconName, variant and game
  static getIconOptions(options) {
    // Shallow copy so we don't mess up callers version but make sure we have a valid iconName
    const opts = Object.assign({}, options, { iconName: options.iconName || this._defaultIconName });

    // Split out flags
    const [baseName, flags] = [...opts.iconName.split(':'), ''];

    // Decode the flag values and get each element
    opts.variant = (flags.includes('v') && opts.variant) || '';
    opts.game = (flags.includes('g') && opts.game) || '';

    const match = flags.match(/x[\d.]+/);
    opts.baseScale = parseFloat(match && match[0].slice(1)) || 1; // :x{scale}

    // Generate options required for L.MapIcon
    opts.className = [baseName, opts.variant, opts.game, `x${opts.baseScale.toString().replace('.', '-')}`]
      .filter(Boolean)
      .join('-');
    opts.iconConfig = this.getConfig(opts.className);
    opts.iconConfig.bg = isSupraColor(opts.variant) ? opts.variant : opts.iconConfig.bg;
    const ext = Icons.getImgExt(opts.iconConfig.style);
    opts.iconUrl = `${this._imgPath}${[baseName, opts.variant, opts.game, ext].filter(Boolean).join('.')}`;

    return opts;
  }

  // Returns icon with matching className or generates a new icon. Icon should be
  // added to map to get zoom computed correctly.
  // Options: { iconName: iconName, variant: this.o.variant, game: map.mapId }
  static get(options) {
    const opts = this.getIconOptions(options);
    let icon = this._icons[opts.className];
    if (!icon) {
      icon = this._icons[opts.className] = L_mapIcon(opts);
    }
    return icon;
  }
}
