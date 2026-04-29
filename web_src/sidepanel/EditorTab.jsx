import { useState } from 'react';
import { Settings } from '../settings.js';
import { Checkbox } from './Checkbox.jsx';
import { setBuildMode, exportBuildChanges } from '../devBuildMode.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas, far); // Import all FontAwesome icons

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
          <FontAwesomeIcon icon="fa-regular fa-copy" />
          Copy changes
        </button>
        <p>{'Copies changes made in this session to the Clipboard.'}</p>
      </div>
    </>
  );
};
