using System.Reflection;
using Jellyfin.Plugin.DinkFlix.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.DinkFlix;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginId = new("B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B");

    public static Plugin? Instance { get; private set; }

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "DINKFLIX";

    public override Guid Id => PluginId;

    public override string Description =>
        "DINKFLIX is a native Jellyfin theme with optional lightweight frontend enhancements.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "DinkFlixConfiguration",
            DisplayName = "DINKFLIX",
            MenuIcon = "palette",
            EnableInMainMenu = true,
            EmbeddedResourcePath = "Jellyfin.Plugin.DinkFlix.Configuration.configPage.html"
        };
    }
}
