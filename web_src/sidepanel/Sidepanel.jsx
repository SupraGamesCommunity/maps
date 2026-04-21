import { MapsTab } from './MapsTab.jsx';
import { useState } from 'react';
import classnames from 'classnames';
import { AboutTab } from './AboutTab.jsx';
import { Settings } from '../settings.js';
import { DevBuildSettingsTab } from './DevBuildSettings.jsx';
import { setLeafletMapPushCss } from './initSidepanel.jsx';

/* The HTML component that renders the entire Sidepanel (including navigation tabs and content) */
export const Sidepanel = (props) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { id: 'map_select', icon: 'fa-regular fa-map', title: 'Maps' },
    { id: 'settings', icon: 'fa-solid fa-gears', title: 'Settings' },
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
                  <i className={tab.icon} width="24" height="24"></i>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* The content sections */}
        <div className="sidepanel-content-wrapper">
          <div className="sidepanel-content">
            <div className={classnames('sidepanel-tab-content', { active: currentTab === 0 })} datatabcontent="tab-0">
              <MapsTab {...props.layerSelectorProps} />
            </div>

            <div className={classnames('sidepanel-tab-content', { active: currentTab === 1 })} datatabcontent="tab-1">
              <DevBuildSettingsTab />
            </div>

            <div className={classnames('sidepanel-tab-content', { active: currentTab === 2 })} datatabcontent="tab-2">
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
