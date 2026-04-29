import { Settings } from '../settings.js';
import { browser } from '../utils.js';
import { SaveFileSystem } from '../saveFileSystem.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas, far); // Import all FontAwesome icons

/* Renders the Game Saves tab UI */
export const GameSaveTab = ({ mapId }) => {
  const loadFileHandler = () => {
    if (
      Object.keys(Settings.map.saveData).length == 0 ||
      browser.isCode ||
      confirm('Are you sure you want to overwrite existing items marked found?')
    ) {
      SaveFileSystem.loadFileDialog(mapId);
    }
  };

  const copySaveFilePathHandler = () => {
    const savedPaths = {
      sl: '%LocalAppData%\\Supraland\\Saved\\SaveGames',
      slc: '%LocalAppData%\\Supraland\\Saved\\SaveGames',
      siu: '%LocalAppData%\\SupralandSIU\\Saved\\SaveGames',
      sw: '%LocalAppData%\\Supraworld\\Saved\\SaveGames\\Supraworld',
    };
    browser.copyTextToClipboard(savedPaths[mapId]);
  };

  const unmarkAllHandler = () => {
    if (browser.isCode || confirm('Are you sure to unmark all found items?')) {
      SaveFileSystem.ClearAll();
    }
  };

  return (
    <div>
      <div className="sidepanel-info-block">
        <h2>Game save-files</h2>
        <p>
          <button
            onClick={() => {
              loadFileHandler();
            }}
          >
            <FontAwesomeIcon icon="fa-regular fa-folder-open" />
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
            <FontAwesomeIcon icon="fa-regular fa-copy" />
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
            <FontAwesomeIcon icon="fa-solid fa-border-none" />
            {' Unmark found'}
          </button>
          {' Unmark all found items.'}
        </p>
      </div>
    </div>
  );
};
