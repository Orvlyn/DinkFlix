using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Configuration;

/// <summary>
/// DINKFLIX Web configuration.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets the primary DINKFLIX accent color.
    /// </summary>
    public string AccentColor { get; set; } = "#00FFC6";

    /// <summary>
    /// Gets or sets the number of seconds between featured hero changes.
    /// </summary>
    public int HeroRotationSeconds { get; set; } = 14;

    /// <summary>
    /// Gets or sets a value indicating whether ratings should be displayed.
    /// </summary>
    public bool ShowRatings { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether media badges should be displayed.
    /// </summary>
    public bool ShowMediaBadges { get; set; } = true;
}
