import { LayerSelector } from './LayerSelectComponents.jsx';
import { useState } from 'react';
import classnames from 'classnames';

/* The HTML component that renders the entire Sidepanel (including navigation tabs and content) */
export const Sidepanel = props => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
      { id: "map_select", title: "Maps" },
      { id: "settings", title: "Settings" },
  ];

  return (
    <div className={classnames("sidepanel", "sidepanel-left", "tabs-left", {opened: isOpen, closed: !isOpen})} aria-label="side panel" aria-hidden="false">
      <div className="sidepanel-inner-wrapper">

        {/* The side tab selector */}
        <nav className="sidepanel-tabs-wrapper" aria-label="sidepanel tab navigation">
          <ul className="sidepanel-tabs">
            {tabs.map( (tab, idx) => (
              <li key={idx} className="sidepanel-tab">
                <a href="#"
                    className={classnames("sidebar-tab-link", {active: idx == currentTab})}
                    role="tab"
                    datatablink={`tab-${idx}`}
                    onClick={() => {
                      setCurrentTab(idx);
                    }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
                    <path fillRule="evenodd" />
                  </svg>
                  {tab.title}
                </a>
              </li>
            ))}
        </ul>
      </nav>

      {/* The content sections */}
      <div className="sidepanel-content-wrapper">
        <div className="sidepanel-content">

          <div className={classnames("sidepanel-tab-content", {active: currentTab === 0})} datatabcontent="tab-0">
            <LayerSelector {...props.layerSelectorProps} />
          </div>

          <div className={classnames("sidepanel-tab-content", {active: currentTab === 1})} datatabcontent="tab-1">
            <p>Settings page.</p>
          </div>
        </div>
      </div>

      {/* The button that show/hides the sidebar */}
      <div className="sidepanel-toggle-container">
        <button className="sidepanel-toggle-button" aria-label="toggle side panel"
          onClick={() => {
            setIsOpen(!isOpen)
          }}
        ></button>
      </div>

    </div>
  </div>
  );
}
