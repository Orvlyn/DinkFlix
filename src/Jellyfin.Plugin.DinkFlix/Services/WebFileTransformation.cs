
namespace Jellyfin.Plugin.DinkFlix.Services;

public static class WebFileTransformation
{
    private const string StartMarker = "<!-- DINKFLIX-WEB-V2:START -->";
    private const string EndMarker = "<!-- DINKFLIX-WEB-V2:END -->";
    private const string FrontendVersion = "2.0.0";

    public static string TransformIndexHtml(object? input)
    {
        var contents = string.Empty;
        try
        {
            contents = input?.GetType().GetProperty("Contents")?.GetValue(input)?.ToString() ?? string.Empty;
        }
        catch { }
        try
        {
            var cleaned = RemoveExistingBlock(contents);
            var headIndex = cleaned.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if (headIndex < 0) return contents;

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
        return $"\n        {StartMarker}\n        <link id=\"dinkflix-v2-css\" rel=\"stylesheet\" href=\"{css}\">\n        <script id=\"dinkflix-v2-js\" defer src=\"{js}\"></script>\n        {EndMarker}\n        ";
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
