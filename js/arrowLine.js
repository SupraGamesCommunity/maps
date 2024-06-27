//import L from 'leaflet';

// Generate a point on the line, as if line is running left to right. Hence x is the offset from the start
// y is the distance from the line (positive up (thus left))
function _linePoint(start, fwd, x, y) {
    return new L.Point(start.x + fwd.x * x - fwd.y * y, start.y + fwd.y * x + fwd.x * y);
}

L.ArrowLine = L.Polygon.extend({
    options: {
        arrow: 'none',      // Can be 'tip', 'mid', 'none' 
        arrowSize: 0,       // Arrow size (0 means it's just a pointer) with shadow wings
        arrowAngle: 45,     // angle at point of arrow 60 would be equilateral triangle (> 0 < 180)
        lineWidth: 5,       // width of the line in pixels
        shadowWidth: 2,     // width of shadow in pixels
        offset: 0,          // Offset from start position where line should start
        endOffset: 0,       // Offset from end position where line should end
        scaleZoom0: 0.6,    // Scale factor when zoom is 0
        zoom1: 3,           // Zoom when scale should be 1:1 (set to -1 for no dynamic scaling)
                            //   scale = Math.round(size * Math.pow(2, zoom * -Math.log2(s0) / z1) * s0)
        lineJoin: 'round'   // miter, round or bevel

        // fillColor/fillOpacity are colour and opacity of the line
        // color/opacity are colour and opacity of the shadow
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

    initialize: function(start, end, options) {
        L.Util.setOptions(this, options);

        this._map = null;
        this._scalePower = this._calcScalePower();

        this.options.fill = true;                                   // Assume we're drawing the line
        this.options.stroke = Boolean(options.shadowWidth);         // drawing shadow
        this.options.weight = options.shadowWidth;                  // shadow width

        this.startLatLng = start;
        this.endLatLng = end;

        L.Polygon.prototype.initialize([start, end], this.options);
        let bounds = this.getBounds();
        let center = bounds.getCenter();
    },

    onAdd: function(map) {
        L.Polygon.prototype.onAdd.call(this, map);
        this._map.on('zoomend', this._rebuildPolygon, this);
        this._rebuildPolygon();
    },

    onRemove: function(map) {
        map.off('zoomend', this._rebuildPolygon);
        L.Polygon.prototype.onRemove.call(this, map);
    },

    _rebuildPolygon: function(){
        if(this._map) {
            this.setStyle({ 'weight': this.options.shadowWidth * this._getScale(this._map.getZoom()) });
            this.setLatLngs(this._buildArrowLine(this.startLatLng, this.endLatLng));
        }
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

    _buildArrowLine: function(start, end) {
        const opts = this.options;

        const startPt = this._map.latLngToContainerPoint(start, this._map.getZoom());
        const endPt = this._map.latLngToContainerPoint(end, this._map.getZoom());

        // Get length of arrow/line and the vector pointing forward along it
        const lineLen = startPt.distanceTo(endPt);
        const lineVec = endPt.subtract(startPt);

        if(lineLen < 0.0001){
            return [[start], [end]];
        }

        const fwd = lineVec.divideBy(lineLen);

        // Get scale to apply to elements of line based on zoom
        const scale = this._getScale(this._map.getZoom());

        const sy = (opts.lineWidth + opts.shadowWidth) * 0.5 * scale;             // Stroke Y (dist from centre line)
        const bx = (opts.offset - opts.shadowWidth * 0.5) * scale;                // Base X (from start)
        let tx = lineLen - (opts.endOffset - opts.shadowWidth * 0.5) * scale;     // Tip X (from start)

        const d2r = Math.PI / 180;
        const radArrowAngle = opts.arrowAngle * 0.5 * d2r;
        const sinArrowAngle = Math.sin(radArrowAngle);
        const tanArrowAngle = Math.tan(radArrowAngle);

        // Distance from tip of line to center of stroke line
        const d = opts.shadowWidth * 0.5 / sinArrowAngle;

        //  Length of filled arrow from tip to back 
        const ad = (opts.arrowSize + opts.lineWidth) / tanArrowAngle;

        // If arrow is bigger than half the length of the line, don't draw it

        let points = [];
        let downPoints = [];

        function addPoint(x, y){
            points.push(_linePoint(startPt, fwd, x, y));
            if(y > 0){
                downPoints.push(_linePoint(startPt, fwd, x, -y));
            }
        }

        if((opts.arrow == 'tip' || opts.arrow == 'mid')
                && (ad + opts.lineWidth + 2 * d) < (tx - bx)) {

            // Arrow tip is drawn in slightly different place to just a line
            tx = lineLen - (opts.endOffset - d) * scale;         // Tip X (from start)

            const h = d + ad  + opts.shadowWidth / 2;
            const a = h * tanArrowAngle;

            const cy = a * scale;

            if(opts.arrow == 'tip') {
                // How far back and up are the arrow corner points
                const cx = tx - h * scale;

                addPoint(bx,  sy);     // base up
                addPoint(cx,  sy);     // lower corner up
                addPoint(cx,  cy);     // upper corner up
                addPoint(tx,   0);     // tip
            }
            else {
                const cd = (a - opts.lineWidth / 2) / tanArrowAngle;
                const mx = (tx - bx) / 2;
                const cx = mx - cd / 2 * scale;
                const dx = mx + cd / 2 * scale;
    
                addPoint(fwd, bx,  sy);     // base up
                addPoint(fwd, cx,  sy);     // lower corner up
                addPoint(fwd, cx,  cy);     // upper corner up
                addPoint(fwd, dx,  sy);     // front up
                addPoint(fwd, tx,  sy);     // tip up
            }
        }
        else {
            addPoint(bx,  sy);         // base up
            addPoint(tx,  sy);         // tip up
            addPoint(tx, -sy);         // base down
            addPoint(bx, -sy);         // tip down
        }

        points = points.concat(downPoints.reverse());

        return points.map(pt => this._map.containerPointToLatLng(pt, this._map.getZoom()));
    },

    _calcScalePower: function() {
        return -Math.log2(this.options.scaleZoom0) / this.options.zoom1;
    },

    _getScale: function(zoom) {
        return Math.pow(2, zoom * this._scalePower) * this.options.scaleZoom0;
    }    
});

L.arrowLine = function(start, end, options) {
    return new L.ArrowLine(start, end, options);
};