/* global L */

import { StrictMode } from 'react';
import { Sidepanel } from './Sidepanel.jsx';
import { LayerSelect_Data } from './LayerSelect_Data.jsx';
import { createRoot } from 'react-dom/client';
import { setLeafletMapPushCss } from './setLeafletMapPushCss.jsx';

let sidepanelRoot = null;

function getSidepanelContainer() {
  return document.getElementById('sidepanel');
}

/* Initializes the DOM to support the sidepanel. */
export function initSidepanelDom() {
  const sidepanelContainer = getSidepanelContainer();
  // sidepanelContainer.replaceChildren(); // Clear all child elements

  // Adds stopPropagation to the element's 'wheel' events (plus browser variants).
  L.DomEvent.disableScrollPropagation(sidepanelContainer);
  // Adds stopPropagation to the element's 'click', 'dblclick', 'contextmenu', 'mousedown'
  // and 'touchstart' events (plus browser variants).
  L.DomEvent.disableClickPropagation(sidepanelContainer);
}

/*
 * Initializes the sidepanel, with a specific MapLayer map.
 * This is called whenever the user switches the game map (e.g. SupraLand, SupraWorld, etc)
 */
export function renderSidepanel(map) {
  let layerSelectData = new LayerSelect_Data(map);

  if (sidepanelRoot === null) {
    sidepanelRoot = createRoot(getSidepanelContainer());
  }

  setLeafletMapPushCss(true);

  function render() {
    const layerSelectorProps = {
      leafletMap: map,
      mapSelections: layerSelectData.getMapSelectorProps(),
      overlaySelections: layerSelectData.getOverlayLayerProps(),
      onMapChange: (name, value) => layerSelectData.onMapChangeHandler(name, value),
      onOverlayChange: (value, isChecked) => layerSelectData.onOverlayChangeHandler(value, isChecked),
    };
    sidepanelRoot.render(
      <StrictMode>
        <Sidepanel layerSelectorProps={layerSelectorProps} mapId={map.mapId} />
      </StrictMode>
    );
  }

  // Subscribe to state changes and re-render when state updates
  layerSelectData.subscribe(() => {
    render();
  });

  // Initial render
  render();
}

/* When changing maps, gracefully destroy the React root container. */
export function destroySidepanel() {
  if (sidepanelRoot !== null) {
    sidepanelRoot.unmount();
    sidepanelRoot = null;
  }
}
