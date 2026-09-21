using System.Reflection;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginId = new("B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B");

    public static Plugin? Instance { get; private set; }

    public Plugin()
    {
        Instance = this;
    }

    public override string Name => "DINKFLIX";

    public override Guid Id => PluginId;

    public override string Description => "A native Jellyfin 12 theme with lightweight DINKFLIX frontend enhancements.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "DinkFlixConfiguration",
            EmbeddedResourcePath = "Jellyfin.Plugin.DinkFlix.Configuration.configPage.html"
        };
    }
}
