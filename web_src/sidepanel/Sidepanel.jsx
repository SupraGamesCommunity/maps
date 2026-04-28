import { MapsTab } from './MapsTab.jsx';
import { GameSaveTab } from './GameSaveTab.jsx';
import { useState } from 'react';
import classnames from 'classnames';
import { AboutTab } from './AboutTab.jsx';
import { Settings } from '../settings.js';
import { EditorTab } from './EditorTab.jsx';
import { setLeafletMapPushCss } from './setLeafletMapPushCss.jsx';

/* The HTML component that renders the entire Sidepanel (including navigation tabs and content) */
export const Sidepanel = ({ layerSelectorProps, mapId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { id: 'map_select', icon: 'fa-regular fa-map', title: 'Maps', content: <MapsTab {...layerSelectorProps} /> },
    { id: 'game_save', icon: 'fa-regular fa-folder-open', title: 'Game saves', content: <GameSaveTab mapId={mapId} /> },
    { id: 'build_tools', icon: 'fa-solid fa-gears', title: 'Build tools', content: <EditorTab /> },
    { id: 'about', icon: 'fa-solid fa-circle-info', title: 'About', content: <AboutTab /> },
  ];

  return (
    <div className={classnames('sidebar', { collapsed: !isOpen })}>
      <div className="nav-tabs">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={classnames('nav-tab', { active: idx == currentTab })}
            onClick={() => {
              setCurrentTab(idx);
            }}
          >
            <div>
              <i className={tab.icon}></i>
            </div>
            <div>{tab.title}</div>
          </button>
        ))}
      </div>

      <div className="content-panel">
        {tabs.map((tab, idx) => (
          <div key={idx} className={classnames('content-section', { active: currentTab === idx })}>{tab.content}</div>
        ))}
      </div>

      {/* The button that show/hides the sidebar */}
      <button
        className="toggle-btn"
        id="toggleBtn"
        onClick={() => {
          setIsOpen(!isOpen);
          setLeafletMapPushCss(!isOpen);
        }}
        aria-label="toggle side panel"
      >
        {isOpen ? '◀' : '▶'}
      </button>
    </div>
  );
};
