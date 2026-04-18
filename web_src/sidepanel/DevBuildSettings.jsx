import { useState } from 'react';
import { Settings } from '../settings.js';
import { Checkbox } from './Checkbox.jsx';
import { toggleDevMode, toggleBuildMode, exportBuildChanges } from '../devBuildMode.js';

export const DevBuildSettingsTab = () => {
  const [isDevModeEnabled, setIsDevMode] = useState(Settings.global.devMode);
  const [isBuildModeEnabled, setIsBuildMode] = useState(Settings.global.buildMode);

  return (
    <>
      <h2>Developer settings</h2>

      <div>
        <Checkbox
          label="Developer Mode"
          value="1"
          checked={isDevModeEnabled}
          onChange={() => {
            setIsDevMode(!isDevModeEnabled);
            toggleDevMode();
          }}
        />
        <p>
          Toggles Developer mode. (Currently: <span>{isDevModeEnabled ? 'On' : 'Off'}</span>)
        </p>
      </div>

      <div>
        <Checkbox
          label="Build Mode"
          value="1"
          checked={isBuildModeEnabled}
          onChange={() => {
            setIsBuildMode(!isBuildModeEnabled);
            toggleBuildMode();
          }}
        />
        <p>
          Toggles Build mode. (Currently: <span>{isBuildModeEnabled ? 'On' : 'Off'}</span>)
        </p>
      </div>

      <div>
        <button onClick={() => exportBuildChanges()}>Copy changes</button>
        <p>{'Copies changes made in this session to the Clipboard.'}</p>
      </div>
    </>
  );
};
