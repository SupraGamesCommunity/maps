/* global L */

import { browser } from './utils.js';

const _super = L.Polygon.prototype;

export const L_ArrowLine = L.Polygon.extend({
  options: {
    arrow: 'none',      // Can be 'tip', 'back', 'twoway', 'mid', 'none'
    arrowSize: 0,       // Arrow size (0 means it's just a pointer) with shadow wings
    arrowAngle: 45,     // angle at point of arrow 60 would be equilateral triangle (> 0 < 180)
    lineWidth: 5,       // width of the line in pixels
    shadowWidth: 2,     // width of shadow in pixels (can be changed with stroke-width in CSS)
    offset: 0,          // Offset from start position where arrow  should start
    endOffset: 0,       // Offset from end position where arrow tip should be

    // fillColor/fillOpacity are colour and opacity of the line
    // color/opacity are colour and opacity of the shadow
    // lineJoin ('miter', 'round' or 'bevel')
  },

  // Leaflet Polygon Options:
  //
  // Fill is the line:
  //   fill = draw the line (otherwise hollow)
  //   fillColor = line color (CSS = fill)
  //   fillOpacity = line opacity (CSS = fill-opacity)
  // Stroke is the shadow:
  //   stroke = draw the shadow
  //   color = shadow color  (CSS = stroke)
  //   weight = width of the shadow (CSS = stroke-width)
  //   opacity = shadow opacity (CSS = opacity)

  initialize: function (start, end, options) {
    const className = options.className;

    // Override default options with the CSS configuration
    if (className) {
      let cssOpts = browser.cssGetProps(className, ['--arrow', '--arrow-size', '--arrow-angle', '--line-width', '--shadow-width', '--offset', '--end-offset']);
      for (const [k, v] of Object.entries(cssOpts)) {
        delete cssOpts[k];
        cssOpts[k.slice(2).snakeToCamelCase()] = v;
      }
      this.options = Object.assign({}, this.options, cssOpts);
    }
    
    L.setOptions(this, options);

    this._startLatLng = start;
    this._endLatLng = end;

    _super.initialize.call(this, [start, end], this.options);
  },

  setStartEnd: function (start, end) {
    if (start != this._startLatLng || end != this._endLatLng) {
      this._startLatLng = start;
      this._endLatLng = end;
      this.redraw();
    }
  },

  setArrow: function (arrow) {
    if (arrow != this.options.arrow) {
      this.options.arrow = arrow;
      this.redraw();
    }
  },

  setStyle: function (style) {
    L.setOptions(this, style);
    this.redraw();
  },

  onAdd: function (map) {
    _super.onAdd.call(this, map);

    // set alt for polylines (attributes are not populated to paths) (we could put this in L.Polyline.include({onAdd...})
    this._path.setAttribute('alt', this.options.alt);

    this._map.on('zoomend', this.redraw, this);

    this.redraw();
  },

  onRemove: function (map) {
    map.off('zoomend', this.redraw, this);
    _super.onRemove.call(this, map);
  },

  redraw: function () {
    if (this._map) {
      this.options.fill = true;
      this.options.stroke = (this.options.shadowWidth > 0);
      this.options.weight = this.options.shadowWidth * this._map.getPixelResizeScale();

      this._setLatLngs(this._buildArrowLine(this._startLatLng, this._endLatLng));

      if (this._renderer) {
        this._renderer._updateStyle(this);
        if (this.options.stroke) {
          this._updateBounds();
        }
        this._renderer._updatePath(this);
      }
    }
    return this;
  },

  /*
      We're creating a set of points where the shadow is drawn by the stroke of
      the polygon and the line is the filled area. So we need to calculate the stroke
      points which are in the middle of the shadow area.

                                  |   3C   \
                                  |   | \     \
          +-----------------------+   |    \     \
          |                           |       \     \
          |   1------stroke-----------2   +      D     \
          |   |                           a   \     \     \
          |   |   +-----------------------+      \     \     \
          |   |   |                                 \     \     \
     S    |   B   |         Filled                    *    4T  d  *     E
          |   |   |                                 /     /     /
          |   |   +-----------------------+      /     /     /
          |   |                           |   /     /     /
          |   7-----------------------6   +      x     /
                                      <        h       >
      Numbered points are points we're going to draw
      S = start point
      E = end point
      d = distance from tip of arrow to the stroke line
      h = length of drawn arrow
      a = width of arrow head beyond base line
      B = base point of arrow (S + offset + half shadow width)
      T = tip point of arrow (E - endOffset - d)
      C = corner of stroke arrow (a away from center line)
      D = Point where mid-point arrow line continues

      We have 4 critical points along the line:
          B - base / beginning of line
          C - arrow corner
          D - where arrow meets stroke line again
          T - Tip of line (or arrow)
      We have 2 critical disances from the center line:
          S - stroke line
          C - Arrow corner point
  */
  // Arrow line key x distances:
  //   start, end      The actual position of start and end of the line without offsets
  //   tip             Arrows at either end have a tip offset from start or end
  //   base            Blunt ends have a base X, close to but slightly different to tip
  //   mid             The point where the line from tip to corner meets the straight line
  //   corner          The point where the arrow turns
  //
  // Arrow line key y distances:
  //   center          0
  //   line            distance from center to line (shadowWidth + lineWidth) / 2
  //   arrow           distance from line to corner
  //
  // Note: all of these are for the stroke line which is at the center of the shadow line

  _buildArrowLine: function (start, end) {
    const opts = this.options;

    const startPt = this._map.latLngToContainerPoint(start);
    const endPt = this._map.latLngToContainerPoint(end);

    // Get scale to apply to elements of line based on zoom
    const scale = this._map.getPixelResizeScale();

    // Unit vector along line, used to transform xy points in line space to point space
    // and length of line in unscaled units
    let lineLen = startPt.distanceTo(endPt);
    const fwd = endPt.subtract(startPt).divideBy(lineLen);
    lineLen = lineLen / scale;

    // Line is too short (could be zero or negative length). If it appears
    // at all it will be just shadow
    if (lineLen <= (opts.offset + opts.endOffset)) {
      return [[start], [end]];
    }

    // Generate a point on the line, as if line is running left to right. Hence x is the offset from the start
    // y is the distance from the line (positive up (thus left))
    function linePoint(start, fwd, x, y) {
      return new L.Point(start.x + fwd.x * x - fwd.y * y, start.y + fwd.y * x + fwd.x * y);
    }

    // Line points we're generating
    let points = [];
    let downPoints = [];

    // Add a point for the line, if y is not 0 then add a symmetric point do downPoints
    function addPoint(x, y) {
      points.push(linePoint(startPt, fwd, x * scale, y * scale));
      if (y > 0) {
        downPoints.push(linePoint(startPt, fwd, x * scale, -y * scale));
      }
    }

    // Everything is keyed off the arrow point angle
    const d2r = Math.PI / 180;
    const radArrowAngle = opts.arrowAngle * 0.5 * d2r;
    const sinArrowAngle = Math.sin(radArrowAngle);
    const tanArrowAngle = Math.tan(radArrowAngle);

    const strokeY = (opts.lineWidth + opts.shadowWidth) * 0.5;      // Stroke Y (dist from centre line)
    const d = opts.shadowWidth * 0.5 / sinArrowAngle;               // Distance from tip of line to center of stroke line
    const ad = (opts.arrowSize + opts.lineWidth * 0.5) / tanArrowAngle;   // Length of filled arrow from tip to corner
    const h = d + ad + opts.shadowWidth * 0.5;                     // Length of stroke arrow from tip to corner
    const cornerY = h * tanArrowAngle;                              // Distance from line to arrow corner

    const drawArrows = true;//(lineLen - opts.offset - opts.endOffset) >= h * (opts.arrow == 'twoway' ? 2 : 1);

    if (drawArrows && (opts.arrow == 'back' || opts.arrow == 'twoway')) {
      const tx = opts.offset - d;     // Arrow stroke is drawn just back from filled arrow start
      const cx = tx + h;              // Arrow corner is just arrow "height" from tip
      addPoint(tx, 0);
      addPoint(cx, cornerY);
      addPoint(cx, strokeY)
    }
    else {
      const ofs = (opts.arrow == 'twowway' || opts.arrow == 'back') ? opts.offset : 0;
      addPoint(-opts.shadowWidth * 0.5 + ofs, strokeY)
    }

    if (drawArrows && opts.arrow == 'mid') {
      const mx = (opts.offset + (lineLen - opts.endOffset)) * 0.5;    // Mid point of line
      const cd = (cornerY - opts.lineWidth * 0.5) / tanArrowAngle;      // Arrow distance from corner to mid-point (D)
      const cx = mx - cd / 2 * scale;
      const dx = mx + cd / 2 * scale;

      addPoint(cx, strokeY);     // lower corner up
      addPoint(cx, cornerY);     // upper corner up
      addPoint(dx, strokeY);     // front up
    }

    if (drawArrows && (opts.arrow == 'tip' || opts.arrow == 'twoway')) {
      const tx = lineLen - opts.endOffset + d;
      const cx = tx - h;
      addPoint(cx, strokeY);
      addPoint(cx, cornerY);
      addPoint(tx, 0);
    }
    else {
      const ofs = (opts.arrow == 'tip' || opts.arrow == 'twoway') ? -opts.endOffset : 0;
      addPoint(lineLen + opts.shadowWidth * 0.5 + ofs, strokeY); // Line end
    }

    points = points.concat(downPoints.reverse());

    return points.map(pt => this._map.containerPointToLatLng(pt, this._map.getZoom()));
  },

  _calcScalePower: function () {
    return -Math.log2(this.options.scaleZoom0) / this.options.zoom1;
  },

  _getScale: function (zoom) {
    return Math.pow(2, zoom * this._scalePower) * this.options.scaleZoom0;
  }
});

export const L_arrowLine = function (start, end, options) {
  return new L_ArrowLine(start, end, options);
};