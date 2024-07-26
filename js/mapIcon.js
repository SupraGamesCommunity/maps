/* globals L, $ */

// These options are provided to Icons.create:
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

export const L_MapIcon = L.Icon.extend({

  // Pass on the options as passed in and apply scaled config
  initialize: function (options) {
    L.setOptions(this, options);

    this._iconScale = 1;            // Current scale embodied by options
    this._iconRefresh = false;      // Do we need to refresh CSS for icons?
    this._mapAdded = false;         // Has we been added to map?     

    this._resize();
  },

  createIcon: function (oldIcon) {
    // Icon has been created while not added to map so may need CSS updating
    this._iconRefresh = !this._mapAdded;

    return L.Icon.prototype.createIcon.call(this, oldIcon);
  },

  // Resize icon on zoomend or overlayadd events 
  addTo: function (map) {
    this._mapAdded = true;

    map.on('zoomend overlayadd', this._resizeEvent, this);
    this._resize(map);

    return this;
  },

  // Stop listening for zoomend and overlayadd events 
  removeFrom: function (map) {

    this._mapAdded = false;
    this._iconRefresh = false;

    map.off('zoomend overlayadd', this._resizeEvent);

    return this;
  },

  // Called to update scale, applies rescaled config to options and stores new scale
  // Applies rescale to CSS if required
  _resize: function (map) {
    const scale = (map && map.getPixelResizeScale() || 1) * this.options.baseScale;
    let rescaleCss = this._iconRefresh && this._mapAdded;

    // If scale has changed apply it to options
    if (scale != this._iconScale) {
      for (const [k, v] of Object.entries(this.options.iconConfig)) {
        this.options[k] = [Math.round(v[0] * scale), Math.round(v[1] * scale)];
      }
      this._iconScale = scale;
      rescaleCss = this._mapAdded;
    }

    if (rescaleCss) {
      // Apply scale to icon CSS
      $(`#map .${this.options.className}`).css({
        'width': `${this.options.iconSize[0]}px`, 'height': `${this.options.iconSize[1]}px`,
        'margin-left': `${-this.options.iconAnchor[0]}px`, 'margin-top': `${-this.options.iconAnchor[1]}px`
      });

      this._iconRefresh = false;
    }
  },

  // Event triggering resize
  _resizeEvent: function (e) {
    this._resize(e.target);     // Pass in map
  }
});

// Traditional syntactic sugar for leaflet extended object to allow instance = L.mapIcon({options}).addTo(map)
export const L_mapIcon = function (options) {
  return new L_MapIcon(options);
};
