using System;
using System.Data;
using System.Data.Common;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Objects.Core.i18N;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
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

        private static readonly string _gameClassesFile = "../../../../gameClasses.json";
        private static readonly string _bpJsonBase = "../../../../blueprints";
        private const string _aesKey = "0x0000000000000000000000000000000000000000000000000000000000000000";
        public static void Main()
        {
            Log.Logger = new LoggerConfiguration().WriteTo.Console(theme: AnsiConsoleTheme.Literate).CreateLogger();

            // Deserialize gameClasses.json
            var gameClasses = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, string>>>(File.ReadAllText(_gameClassesFile)); 

            foreach(var game in _gameDirectories.Keys) {
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
                    if(key.EndsWith(".uasset") && !key.Contains("Meshes") && !key.Contains("Sounds")
                        && !key.Contains("Materials") && !key.Contains("Effects"))
                    {
                        var slashIdx = key.LastIndexOf('/');
                        var bpFile = key.Substring(slashIdx + 1, key.Length - 8 - slashIdx) + "_C";
                        if(gameClasses.ContainsKey(bpFile))
                        {
                            if(blueprints.ContainsKey(bpFile))
                            {
                                Console.WriteLine($"Found multiple .uasset for {bpFile} First: {blueprints[bpFile]} New: {key}");
                            }
                            else
                            {
                                blueprints[bpFile] = key;
                                if(!gameClasses[bpFile].ContainsKey("found"))
                                    gameClasses[bpFile]["found"] = "yes";
                            }
                        }
                    }
                }

                var blueprintFiles = new Dictionary<string, IEnumerable<UObject>>();
                foreach(var cls in blueprints.Keys)
                {
                    blueprintFiles[cls] = provider.LoadAllObjects(blueprints[cls]);
                }
                var fullJson = JsonConvert.SerializeObject(blueprintFiles, Formatting.Indented);
                File.WriteAllText(_bpJsonBase + '.' + game + ".json", fullJson);
            }
            foreach(var key in gameClasses.Keys)
            {
                if(!gameClasses[key].ContainsKey("found"))
                {
                    Console.WriteLine($"Class {key} not found");
                }
            }

/*            }

            // these 2 lines will load all exports the asset has and transform them in a single Json string
            var allExports = provider.LoadAllObjects(_objectPath);
            var fullJson = JsonConvert.SerializeObject(allExports, Formatting.Indented);
            Console.WriteLine(fullJson);
            foreach(var e in allExports)
            {
                if(e.ExportType == "BP_Purchase_FasterPickaxe_C")
                {
                    Console.WriteLine(e.Name);
                    foreach(var p in e.Properties)
                    {
                        var json = JsonConvert.SerializeObject(p, Formatting.Indented);
                        var jo = JsonConvert.DeserializeObject(json);                        
                        foreach(var prop in p.Tag.GetValue<FText>().TextHistory.GetType().GetProperties()) {
                            Console.WriteLine("{0}={1}", prop.Name, prop.GetValue(p.Tag.GetValue<FText>().TextHistory, null));

                        }
                    }
                }
            }
*/
/*
            // each exports have a name, these 2 lines will load only one export the asset has
            // you must use "LoadObject" and provide the full path followed by a dot followed by the export name
            var variantExport = provider.LoadObject(_objectPath + "." + _objectName);
            var variantJson = JsonConvert.SerializeObject(variantExport, Formatting.Indented);

            Console.WriteLine(variantJson); // Outputs the variantJson.
*/
        }
    }
}