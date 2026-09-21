using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Net.Http.Headers;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Adds the DINKFLIX theme and enhancement script to Jellyfin's existing web index.
/// The theme is embedded in the plugin DLL, so it does not depend on Custom CSS,
/// a second theme, or an external CDN.
/// </summary>
public sealed class DinkFlixIndexMiddleware
{
    private const string ThemeResource = "Jellyfin.Plugin.DinkFlix.Web.dinkflix.css";
    private const string ScriptResource = "Jellyfin.Plugin.DinkFlix.Web.dinkflix.js";
    private const string Marker = "dinkflix-theme";

    private readonly RequestDelegate _next;

    public DinkFlixIndexMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!ShouldIntercept(context.Request))
        {
            await _next(context);
            return;
        }

        if (Plugin.Instance is null)
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

            using var reader = new StreamReader(
                buffer,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                leaveOpen: true);

            var html = await reader.ReadToEndAsync();
            var transformed = html;

            if (context.Response.StatusCode is >= 200 and < 300
                && html.Contains("<head", StringComparison.OrdinalIgnoreCase)
                && html.Contains("</head>", StringComparison.OrdinalIgnoreCase)
                && !html.Contains(Marker, StringComparison.OrdinalIgnoreCase))
            {
                var theme = await ReadEmbeddedResourceAsync(ThemeResource);
                var script = await ReadEmbeddedResourceAsync(ScriptResource);

                if (!string.IsNullOrWhiteSpace(theme))
                {
                    var bootstrap = BuildBootstrap(theme, script);
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
        catch
        {
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

    private static async Task<string?> ReadEmbeddedResourceAsync(string resourceName)
    {
        try
        {
            await using var stream = typeof(Plugin).Assembly.GetManifestResourceStream(resourceName);
            if (stream is null)
            {
                return null;
            }

            using var reader = new StreamReader(stream, Encoding.UTF8);
            return await reader.ReadToEndAsync();
        }
        catch
        {
            return null;
        }
    }

    private static string BuildBootstrap(string theme, string? script)
    {
        var safeTheme = theme.Replace("</style>", "<\\/style>", StringComparison.OrdinalIgnoreCase);
        var safeScript = script?.Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase) ?? string.Empty;

        var readinessScript =
            "document.documentElement.classList.add('df-booting');"
            + "document.addEventListener('DOMContentLoaded',function(){document.documentElement.classList.remove('df-booting');document.documentElement.classList.add('df-ready');},{once:true});"
            + "window.setTimeout(function(){document.documentElement.classList.remove('df-booting');document.documentElement.classList.add('df-ready');},3000);";

        return "<style id=\"dinkflix-theme\">" + safeTheme + "</style>"
            + "<script id=\"dinkflix-theme-bootstrap\">" + readinessScript + "</script>"
            + (string.IsNullOrWhiteSpace(safeScript)
                ? string.Empty
                : "<script id=\"dinkflix-enhancements\">" + safeScript + "</script>");
    }
}
