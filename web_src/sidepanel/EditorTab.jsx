import { useState } from 'react';
import { Settings } from '../settings.js';
import { Checkbox } from './Checkbox.jsx';
import { setBuildMode, exportBuildChanges } from '../devBuildMode.js';

export const EditorTab = () => {
  // const [isDevModeEnabled, setIsDevMode] = useState(Settings.global.devMode);
  const [isBuildModeEnabled, setIsBuildMode] = useState(Settings.global.buildMode);

  return (
    <>
      <div className="sidepanel-info-block">
        <h2>Build tools</h2>
        <Checkbox
          label="Build Mode"
          value="1"
          checked={isBuildModeEnabled}
          onChange={() => {
            setIsBuildMode(!isBuildModeEnabled);
            setBuildMode(!isBuildModeEnabled);
          }}
        />
        <p>Build Mode enables editing pin data, which can be later exported and contributed back to the project.</p>
      </div>

      <div className="sidepanel-info-block">
        <button onClick={() => exportBuildChanges()}>
          <i className="fa-regular fa-copy"></i>Copy changes
        </button>
        <p>{'Copies changes made in this session to the Clipboard.'}</p>
      </div>
    </>
  );
};
