/* global L */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Sidepanel } from './Sidepanel.jsx';
import { LayerSelect_Data } from './LayerSelect_Data.jsx';

let root = null;

/* Initializes the DOM to support the sidepanel. */
export function initSidepanelDom() {
  const sidepanelContainer = document.getElementById('sidepanel');
  // sidepanelContainer.replaceChildren(); // Clear all child elements

  // Adds stopPropagation to the element's 'wheel' events (plus browser variants).
  L.DomEvent.disableScrollPropagation(sidepanelContainer);
  // Adds stopPropagation to the element's 'click', 'dblclick', 'contextmenu', 'mousedown'
  // and 'touchstart' events (plus browser variants).
  L.DomEvent.disableClickPropagation(sidepanelContainer);

  root = createRoot(sidepanelContainer);
}

/*
 * Initializes the sidepanel, with a specific MapLayer map.
 * This is called whenever the user switches the game map (e.g. SupraLand, SupraWorld, etc)
 */
export function initSidepanel(map) {
  let layerSelectData = new LayerSelect_Data(map);

  function render() {
    const layerSelectorProps = {
      mapSelections: layerSelectData.getMapSelectorProps(),
      overlaySelections: layerSelectData.getOverlayLayerProps(),
      onMapChange: (name, value) => layerSelectData.onMapChangeHandler(name, value),
      onOverlayChange: (value, isChecked) => layerSelectData.onOverlayChangeHandler(value, isChecked),
    };
    root.render(
      <StrictMode>
        <Sidepanel layerSelectorProps={layerSelectorProps} />
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
