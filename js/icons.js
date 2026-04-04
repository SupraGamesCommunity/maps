import { L_mapIcon } from './mapIcon.js'
import { toSupraColor, isSupraColor } from './supraDefs.js';

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

  static _imgPath = 'img/markers/';                   // Relative path to marker icon directory
  static _imgExt = '.png';                            // All icon images are 32 bit pngs

  static _defaultIconName = 'question_mark';
  
  static _pointConfig = {
    type:          'point',     // Point style marker icon
    style:         'png',       // Raw PNG style
    iconSize:      [32,  32],   // Base size for icon in pixels (can be overriden)
    iconAnchor:    [16,  16],   // Anchor position in pixels from top left corner
    popupAnchor:   [ 0, -16],   // Popup position in pixels from anchor point
    tooltipAnchor: [16,  16],   // Tooltip position in pixels from anchor point (if there is one)
  }

  static _pinConfig = {
    type:          'pin',       // Pin style marker icon
    style:         'png',       // Font Awesome Solid (options: fas..., fapng, png)
    iconSize:      [32,  32],   // Base size for icon in pixels (can be overriden)
    iconAnchor:    [16,  32],   // Anchor position in pixels from top left corner
    popupAnchor:   [ 0, -32],   // Popup position in pixels from anchor point
    tooltipAnchor: [16,   0],   // Tooltip position in pixels from anchor point (if there is one)
  }

  static _iconConfigs = {};       // Dictionary from base name or fullname to icon config

  static _icons = {};             // Dictionary from class name to icon object

  // Load in icon configurations
  static async loadIconConfigs() {
    const response = await fetch('data/iconConfigs.json')
    const j = await response.json();
    this._iconConfigs = j;
    let icondecodes = []
    for(const cfg in this._iconConfigs){
      if(this._iconConfigs[cfg].style == 'fapng'){
        this._iconConfigs[cfg].img = new Image();
        this._iconConfigs[cfg].img.src = this._imgPath + this._iconConfigs[cfg].iconName + this._imgExt;
        icondecodes.push(this._iconConfigs[cfg].img.decode());
      }
    }
    await Promise.all(icondecodes);
  }

  // Retrieve the configuration for the specified icon name, if no config try basename otherwise return default
  static getConfig(className) {
    const filename = className.replace('-', '.');
    const cfg = this._iconConfigs[filename] || this._iconConfigs[filename.before('.')] || {};
    return Object.assign({}, (cfg.type == 'pin' ? this._pinConfig : this._pointConfig), cfg); // fill in defaults
  }

  // Render a Font Awesome Icon and return an Image URL
  static renderFAIconToImageURL(
      isPin,          // Boolean true for pin, false for point
      style,          // FA prefix (fas=solid, far=regular, fal=light, fat=thin, dad=duotone, fab=brands)
      iconName,       // Name of an FA Icon
      bg,             // Background colour
      fg = 'white'    // Foreground colour
    ) {

    const faPin = 'location-pin';        // FA icon used for map pin marker background
    const faPoint = 'circle';            // FA icon used for map point marker background
    const faDefault = 'question-circle'; // FA icon used if asked for unknown icon
    const size = 48;                     // Size to render icons
    const outlineSize = size * 0.976;    // Scale adjustment between shadow and background
    const pinCentreOfs = size * -0.125;  // Y offset from centre of icon to centre for a pin
    const pinIconSize = size * 0.5;      // Size to draw the FA icon on a pin marker
    const ptIconSize = size * 0.55;      // Size to draw the FA icon on a point marker

    // We're going to draw the icon to a canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // This function draws one of the icon layers in some colour
    function drawFAIcon(prefix, iconName, color, pixelSize, dy = 0) {
      // Get a font awesome icon specified by prefix and icon name 
      let icon = FontAwesome.icon({ prefix, iconName })
        || FontAwesome.icon({ prefix:'fa', iconName: faDefault });

      // Extract the width/height and SVG path data from the icon
      const [w, h, , , path] = icon.icon;

      // Centre FA icon and scale it to fill the target
      const scale = pixelSize / h;
      const iconWidthPx = w * scale;
      const dx = (size - iconWidthPx) / 2;
      const dyPx = (size - pixelSize) / 2 + dy;
      ctx.setTransform(scale, 0, 0, scale, dx, dyPx);

      // Draw the path of the icon in the specified color
      ctx.fillStyle = toSupraColor(color);
      const path2d = new Path2D(path);
      ctx.fill(path2d);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Draw a PNG as the Icon instead of an FA icon
    function drawPNGIcon(iconName, tgtSize, iconSize, dy = 0) {
      ctx.drawImage(iconName, (size - iconSize) * 0.5, 0 - dy, iconSize, iconSize);
    }

    bg = toSupraColor(bg) || 'grey';
    fg = toSupraColor(fg) || 'white';

    // We draw FA icons in three layers, a shadow, a slightly smaller background,
    // and then some centred icon to actually represent it.
    if(isPin) {
      drawFAIcon('fas', faPin, 'black', size);
      drawFAIcon('fas', faPin, bg, outlineSize);

      if(style != 'fapng')
        drawFAIcon(style, iconName, toSupraColor(fg || 'white'), pinIconSize, pinCentreOfs);
      else
        drawPNGIcon(iconName, size, pinIconSize, pinCentreOfs);
    }
    else {
      drawFAIcon('fas', faPoint, 'black', size);
      drawFAIcon('fas', faPoint, fg, outlineSize);

      if(style != 'fapng')
        drawFAIcon(style, iconName, fg, ptIconSize);
      else
        drawPNGIcon(iconName, size, ptIconSize);
    }

    return canvas.toDataURL('image/png'); 
  }

  // Returns icon options given iconName, variant and game
  static getIconOptions(options) {
      // Shallow copy so we don't mess up callers version but make sure we have a valid iconName
    const opts = Object.assign({}, options, { iconName: options.iconName || this._defaultIconName });

    // Split out flags
    const [baseName, flags] = [...opts.iconName.split(':'), ''];

    // Decode the flag values and get each element
    opts.variant = flags.includes('v') && opts.variant || '';
    opts.game = flags.includes('g') && opts.game || '';

    const match = flags.match(/x[\d.]+/);
    opts.baseScale = parseFloat(match && match[0].slice(1)) || 1;    // :x{scale}

    // Generate options required for L.MapIcon
    opts.className = [baseName, opts.variant, opts.game, `x${opts.baseScale.toString().replace('.', '-')}`].filter(Boolean).join('-');
    opts.iconConfig = this.getConfig(opts.className);
    opts.iconConfig.bg = (isSupraColor(opts.variant) ? opts.variant : opts.iconConfig.bg);
    opts.iconUrl = `${this._imgPath}${[opts.iconConfig.iconName || baseName, opts.variant, opts.game].filter(Boolean).join('.')}${this._imgExt}`;

    return opts;
  }

  // Returns icon with matching className or generates a new icon. Icon should be
  // added to map to get zoom computed correctly.
  // Options: { iconName: iconName, variant: this.o.variant, game: map.mapId }
  static get(options) {
    const opts = this.getIconOptions(options);
    let icon = this._icons[opts.className];
    if (!icon) {
      // If not a PNG then we need to generate it
      if(opts.iconConfig.style != 'png') {
        const isPin = (opts.iconConfig.type == 'pin');
        const style = opts.iconConfig.style;
        const iconName = style == 'fapng' ? opts.iconConfig.img : opts.iconConfig.iconName;
        opts.iconUrl = this.renderFAIconToImageURL(isPin, style, iconName, opts.iconConfig.bg, opts.iconConfig.fg);
      }
      else
        console.log("debug")
      icon = this._icons[opts.className] = L_mapIcon(opts);
    }
    return icon;
  }
}
