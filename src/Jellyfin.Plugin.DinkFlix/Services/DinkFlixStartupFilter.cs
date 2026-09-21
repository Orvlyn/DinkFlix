using System;
using System.IO;
using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.DinkFlix.Services;

/// <summary>
/// Injects the DINKFLIX frontend into Jellyfin Web without modifying Jellyfin files on disk.
/// </summary>
public sealed class DinkFlixStartupFilter : IStartupFilter
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-51-START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-51-END -->";

    private readonly ILogger<DinkFlixStartupFilter> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="DinkFlixStartupFilter"/> class.
    /// </summary>
    /// <param name="logger">Plugin logger.</param>
    public DinkFlixStartupFilter(ILogger<DinkFlixStartupFilter> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(async (context, pipelineNext) =>
            {
                await InvokeAsync(context, pipelineNext);
            });
            next(app);
        };
    }

    private async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!IsJellyfinWebEntry(context))
        {
            await next(context);
            return;
        }

        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        var transformed = false;

        context.Response.OnStarting(() =>
        {
            if (transformed)
            {
                context.Response.ContentLength = null;
                context.Response.Headers.Remove("Content-Encoding");
                context.Response.Headers.Remove("ETag");
                context.Response.ContentType = "text/html; charset=utf-8";
            }

            return Task.CompletedTask;
        });

        try
        {
            context.Request.Headers.Remove("If-None-Match");
            context.Request.Headers.Remove("If-Modified-Since");
            context.Request.Headers.Remove("Accept-Encoding");
            await next(context);

            if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
            {
                buffer.Position = 0;
                using var reader = new StreamReader(buffer, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
                var html = await reader.ReadToEndAsync(context.RequestAborted);
                var injected = Inject(html);
                if (!ReferenceEquals(injected, html))
                {
                    transformed = true;
                    var bytes = Encoding.UTF8.GetBytes(injected);
                    context.Response.Body = originalBody;
                    await originalBody.WriteAsync(bytes, context.RequestAborted);
                    return;
                }
            }

            buffer.Position = 0;
            context.Response.Body = originalBody;
            await buffer.CopyToAsync(originalBody, context.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DINKFLIX Web frontend injection failed. The original Jellyfin Web response will be served.");
            try
            {
                context.Response.Body = originalBody;
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody, context.RequestAborted);
            }
            catch (Exception copyError)
            {
                _logger.LogDebug(copyError, "DINKFLIX could not restore the buffered Jellyfin Web response.");
            }
        }
        finally
        {
            context.Response.Body = originalBody;
        }
    }

    private static bool IsJellyfinWebEntry(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method))
        {
            return false;
        }

        var path = context.Request.Path.Value ?? string.Empty;
        return path.Equals("/web", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase);
    }

    private static string Inject(string html)
    {
        if (string.IsNullOrEmpty(html) || html.Contains(StartMarker, StringComparison.Ordinal))
        {
            return html;
        }

        var head = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        if (head < 0)
        {
            return html;
        }

        var css = ReadResource("dinkflix.css");
        var js = ReadResource("dinkflix.js").Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);
        var block = $"\n{StartMarker}\n<style id=\"dinkflix-v51-css\">{css}</style>\n<script id=\"dinkflix-v51-js\">{js}</script>\n{EndMarker}\n";
        return html.Insert(head, block);
    }

    private static string ReadResource(string fileName)
    {
        var assembly = typeof(DinkFlixStartupFilter).Assembly;
        var resourceName = Array.Find(assembly.GetManifestResourceNames(), name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));
        if (resourceName is null)
        {
            throw new InvalidOperationException($"Embedded DINKFLIX resource not found: {fileName}");
        }

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded DINKFLIX resource: {resourceName}");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}
