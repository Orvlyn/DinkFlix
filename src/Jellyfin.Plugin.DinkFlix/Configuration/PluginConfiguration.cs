using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.DinkFlix.Configuration;

/// <summary>
/// Stores DINKFLIX server configuration.
/// </summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets the DINKFLIX accent colour.
    /// </summary>
    public string AccentColor { get; set; } = "#00FFC6";

    /// <summary>
    /// Gets or sets the hero rotation interval in seconds.
    /// </summary>
    public int HeroRotationSeconds { get; set; } = 14;

    /// <summary>
    /// Gets or sets the optional TMDB API read access token used for watch-provider data.
    /// </summary>
    public string TmdbReadAccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the TMDB watch-provider region.
    /// </summary>
    public string TmdbWatchRegion { get; set; } = "AU";
}
