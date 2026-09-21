using System.Text;
using System.Text.Json;
using MediaBrowser.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Net.Http.Headers;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Adds the tiny DINKFLIX bootstrap script to Jellyfin's existing web index.
/// It never replaces the web application, routes, player, menus or pages.
/// </summary>
public sealed class DinkFlixIndexMiddleware
{
    private const string ScriptResource = "Jellyfin.Plugin.DinkFlix.Web.dinkflix.js";
    private const string Marker = "dinkflix-boot";

    private readonly RequestDelegate _next;
    private readonly ILogger<DinkFlixIndexMiddleware> _logger;

    public DinkFlixIndexMiddleware(RequestDelegate next, ILogger<DinkFlixIndexMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!ShouldIntercept(context.Request))
        {
            await _next(context);
            return;
        }

        var plugin = Plugin.Instance;
        if (plugin is null || !plugin.Configuration.EnableEnhancements)
        {
            await _next(context);
            return;
        }

        var originalFeature = context.Features.Get<IHttpResponseBodyFeature>();
        var originalBody = context.Response.Body;
        if (originalFeature is null)
        {
            await _next(context);
            return;
        }

        await using var buffer = new MemoryStream();
        var bufferingFeature = new StreamResponseBodyFeature(buffer);
        context.Features.Set<IHttpResponseBodyFeature>(bufferingFeature);
        context.Response.Body = buffer;

        var hadAcceptEncoding = context.Request.Headers.ContainsKey(HeaderNames.AcceptEncoding);
        var originalAcceptEncoding = context.Request.Headers[HeaderNames.AcceptEncoding].ToString();
        context.Request.Headers.Remove(HeaderNames.AcceptEncoding);
        context.Request.Headers.Remove(HeaderNames.IfNoneMatch);
        context.Request.Headers.Remove(HeaderNames.IfModifiedSince);

        try
        {
            await _next(context);
            await bufferingFeature.CompleteAsync();

            buffer.Position = 0;
            using var reader = new StreamReader(buffer, Encoding.UTF8, true, leaveOpen: true);
            var html = await reader.ReadToEndAsync();

            var transformed = html;
            if (context.Response.StatusCode is >= 200 and < 300 &&
                html.Contains("<head", StringComparison.OrdinalIgnoreCase) &&
                html.Contains("</head>", StringComparison.OrdinalIgnoreCase) &&
                !html.Contains(Marker, StringComparison.OrdinalIgnoreCase))
            {
                var script = await ReadEmbeddedScriptAsync();
                if (!string.IsNullOrWhiteSpace(script))
                {
                    var configJson = JsonSerializer.Serialize(plugin.Configuration);
                    var bootstrap = BuildBootstrap(script, configJson);
                    var headEnd = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
                    transformed = html.Insert(headEnd, bootstrap);
                }
            }

            context.Response.Body = originalBody;
            context.Features.Set(originalFeature);
            context.Response.Headers.Remove(HeaderNames.ContentLength);
            context.Response.Headers.Remove(HeaderNames.ETag);
            context.Response.Headers.Remove(HeaderNames.LastModified);

            var output = Encoding.UTF8.GetBytes(transformed);
            context.Response.ContentLength = output.Length;
            await originalBody.WriteAsync(output);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DINKFLIX failed to transform Jellyfin Web index; returning the native response.");
            context.Response.Body = originalBody;
            context.Features.Set(originalFeature);

            if (!context.Response.HasStarted)
            {
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
            }
            else
            {
                throw;
            }
        }
        finally
        {
            if (hadAcceptEncoding)
            {
                context.Request.Headers[HeaderNames.AcceptEncoding] = originalAcceptEncoding;
            }
            else
            {
                context.Request.Headers.Remove(HeaderNames.AcceptEncoding);
            }
        }
    }

    private static bool ShouldIntercept(HttpRequest request)
    {
        if (!HttpMethods.IsGet(request.Method))
        {
            return false;
        }

        var path = request.Path.Value ?? string.Empty;
        return path.Equals("/web", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/web/", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/web/index.html", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string?> ReadEmbeddedScriptAsync()
    {
        try
        {
            await using var stream = typeof(Plugin).Assembly.GetManifestResourceStream(ScriptResource);
            if (stream is null)
            {
                _logger.LogWarning("DINKFLIX resource {Resource} was not found in the assembly.", ScriptResource);
                return null;
            }

            using var reader = new StreamReader(stream, Encoding.UTF8);
            return await reader.ReadToEndAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DINKFLIX could not read its embedded frontend resource.");
            return null;
        }
    }

    private static string BuildBootstrap(string script, string configuration)
    {
        var safeConfig = configuration.Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);
        var safeScript = script.Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);

        return "<style id=\"dinkflix-boot\">html.df-booting body{visibility:hidden !important;}html.df-ready body{visibility:visible !important;}</style>"
            + "<script id=\"dinkflix-config\">window.__DINKFLIX_CONFIG__=" + safeConfig + ";</script>"
            + "<script id=\"dinkflix-boot-script\">document.documentElement.classList.add('df-booting');" + safeScript + "</script>";
    }
}
