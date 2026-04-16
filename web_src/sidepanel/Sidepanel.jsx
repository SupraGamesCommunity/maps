export function Sidepanel() {
  return (
    <>
      <nav class="sidepanel-tabs-wrapper" aria-label="sidepanel tab navigation">
        <ul class="sidepanel-tabs">
          <li class="sidepanel-tab">
            <a href="#" class="sidebar-tab-link" role="tab" data-tab-link="tab-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
                <path fill-rule="evenodd" />
              </svg>
              Maps &amp; layers
            </a>
          </li>
          <li class="sidepanel-tab">
            <a href="#" class="sidebar-tab-link" role="tab" data-tab-link="tab-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
                <path fill-rule="evenodd" />
              </svg>
              Maps &amp; layers
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidepanel-content-wrapper">
        <div class="sidepanel-content">
          <div
            class="sidepanel-tab-content leaflet-control-layers leaflet-control-layers-expanded leaflet-control"
            data-tab-content="tab-1"
            id="sidepanel-content-layer-select"
          ></div>
          <div class="sidepanel-tab-content" data-tab-content="tab-2">
            <p>Content 2.</p>
          </div>
        </div>
      </div>
    </>
  );
}
