using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Jellyfin.Plugin.DinkFlix.Configuration;

namespace Jellyfin.Plugin.DinkFlix;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginGuid = Guid.Parse("9b8e4d39-6a4c-4b5d-b6aa-d2b1c4f3c9e8");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
    }

    public override string Name => "DINKFLIX Web";

    public override Guid Id => PluginGuid;

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "DINKFLIX Web",
            EmbeddedResourcePath = "Jellyfin.Plugin.DinkFlix.Configuration.configPage.html",
            EnableInMainMenu = true,
            MenuSection = "server",
            DisplayName = "DINKFLIX Web"
        };
    }
}
