import { StrictMode } from 'react';
import { Sidepanel } from './Sidepanel.jsx';
import { LayerSelect_Data } from './LayerSelect_Data.jsx';
import { sidepanelRoot, setLeafletMapPushCss } from './initSidepanel.jsx';

/*
 * Initializes the sidepanel, with a specific MapLayer map.
 * This is called whenever the user switches the game map (e.g. SupraLand, SupraWorld, etc)
 */
export function renderSidepanel(map) {
  let layerSelectData = new LayerSelect_Data(map);

  setLeafletMapPushCss(true);

  function render() {
    const layerSelectorProps = {
      mapSelections: layerSelectData.getMapSelectorProps(),
      overlaySelections: layerSelectData.getOverlayLayerProps(),
      onMapChange: (name, value) => layerSelectData.onMapChangeHandler(name, value),
      onOverlayChange: (value, isChecked) => layerSelectData.onOverlayChangeHandler(value, isChecked),
    };
    sidepanelRoot.render(
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
