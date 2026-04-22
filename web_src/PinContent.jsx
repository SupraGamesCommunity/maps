import { locStr } from './locStr.js';
import { GameClasses } from './gameClasses.js';
import { useState } from 'react';

const StaticRow = ({ title, value }) => {
  return (
    <>
      <br />
      <span className="marker-popup-col">{title}</span>
      <span className="marker-popup-col2">{value}</span>
    </>
  );
};

const EditRow = ({ title, value, updateBuildModeValue }) => {
  return (
    <>
      <span className="marker-popup-edit-col">{title}</span>
      <span className="marker-popup-edit-col2">
        <input type="text" id={title} onChange={(e) => updateBuildModeValue(e)} value={value} />
      </span>
      <br />
    </>
  );
};

export const PinContent = ({ o, mapId, hasFoundState, isFound, foundAlt }) => {
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
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
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
    </>
  );
};
