using System.Text;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Transforms Jellyfin Web's index.html by injecting the DINKFLIX native visual layer.
/// </summary>
public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-90-START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-90-END -->";
    private const string FrontendVersion = "9.0.0.0";

    public static string TransformIndexHtml(JObject input)
    {
        string contents = input["contents"]?.Value<string>() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(contents)) return contents;

        try
        {
            string cleaned = RemoveExistingBlocks(contents);
            int headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if (headIndex < 0) return contents;
            return cleaned.Insert(headIndex, BuildInjection());
        }
        catch
        {
            return contents;
        }
    }

    private static string BuildInjection()
    {
        string css = ReadEmbeddedResource("dinkflix.css");
        string js = ReadEmbeddedResource("dinkflix.js")
            .Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);

        StringBuilder builder = new StringBuilder();
        builder.AppendLine();
        builder.Append(StartMarker);
        builder.AppendLine();
        builder.Append("<style id=\"dinkflix-css\" data-dinkflix-version=\"");
        builder.Append(FrontendVersion);
        builder.Append("\">");
        builder.Append(css);
        builder.Append("</style>");
        builder.AppendLine();
        builder.Append("<script id=\"dinkflix-js\" data-dinkflix-version=\"");
        builder.Append(FrontendVersion);
        builder.Append("\">");
        builder.Append(js);
        builder.Append("</script>");
        builder.AppendLine();
        builder.Append(EndMarker);
        builder.AppendLine();
        return builder.ToString();
    }

    private static string ReadEmbeddedResource(string fileName)
    {
        var assembly = typeof(WebFileTransformation).Assembly;
        string? resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
            throw new InvalidOperationException($"Embedded DINKFLIX resource not found: {fileName}");

        using Stream stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded resource: {resourceName}");
        using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static string RemoveExistingBlocks(string input)
    {
        string[] versions = { "90", "85", "82", "81", "80", "60", "52", "51" };
        foreach (string version in versions)
        {
            string startMarker = $"<!-- DINKFLIX-WEB-{version}-START -->";
            string endMarker = $"<!-- DINKFLIX-WEB-{version}-END -->";
            int start = input.IndexOf(startMarker, StringComparison.Ordinal);
            int end = input.IndexOf(endMarker, StringComparison.Ordinal);
            if (start >= 0 && end > start)
            {
                end += endMarker.Length;
                input = input.Remove(start, end - start);
            }
        }
        return input;
    }
}
