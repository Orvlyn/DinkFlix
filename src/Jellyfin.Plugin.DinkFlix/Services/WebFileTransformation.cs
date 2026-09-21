namespace Jellyfin.Plugin.DinkFlix.Services;

/// <summary>
/// File Transformation callback used to add the DINKFLIX Web assets to Jellyfin's index.html.
/// </summary>
public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-V2:START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-V2:END -->";
    private const string FrontendVersion = "2.0.1";

    /// <summary>
    /// Receives the File Transformation payload and returns the transformed index.html.
    /// </summary>
    public static string TransformIndexHtml(PatchRequestPayload input)
    {
        var contents = input?.Contents ?? string.Empty;

        try
        {
            var cleaned = RemoveExistingBlock(contents);
            var headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if (headIndex < 0)
            {
                return contents;
            }

            var injection = BuildInjection();
            return cleaned.Insert(headIndex, injection);
        }
        catch
        {
            return contents;
        }
    }

    private static string BuildInjection()
    {
        var css = $"../Plugins/DinkFlixWeb/Client/dinkflix.css?v={FrontendVersion}";
        var js = $"../Plugins/DinkFlixWeb/Client/dinkflix.js?v={FrontendVersion}";

        return $"\n        {StartMarker}\n" +
               $"        <link id=\"dinkflix-v2-css\" rel=\"stylesheet\" href=\"{css}\">\n" +
               $"        <script id=\"dinkflix-v2-js\" defer src=\"{js}\"></script>\n" +
               $"        {EndMarker}\n        ";
    }

    private static string RemoveExistingBlock(string input)
    {
        var start = input.IndexOf(StartMarker, StringComparison.Ordinal);
        var end = input.IndexOf(EndMarker, StringComparison.Ordinal);
        if (start < 0 || end < start)
        {
            return input;
        }

        end += EndMarker.Length;
        return input.Remove(start, end - start);
    }
}

/// <summary>
/// Payload shape provided by File Transformation to an assembly callback.
/// Kept local so DINKFLIX does not take a binary reference on the File Transformation plugin.
/// </summary>
public sealed class PatchRequestPayload
{
    /// <summary>
    /// Gets or sets the current contents of the transformed file.
    /// </summary>
    public string Contents { get; set; } = string.Empty;
}
