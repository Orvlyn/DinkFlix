using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Configuration;

/// <summary>
/// Stores DINKFLIX Web server-side settings.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets the primary DINKFLIX accent colour.
    /// </summary>
    public string AccentColor { get; set; } = "#00FFC6";

    /// <summary>
    /// Gets or sets the hero rotation interval in seconds.
    /// </summary>
    public int HeroRotationSeconds { get; set; } = 15;

    /// <summary>
    /// Gets or sets a value indicating whether DINKFLIX should show rating badges.
    /// </summary>
    public bool ShowRatings { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether DINKFLIX should show technical media badges.
    /// </summary>
    public bool ShowMediaBadges { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether DINKFLIX should show the My List feature.
    /// </summary>
    public bool ShowMyList { get; set; } = true;
}
