/* Sets up CSS on the Leaflet map so that any left-side controls are pushed to the right while the sidebar
 * is open (so that the controls are not hidden by the sidebar). */
export const setLeafletMapPushCss = (sidebarIsOpen) => {
  let leaflet_map = document.querySelector('.leaflet-control-container');
  if (!leaflet_map) {
    return;
  }
  leaflet_map.classList.add('leaflet-anim-control-container');
  if (sidebarIsOpen) {
    leaflet_map.classList.add('left-opened');
    leaflet_map.classList.remove('left-closed');
  } else {
    leaflet_map.classList.add('left-closed');
    leaflet_map.classList.remove('left-opened');
  }
};
