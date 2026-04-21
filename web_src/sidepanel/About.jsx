/* HTML component that displays the contents of the "About" tab in the sidebar. */
export const About = () => {
  return (
    <>
      <h2>About</h2>
      <p>
        {"Maps for the games made by "}
        <a href="https://store.steampowered.com/developer/SupraGames/" target="_blank" rel="noopener">
          Supra Games UG
        </a>{", including:"}
      </p>
      <ul>
        <li>
          <a href="https://store.steampowered.com/app/813630/Supraland/" target="_blank" rel="noopener">
            Supraland
          </a>
        </li>
        <li>
          <a href="https://store.steampowered.com/app/1093730/Supraland_Crash/" target="_blank" rel="noopener">
            Supraland: Crash
          </a>
        </li>
        <li>
          <a
            href="https://store.steampowered.com/app/1522870/Supraland_Six_Inches_Under/"
            target="_blank"
            rel="noopener"
          >
            Supraland: Six Inches Under
          </a>
        </li>
        <li>
          <a href="https://store.steampowered.com/app/1869290/Supraworld/" target="_blank" rel="noopener">
            Supraworld
          </a>
        </li>
      </ul>


      <h2>Discord</h2>
      <p>Need more help or just want to chat with Supraland fans and developers?</p>
      <p>Join the official <a href="https://discord.gg/DhWbSbfMqx" target="_blank" rel="noopener">Supraland Discord</a>.</p>


      <h2>Credits</h2>
      <p>
        <a href="https://github.com/SupraGamesCommunity/maps#credits-1">Refer to the README</a>
      </p>


      <h2>GitHub</h2>
      <p>
        <a href="https://github.com/SupraGamesCommunity/maps">{'https://github.com/SupraGamesCommunity/maps'}</a>
      </p>
    </>
  );
};
