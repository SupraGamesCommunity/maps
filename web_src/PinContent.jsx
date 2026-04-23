import { locStr } from './locStr.js';
import { GameClasses } from './gameClasses.js';
import { useState } from 'react';
import { updateBuildModeValue } from './devBuildMode.js';
import { commitCurrentBuildModeChanges } from './devBuildMode.js';

const StaticRow = ({ title, value }) => {
  return (
    <>
      <br />
      <span className="marker-popup-col">{title}</span>
      <span className="marker-popup-col2">{value}</span>
    </>
  );
};

const PropertyRow = ({ title, value }) => {
  let jsonStr = JSON.stringify(value, null, ' ').replaceAll('"', '').replaceAll('\n', '');
  return (
    <>
      <span className="marker-popup-debug-col">{title}</span>
      <span className="marker-popup-debug-col2">{jsonStr}</span>
      <br />
    </>
  );
};

const JsonProperties = ({ o }) => {
  return (
    <>
      <div className="marker-popup-debug">
        <br />
        <details>
          <summary>
            <b>Full JSON (dev)</b>
          </summary>
          {Object.entries(o).map(([object_key, value], idx) => {
            return <PropertyRow title={object_key} value={value} key={idx} />;
          })}
        </details>
      </div>
    </>
  );
};

const EditRow = ({ title, value }) => {
  const [textInputValue, setTextInputValue] = useState(value);

  return (
    <>
      <span className="marker-popup-edit-col">{title}</span>
      <span className="marker-popup-edit-col2">
        <input
          type="text"
          id={title}
          onChange={(e) => {
            setTextInputValue(e.target.value);
            updateBuildModeValue(e);
          }}
          value={textInputValue}
        />
      </span>
      <br />
    </>
  );
};

const BuildForm = ({ o, closePopup }) => {
  const saveHandler = () => {
    commitCurrentBuildModeChanges();
    closePopup();
  };

  return (
    <>
      <hr />
      <div className="marker-popup-edit">
        <details>
          <summary>
            <b>Edit JSON (dev)</b>
          </summary>
          {Object.getOwnPropertyNames(o)
            .filter((propName) => propName != 'name' && propName != 'area')
            .map((propName, idx) => {
              let value = typeof o[propName] === 'string' ? o[propName] : JSON.stringify(o[propName]);
              return <EditRow title={propName} value={value} key={idx} />;
            })}
          {!('yt_video' in o) && <EditRow title="yt_video" value="" key={'yt_video'} />}
          {!('yt_start' in o) && <EditRow title="yt_start" value="" key={'yt_start'} />}
          <button onClick={() => saveHandler()}>Save</button>
        </details>
      </div>
    </>
  );
};

export const PinContent = ({ o, mapId, closePopup, hasFoundState, isFound, foundAlt, buildMode }) => {
  let ytSrc = null;

  const [isFoundCheckbox, setIsFoundCheckbox] = useState(isFound);

  if (o.yt_video) {
    ytSrc = 'https://www.youtube-nocookie.com/embed/' + o.yt_video + '?controls=0';

    function hmsToSecs(str) {
      var p = str.split(':'),
        s = 0,
        m = 1;
      while (p.length > 0) {
        s += m * Number(p.pop());
        m *= 60;
      }
      return s;
    }

    if (o.yt_start) {
      ytSrc += '&start=' + hmsToSecs(o.yt_start);
    }
    if (o.yt_end) {
      ytSrc += '&end=' + hmsToSecs(o.yt_end);
    }
  }

  return (
    <>
      <div className="marker-popup-heading">
        {locStr.friendly(o, o.type, mapId)}
        {o?.hidden == 'true' ? ' (hidden)' : ''}
      </div>
      <div className="marker-popup-text">
        {o.spawns && <StaticRow title="Contains" value={locStr.friendly(null, o.spawns, mapId)} />}
        {o.coins && <StaticRow title="Coins" value={`${o.coins} coin${o.coins > 1 ? 's' : ''}`} />}
        {o.scrapamount && <StaticRow title="Amount" value={`${o.scrapamount} coin${o.scrapamount > 1 ? 's' : ''}`} />}
        {o.cost && <StaticRow title="Price" value={locStr.cost(o.price_type, o.cost)} />}
        {o.area_tag && <StaticRow title="Area" value={o.area_tag} />}
        {o.prog_tag && <StaticRow title="Act" value={o.prog_tag} />}
        {o.abilities && <StaticRow title="Requires" value={o.abilities} />}
        {o.loop && <StaticRow title="Loop" value={o.loop} />}
        {o.variant && <StaticRow title="Variant" value={o.variant} />}
        {(o.description || GameClasses.get(o.type).description) && (
          <StaticRow title="Description" value={locStr.description(o, o.type, mapId)} />
        )}
        {o.comment && <StaticRow title="Comment" value={o.comment} />}
        {o.spoiler_help && (
          <StaticRow
            title="Spoiler help"
            value={
              <details>
                <summary>{'Click to show/hide'}</summary>
                <span>{o.spoiler_help}</span>
              </details>
            }
          />
        )}
        <StaticRow title="XYZ pos" value={`(${o.lng.toFixed(0)}, ${o.lat.toFixed(0)}, ${o.alt.toFixed(0)})`} />
        <br />
        <br />
      </div>
      {ytSrc && (
        <iframe
          width="300"
          height="169"
          src={ytSrc}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      )}
      <div className="marker-popup-found">
        {hasFoundState ? (
          <>
            <input
              type="checkbox"
              id={foundAlt}
              checked={isFoundCheckbox}
              onChange={() => {
                setIsFoundCheckbox(!isFoundCheckbox);
                window.mapObjectFound(foundAlt, isFoundCheckbox);
              }}
            />
            <label htmlFor={foundAlt}>{'Found'}</label>
          </>
        ) : (
          <>&nbsp;</>
        )}
      </div>
      {buildMode && <JsonProperties o={o} />}
      {buildMode && <BuildForm o={o} closePopup={closePopup} />}
    </>
  );
};
