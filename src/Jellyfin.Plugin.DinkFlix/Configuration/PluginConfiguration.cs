using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Configuration;

/// <summary>
/// Stores DINKFLIX Web configuration values.
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
    /// Gets or sets a value indicating whether rating badges are displayed.
    /// </summary>
    public bool ShowRatings { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether technical media badges are displayed.
    /// </summary>
    public bool ShowMediaBadges { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether My List is displayed.
    /// </summary>
    public bool ShowMyList { get; set; } = true;
}
