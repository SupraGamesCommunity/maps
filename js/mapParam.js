
// Helper for dealing with the loadMap parameters configuration
export class MapParam {
  constructor(param) {
    let mp = param;
    if(typeof param === 'string'){
      mp = {};
      if (param.length > 1) {
        for (const s of param.slice(1).toLowerCase().split('&')) {
          let [k, v] = s.split('=');
          mp[k] = v;
        }
      }  
    }

    this.mapId = mp.mapId || mp.mapid;

    if ('n' in mp && 's' in mp && 'e' in mp && 'w' in mp) {
      [this.n, this.w, this.s, this.e] = [mp.n, mp.w, mp.s, mp.e];
    }
    else {
      if ('zoom' in mp) {
        this.zoom = mp.zoom;
      }
      if ('lat' in mp && 'lng' in mp) {
        [this.lat, this.lng] = [mp.lat, mp.lng];
      }
    }
  }
  hasView() { return 'zoom' in this || 'lat' in this; }
  hasBounds() { return 'n' in this; }

  getZoom(def) { return 'zoom' in this ? this.zoom : def; }
  getCenter(def) { return 'lat' in this ? [this.lat, this.lng] : def; }
  getBounds(def) { return 'n' in this ? [[this.n, this.w], [this.s, this.e]] : def; }
  get bounds() { return [[this.n, this.w], [this.s, this.e]] }

  // Generate our URL format based on current state
  // {base url}#map={sl|slc|siu}&W={bounds west lng}&N={north}&E={east}&S={south}
  static getViewURL(map) {
    const base = window.location.href.replace(/#.*$/, '')
    const b = map.getBounds();
    const vars = { mapId: map.mapId, W: Math.round(b.getWest()), N: Math.round(b.getNorth()), E: Math.round(b.getEast()), S: Math.round(b.getSouth()) };
    const url = base + '#' + Object.entries(vars).map((e) => e[0] + '=' + encodeURIComponent(e[1])).join('&');
    return url;
  }
}
