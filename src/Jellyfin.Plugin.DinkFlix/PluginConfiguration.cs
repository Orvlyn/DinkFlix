namespace Jellyfin.Plugin.DinkFlix;

public sealed class PluginConfiguration
{
    public bool EnableEnhancements { get; set; } = true;

    public bool GroupContinueWatching { get; set; } = true;

    public bool ShowLocalEndTime { get; set; } = true;

    public bool ShowMediaTechnicalDetails { get; set; } = true;
}
