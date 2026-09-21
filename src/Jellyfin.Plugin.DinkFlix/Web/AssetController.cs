using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.DinkFlix.Web;

[ApiController]
[Route("Plugins/DinkFlixWeb/Client")]
public sealed class AssetController : ControllerBase
{
    private static readonly Assembly Assembly = typeof(AssetController).Assembly;

    [HttpGet("dinkflix.css")]
    public IActionResult Css() => Serve("dinkflix.css", "text/css; charset=utf-8");

    [HttpGet("dinkflix.js")]
    public IActionResult JavaScript() => Serve("dinkflix.js", "application/javascript; charset=utf-8");

    private IActionResult Serve(string fileName, string contentType)
    {
        var resourceName = Assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null) return NotFound();
        using var stream = Assembly.GetManifestResourceStream(resourceName);
        if (stream is null) return NotFound();

        using var reader = new StreamReader(stream);
        var content = reader.ReadToEnd();
        Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        return Content(content, contentType);
    }
}
