using System.Text;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.DinkFlix;

/// <summary>
/// Transforms Jellyfin Web's index.html by injecting the DINKFLIX frontend.
/// </summary>
public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-84-START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-84-END -->";
    private const string FrontendVersion = "8.4.0.0";

    public static string TransformIndexHtml(JObject input)
    {
        string contents = input["contents"]?.Value<string>() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(contents))
        {
            return contents;
        }

        try
        {
            string cleaned = RemoveExistingBlocks(contents);
            int headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
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
        {
            throw new InvalidOperationException($"Embedded DINKFLIX resource not found: {fileName}");
        }

        using Stream stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded resource: {resourceName}");
        using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static string RemoveExistingBlocks(string input)
    {
        string[] starts =
        {
            StartMarker,
            "<!-- DINKFLIX-WEB-82-START -->",
            "<!-- DINKFLIX-WEB-81-START -->",
            "<!-- DINKFLIX-WEB-80-START -->",
            "<!-- DINKFLIX-WEB-60-START -->",
            "<!-- DINKFLIX-WEB-52-START -->",
            "<!-- DINKFLIX-WEB-51-START -->",
            "<!-- DINKFLIX-WEB-4:START -->",
            "<!-- DINKFLIX-WEB-3:START -->"
        };

        string[] ends =
        {
            EndMarker,
            "<!-- DINKFLIX-WEB-82-END -->",
            "<!-- DINKFLIX-WEB-81-END -->",
            "<!-- DINKFLIX-WEB-80-END -->",
            "<!-- DINKFLIX-WEB-60-END -->",
            "<!-- DINKFLIX-WEB-52-END -->",
            "<!-- DINKFLIX-WEB-51-END -->",
            "<!-- DINKFLIX-WEB-4:END -->",
            "<!-- DINKFLIX-WEB-3:END -->"
        };

        for (int index = 0; index < starts.Length; index++)
        {
            int start = input.IndexOf(starts[index], StringComparison.Ordinal);
            int end = input.IndexOf(ends[index], StringComparison.Ordinal);
            if (start >= 0 && end > start)
            {
                end += ends[index].Length;
                input = input.Remove(start, end - start);
            }
        }

        return input;
    }
}
