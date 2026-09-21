using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool EnableEnhancements { get; set; } = true;
    public bool GroupContinueWatching { get; set; } = true;
    public bool ShowLocalEndTime { get; set; } = true;
    public bool ShowMediaTechnicalDetails { get; set; } = true;
}
