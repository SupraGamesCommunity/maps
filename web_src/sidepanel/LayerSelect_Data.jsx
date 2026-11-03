import { MapLayer } from '../mapLayer.js';
import { MapVersion } from '../mapVersion.js';

export class LayerSelect_Data {
  constructor(map) {
    this.map = map;
    this.uiLayers = [];
    this.lastZIndex = 0;
    this.listeners = new Set();

    MapLayer.forEachEnabled(map.mapId, (layerId, mapLayer) => {
      if (mapLayer.type == 'base') {
        this._addLayer(layerId, mapLayer, false);
      } else if (mapLayer.type == 'markers') {
        this._addLayer(layerId, mapLayer, true);
      }
    });
  }

  _addLayer(layerId, mapLayer, isOverlay) {
    let leafletLayer = mapLayer.layerObj;

    let zIndex = this.lastZIndex++;
    if (leafletLayer.layer && leafletLayer.layer.setZIndex) {
      leafletLayer.layer.setZIndex(zIndex);
    }

    this.uiLayers.push({
      layerId: layerId,
      mapLayer: mapLayer,
      leafletLayer: leafletLayer,
      isOverlay: isOverlay,
    });
  }

  getVersion() {
    return MapVersion.getBuild(this.map.mapId);
  }

  getMapSelectorProps() {
    return {
      options: this.uiLayers
        .filter((uiLayer) => !uiLayer.isOverlay)
        .map((uiLayer) => {
          return {
            label: uiLayer.mapLayer.name,
            value: uiLayer.layerId,
            isSelected: uiLayer.mapLayer.active,
          };
        }),
    };
  }

  getOverlayLayerProps() {
    return this.uiLayers
      .filter((uiLayer) => uiLayer.isOverlay)
      .map((uiLayer) => {
        return {
          label: uiLayer.mapLayer.name,
          value: uiLayer.layerId,
          isChecked: this.map.hasLayer(uiLayer.mapLayer.layerObj),
        };
      });
  }

  onOverlayChangeHandler(layerId, isChecked) {
    // console.log(`Overlay change "${layerId}" changed to: ${isChecked}`);

    const uiLayer = this.getUiLayerByLayerId(layerId);
    if (isChecked) {
      this.map.addLayer(uiLayer.leafletLayer);
    } else {
      this.map.removeLayer(uiLayer.leafletLayer);
    }
  }

  getUiLayerByLayerId(layerId) {
    for (var i = 0; i < this.uiLayers.length; i++) {
      if (this.uiLayers[i].layerId === layerId) {
        return this.uiLayers[i];
      }
    }
  }

  onMapChangeHandler(radioButtonValue) {
    // console.log(`Map change: changed to: ${radioButtonValue}`);
    const uiLayer = this.getUiLayerByLayerId(radioButtonValue);
    this.map.fire('baselayerchange', uiLayer.leafletLayer);
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.map.on('maplayeradd maplayerremove', listener);
  }
}
