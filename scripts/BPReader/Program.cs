﻿using System;
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
        private const string _aesKey = "0x0000000000000000000000000000000000000000000000000000000000000000";
        public static void Main()
        {
            var cacheDir = Environment.GetEnvironmentVariable("TMP");
            if(cacheDir == null){
                Console.Write("Unable to read environment varible %TMP%");
                Environment.Exit(1);
            }
            cacheDir = cacheDir.Replace("\\", "/");
            var bpJsonBase = cacheDir + "/blueprints";
    
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
                File.WriteAllText(bpJsonBase + '.' + game + ".json", fullJson);
            }
            foreach(var key in gameClasses.Keys)
            {
                if(!gameClasses[key].ContainsKey("found"))
                {
                    Console.WriteLine($"Class {key} not found");
                }
            }
        }
    }
}