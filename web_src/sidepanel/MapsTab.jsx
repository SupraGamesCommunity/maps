import { Checkbox } from './Checkbox.jsx';
import { browser } from '../utils.js';
import { MapParam } from '../mapParam.js';

/* The Radio buttons that let the user select the game map (SupraLand, SupraWorld, etc) */
export const MapSelectorRadioButtons = ({ options, onChange }) => {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={'select_map'}
            value={option.value}
            checked={option.isSelected}
            onChange={(e) => onChange(e.target.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
};

/* Renders the map / layer selection UI: letting the user pick a game map, and the layers within it. */
export const MapsTab = ({ leafletMap, mapSelections, overlaySelections, onMapChange, onOverlayChange }) => {
  return (
    <div>
      <div className="sidepanel-info-block">
        <h2>Game map</h2>
        <MapSelectorRadioButtons
          options={mapSelections.options}
          selectedValue={mapSelections.selectedValue}
          onChange={onMapChange}
        />
      </div>

      <div className="sidepanel-info-block">
        <h2>Layers</h2>
        <div className="checkbox-group">
          {overlaySelections.map((overlaySelection) => (
            <Checkbox
              key={overlaySelection.value}
              label={overlaySelection.label}
              value={overlaySelection.value}
              checked={overlaySelection.isChecked}
              onChange={onOverlayChange}
            />
          ))}
        </div>
      </div>

      <div className="sidepanel-info-block">
        <h2>Map URL</h2>
        <p>
          <button
            onClick={() => {
              browser.copyTextToClipboard(MapParam.getViewURL(leafletMap));
            }}
          >
            <i className="fa-regular fa-copy"></i>
            {' Copy'}
          </button>
          {' Copy map URL to the clipboard'}
        </p>
      </div>
    </div>
  );
};
