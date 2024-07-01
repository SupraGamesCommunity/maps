using System;
using System.Data;
using System.Data.Common;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Objects.Core.i18N;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
using CUE4Parse.UE4.Localization;
using Newtonsoft.Json;
using Serilog;
using Serilog.Sinks.SystemConsole.Themes;

namespace BPReader
{
    public static class Program
    {
        private static readonly Dictionary<string, string> _gameDirectories = new Dictionary<string, string> {
            {"sl",  @"C:/Program Files (x86)/Steam/steamapps/common/Supraland/Supraland/Content/Paks/" },
            {"siu", @"C:/Program Files (x86)/Steam/steamapps/common/Supraland Six Inches Under/SupralandSIU/Content/Paks/"}
        };
        private const string _locFilesDir = "Content/Localization/Game/"; 

        private const string _aesKey = "0x0000000000000000000000000000000000000000000000000000000000000000";
        public static void Main()
        {
            var cacheDir = Environment.GetEnvironmentVariable("TMP");
            if(cacheDir == null){
                Console.Write("Unable to read environment varible %TMP%");
                Environment.Exit(1);
            }
            cacheDir = cacheDir.Replace("\\", "/");

            Log.Logger = new LoggerConfiguration().WriteTo.Console(theme: AnsiConsoleTheme.Literate).CreateLogger();

            foreach(var game in _gameDirectories.Keys) {
                var count = 0;
                var gameDir = _gameDirectories[game];
                var provider = new DefaultFileProvider(gameDir, SearchOption.AllDirectories, false, new VersionContainer(EGame.GAME_UE4_27));

                // Scan local files and read them to know what it has to deal with (PAK/UTOC/UCAS/UASSET/UMAP)
                provider.Initialize();

                // Decrypt basic info (1 guid - 1 key) - Supraland is not encrypted
                provider.SubmitKey(new FGuid(), new FAesKey(_aesKey)); 

                provider.LoadLocalization(ELanguage.English);

                var blueprints = new Dictionary<string, string>();
                foreach(var key in provider.Files.Keys)
                {
                    if(key.Contains(_locFilesDir))
                    {
                        var outPath = cacheDir+$"/LOC/{game}" + key[(key.IndexOf(_locFilesDir)+_locFilesDir.Length-1)..(key.LastIndexOf('/')+1)];
                        new FileInfo(outPath).Directory.Create();
                        var file = provider.Files[key];
                        file.TryCreateReader(out var archive);

                        if(key.EndsWith(".locres"))
                        {
                            var locres = new FTextLocalizationResource(archive);
                            var locJson = JsonConvert.SerializeObject(locres, Formatting.Indented);
                            File.WriteAllText(outPath + "Game.json", locJson);
                            count++;
                        }
                        else if(key.EndsWith(".locmeta"))
                        {
                            var locmeta = new FTextLocalizationMetaDataResource(archive);
                            var locJson = JsonConvert.SerializeObject(locmeta, Formatting.Indented);
                            File.WriteAllText(outPath + "Game.json", locJson);
                        }
                    }
                }
                Console.WriteLine($"Exported {count} loc files for {game.ToUpper()} to {cacheDir+$"/LOC/"+game}");
            }
        }
    }
}