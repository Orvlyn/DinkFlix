using System.Text;
using System.Text.Json;

namespace Jellyfin.Plugin.DinkFlix.Services;

/// <summary>
/// Embeds the DINKFLIX frontend into Jellyfin Web index.html.
/// </summary>
public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-60-START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-60-END -->";
    private const string FrontendVersion = "6.0.0";

    /// <summary>
    /// Transforms the Jellyfin Web index document.
    /// </summary>
    /// <param name="input">The payload supplied by File Transformation.</param>
    /// <returns>The transformed HTML or the original HTML if transformation cannot be completed.</returns>
    public static string TransformIndexHtml(object? input)
    {
        var contents = ExtractContents(input);
        if (string.IsNullOrWhiteSpace(contents))
        {
            return contents;
        }

        try
        {
            var cleaned = RemoveExistingBlocks(contents);
            var headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if (headIndex < 0)
            {
                return contents;
            }

            return cleaned.Insert(headIndex, BuildInjection());
        }
        catch
        {
            return contents;
        }
    }

    private static string ExtractContents(object? input)
    {
        if (input is null)
        {
            return string.Empty;
        }

        if (input is string text)
        {
            return text;
        }

        var property = input.GetType().GetProperty("Contents")
            ?? input.GetType().GetProperty("contents");
        if (property?.GetValue(input) is string propertyValue)
        {
            return propertyValue;
        }

        try
        {
            using var document = JsonDocument.Parse(input.ToString() ?? string.Empty);
            if (document.RootElement.ValueKind == JsonValueKind.Object)
            {
                if (document.RootElement.TryGetProperty("contents", out var lower))
                {
                    return lower.GetString() ?? string.Empty;
                }

                if (document.RootElement.TryGetProperty("Contents", out var upper))
                {
                    return upper.GetString() ?? string.Empty;
                }
            }
        }
        catch (JsonException)
        {
            // File Transformation supplied a non-JSON object.
        }

        return string.Empty;
    }

    private static string BuildInjection()
    {
        var css = ReadEmbeddedResource("dinkflix.css");
        var js = ReadEmbeddedResource("dinkflix.js");
        js = js.Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);

        var builder = new StringBuilder();
        builder.Append('\n');
        builder.Append(StartMarker);
        builder.Append('\n');
        builder.Append("<style id=\"dinkflix-css\" data-dinkflix-version=\"");
        builder.Append(FrontendVersion);
        builder.Append("\">");
        builder.Append(css);
        builder.Append("</style>\n");
        builder.Append("<script id=\"dinkflix-js\" data-dinkflix-version=\"");
        builder.Append(FrontendVersion);
        builder.Append("\">");
        builder.Append(js);
        builder.Append("</script>\n");
        builder.Append(EndMarker);
        builder.Append('\n');
        return builder.ToString();
    }

    private static string ReadEmbeddedResource(string fileName)
    {
        var assembly = typeof(WebFileTransformation).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            throw new InvalidOperationException($"Embedded DINKFLIX resource not found: {fileName}");
        }

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded DINKFLIX resource: {resourceName}");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static string RemoveExistingBlocks(string input)
    {
        var markerPairs = new[]
        {
            (StartMarker, EndMarker),
            ("<!-- DINKFLIX-WEB-52-START -->", "<!-- DINKFLIX-WEB-52-END -->"),
            ("<!-- DINKFLIX-WEB-51-START -->", "<!-- DINKFLIX-WEB-51-END -->"),
            ("<!-- DINKFLIX-WEB-4:START -->", "<!-- DINKFLIX-WEB-4:END -->"),
            ("<!-- DINKFLIX-WEB-3:START -->", "<!-- DINKFLIX-WEB-3:END -->")
        };

        foreach (var pair in markerPairs)
        {
            var start = input.IndexOf(pair.Item1, StringComparison.Ordinal);
            var end = input.IndexOf(pair.Item2, StringComparison.Ordinal);
            if (start >= 0 && end > start)
            {
                end += pair.Item2.Length;
                input = input.Remove(start, end - start);
            }
        }

        return input;
    }
}
