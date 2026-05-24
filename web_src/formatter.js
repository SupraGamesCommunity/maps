import { Util } from 'leaflet';

const COORD_SCALE = 0.01;
const COORD_DIGITS = 1;
const COORD_POW = Math.pow(10, COORD_DIGITS);

// Readies coordinate number for conversion to a string for display by applying the current coordinate
// scale and rounding to the given lat, lng, alt, x, y, z or delta
export function coord(value) {
  value *= COORD_SCALE;
  return Math.round(value * COORD_POW) / COORD_POW;
}

// Convert a delta to a string with a leading + if required, and rounded/scaled
export function delta(delta) {
  return `${delta > 0 ? '+' : ''}${coord(delta)}`;
}
