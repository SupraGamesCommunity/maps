import { Settings } from '../settings.js';
import { browser } from '../utils.js';
import { SaveFileSystem } from '../saveFileSystem.js';

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
            <i className="fa-regular fa-copy"></i>
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
            <i className="fa-solid fa-border-none"></i>
            {' Unmark found'}
          </button>
          {' Unmark all found items.'}
        </p>
      </div>
    </div>
  );
};
