/* global $ */

export const supraColors = {
  aqua: '#00FFFF',
  black: '#030303',
  blue: '#0000FF',
  brown: '#964B00',
  custom: '#FFFFFF',
  cyan: '#00FFFF',
  gold: '#FFD700', // #EEE8AA, #FFD700, #EFBF04, #FFBF00, #DAA520, #CFB53B, #B8860B
  green: '#49FF00',
  grey: '#898989',
  lightorange: '#FFD680',
  lime: '#00FF00',
  magenta: '#FF00FF',
  orange: '#FF7700',
  pink: '#A74472',
  purple: '#800080',
  red: '#FF0000',
  teal: '#00EBFF',
  white: '#FFFFFF',
  yellow: '#d1bb0f', //"#FFFF00",
};

export const toSupraColor = (col) => {
  return supraColors[col] || col;
};
export const isSupraColor = (col) => {
  return col in supraColors;
};
