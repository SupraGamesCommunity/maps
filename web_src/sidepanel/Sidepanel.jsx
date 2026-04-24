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
    { id: 'map_select', icon: 'fa-regular fa-map', title: 'Maps' },
    { id: 'game_save', icon: 'fa-regular fa-folder-open', title: 'Game saves' },
    { id: 'build_tools', icon: 'fa-solid fa-gears', title: 'Build tools' },
    { id: 'about', icon: 'fa-solid fa-circle-info', title: 'About' },
  ];

  return (
    <div
      className={classnames('sidepanel', 'sidepanel-left', 'tabs-left', { opened: isOpen, closed: !isOpen })}
      aria-label="side panel"
      aria-hidden="false"
    >
      <div className="sidepanel-inner-wrapper">
        {/* The side tab selector */}
        <nav className="sidepanel-tabs-wrapper" aria-label="sidepanel tab navigation">
          <ul className="sidepanel-tabs">
            {tabs.map((tab, idx) => (
              <li key={idx} className="sidepanel-tab">
                <a
                  href="#"
                  className={classnames('sidebar-tab-link', { active: idx == currentTab })}
                  role="tab"
                  title={tab.title}
                  datatablink={`tab-${idx}`}
                  onClick={() => {
                    setCurrentTab(idx);
                  }}
                >
                  <div>
                    <i className={tab.icon} width="24" height="24"></i>
                  </div>
                  <div>{tab.title}</div>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* The content sections */}
        <div className="sidepanel-content-wrapper">
          <div className="sidepanel-content">
            <div className={classnames('sidepanel-tab-content', { active: currentTab === 0 })} datatabcontent="tab-0">
              <MapsTab {...layerSelectorProps} />
            </div>

            <div className={classnames('sidepanel-tab-content', { active: currentTab === 1 })} datatabcontent="tab-1">
              <GameSaveTab mapId={mapId} />
            </div>

            <div className={classnames('sidepanel-tab-content', { active: currentTab === 2 })} datatabcontent="tab-2">
              <EditorTab />
            </div>

            <div className={classnames('sidepanel-tab-content', { active: currentTab === 3 })} datatabcontent="tab-3">
              <AboutTab />
            </div>
          </div>
        </div>

        {/* The button that show/hides the sidebar */}
        <div className="sidepanel-toggle-container">
          <button
            className="sidepanel-toggle-button"
            aria-label="toggle side panel"
            onClick={() => {
              setIsOpen(!isOpen);
              setLeafletMapPushCss(!isOpen);
            }}
          ></button>
        </div>
      </div>
    </div>
  );
};
