using System.Reflection;

namespace Jellyfin.Plugin.DinkFlix.Services;

/// <summary>
/// File Transformation callback that injects the complete DINKFLIX Web frontend into Jellyfin Web.
/// </summary>
public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-V2:START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-V2:END -->";
    private const string FrontendVersion = "2.2.0";

    /// <summary>
    /// Transforms Jellyfin Web's index.html by embedding the DINKFLIX stylesheet and script.
    /// </summary>
    /// <param name="input">File Transformation payload containing the current HTML.</param>
    /// <returns>The transformed HTML, or the original HTML when a safe injection point is unavailable.</returns>
    public static string TransformIndexHtml(PatchRequestPayload input)
    {
        var contents = input?.Contents ?? string.Empty;
        try
        {
            var cleaned = RemoveExistingBlock(contents);
            var headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
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
        var css = ReadEmbeddedResource("dinkflix.css");
        var js = ReadEmbeddedResource("dinkflix.js")
            .Replace("</script>", "<\\/script>", StringComparison.OrdinalIgnoreCase);

        return $"\n        {StartMarker}\n" +
               $"        <style id=\"dinkflix-v2-css\" data-dinkflix-version=\"{FrontendVersion}\">\n{css}\n        </style>\n" +
               $"        <script id=\"dinkflix-v2-js\" data-dinkflix-version=\"{FrontendVersion}\">\n{js}\n        </script>\n" +
               $"        {EndMarker}\n        ";
    }

    private static string ReadEmbeddedResource(string fileName)
    {
        var assembly = typeof(WebFileTransformation).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith($".Web.{fileName}", StringComparison.OrdinalIgnoreCase));
        if (resourceName is null) throw new InvalidOperationException($"Embedded DINKFLIX resource not found: {fileName}");
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Unable to open embedded DINKFLIX resource: {resourceName}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static string RemoveExistingBlock(string input)
    {
        var start = input.IndexOf(StartMarker, StringComparison.Ordinal);
        var end = input.IndexOf(EndMarker, StringComparison.Ordinal);
        if (start < 0 || end < start) return input;
        end += EndMarker.Length;
        return input.Remove(start, end - start);
    }
}

/// <summary>
/// Payload shape supplied by File Transformation to an assembly callback.
/// </summary>
public sealed class PatchRequestPayload
{
    /// <summary>
    /// Gets or sets the current contents of the transformed file.
    /// </summary>
    public string Contents { get; set; } = string.Empty;
}
