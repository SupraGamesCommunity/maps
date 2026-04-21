import { Checkbox } from './Checkbox.jsx';
import { browser } from '../utils.js';
import { MapParam } from '../mapParam.js';
import { Settings } from '../settings.js';
import { SaveFileSystem } from '../saveFileSystem.js';

/* The Radio buttons that let the user select the game map (SupraLand, SupraWorld, etc) */
export const MapSelectorRadioButtons = ({ options, onChange }) => {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} style={{ display: 'block', margin: '5px 0' }}>
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
  const loadFileHandler = () => {
    if (
      Object.keys(Settings.map.saveData).length == 0 ||
      browser.isCode ||
      confirm('Are you sure you want to overwrite existing items marked found?')
    ) {
      SaveFileSystem.loadFileDialog(leafletMap.mapId);
    }
  };

  const copySaveFilePathHandler = () => {
    const savedPaths = {
      sl: '%LocalAppData%\\Supraland\\Saved\\SaveGames',
      slc: '%LocalAppData%\\Supraland\\Saved\\SaveGames',
      siu: '%LocalAppData%\\SupralandSIU\\Saved\\SaveGames',
      sw: '%LocalAppData%\\Supraworld\\Saved\\SaveGames\\Supraworld',
    };
    browser.copyTextToClipboard(savedPaths[leafletMap.mapId]);
  };

  const unmarkAllHandler = () => {
    if (browser.isCode || confirm('Are you sure to unmark all found items?')) {
      SaveFileSystem.ClearAll();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '3em' }}>
        <h2>Map selector</h2>
        <MapSelectorRadioButtons
          options={mapSelections.options}
          selectedValue={mapSelections.selectedValue}
          onChange={onMapChange}
        />
      </div>

      <div style={{ marginBottom: '3em' }}>
        <h2>Layers</h2>
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

      <div style={{ marginBottom: '3em' }}>
        <h2>Map URL</h2>
        <p>
          <button
            onClick={() => {
              browser.copyTextToClipboard(MapParam.getViewURL(leafletMap));
            }}
          >
            <i className="fa-solid fa-link"></i>
            {' Copy'}
          </button>
          {' Copy map URL to the clipboard'}
        </p>
      </div>

      <div style={{ marginBottom: '3em' }}>
        <h2>Game save-files</h2>
        <p>
          <button
            onClick={() => {
              loadFileHandler();
            }}
          >
            <i className="fa-regular fa-folder-open"></i>
            {' Load'}
          </button>
          {' Load a game save (*.sav) to mark collected items (Alt+R)'}
        </p>
        <p>
          <button
            onClick={() => {
              copySaveFilePathHandler();
            }}
          >
            <i className="fa-regular fa-folder-open"></i>
            {' Copy path'}
          </button>
          {' Copy the default Windows game save-file path to the clipboard.'}
        </p>
        <p>
          <button
            onClick={() => {
              unmarkAllHandler();
            }}
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            {' Unmark found'}
          </button>
          {' Unmark all found items.'}
        </p>
      </div>
    </div>
  );
};
