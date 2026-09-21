using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Jellyfin.Plugin.DinkFlix.Configuration;

namespace Jellyfin.Plugin.DinkFlix.Web;

/// <summary>
/// Serves the embedded DINKFLIX Web frontend assets.
/// </summary>
[ApiController]
[Route("Plugins/DinkFlixWeb/Client")]
public sealed class AssetController : ControllerBase
{
    private static readonly Assembly Assembly = typeof(AssetController).Assembly;

    /// <summary>
    /// Serves the DINKFLIX CSS bundle.
    /// </summary>
    /// <returns>The CSS asset.</returns>
    [HttpGet("dinkflix.css")]
    public IActionResult Css() => Serve("dinkflix.css", "text/css; charset=utf-8");

    /// <summary>
    /// Serves the DINKFLIX JavaScript bundle.
    /// </summary>
    /// <returns>The JavaScript asset.</returns>
    [HttpGet("dinkflix.js")]
    public IActionResult JavaScript() => Serve("dinkflix.js", "application/javascript; charset=utf-8");

    /// <summary>
    /// Returns the settings consumed by the DINKFLIX Web frontend.
    /// </summary>
    /// <returns>The active DINKFLIX frontend settings.</returns>
    [HttpGet("Configuration")]
    public IActionResult Configuration()
    {
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new
        {
            accentColor = configuration.AccentColor,
            heroRotationSeconds = configuration.HeroRotationSeconds,
            showRatings = configuration.ShowRatings,
            showMediaBadges = configuration.ShowMediaBadges,
            showMyList = configuration.ShowMyList
        });
    }

    private IActionResult Serve(string fileName, string contentType)
    {
        var resourceName = Assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            return NotFound();
        }

        using var stream = Assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        var content = reader.ReadToEnd();
        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        return Content(content, contentType);
    }
}
