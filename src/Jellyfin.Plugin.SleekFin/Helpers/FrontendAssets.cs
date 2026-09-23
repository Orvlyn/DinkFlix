namespace Jellyfin.Plugin.SleekFin.Helpers;

public static class FrontendAssets
{
    public enum Feature
    {
        Always,
        Hero,
        Details
    }

    public sealed record Asset(string FileName, string Folder, Feature RequiredFeature = Feature.Always, bool IsBlockingScript = false)
    {
        public bool IsStyle => FileName.EndsWith(".css", StringComparison.Ordinal);

        public string ContentType => IsStyle ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";

        public string ResourceName => $"Jellyfin.Plugin.SleekFin.Inject.{Folder}.{FileName}";
    }

    public static IReadOnlyList<Asset> Ordered { get; } =
    [
        new("dinkflix-fonts.css", "Theme"),
        new("dinkflix-tokens.css", "Theme"),
        new("dinkflix-foundation.css", "Theme"),
        new("dinkflix-control-surface.css", "Components"),
        new("dinkflix-button.css", "Components"),
        new("dinkflix-section-heading.css", "Components"),
        new("dinkflix-fact.css", "Components"),
        new("dinkflix-meta.css", "Components"),
        new("dinkflix-header-shared.css", "Header"),
        new("dinkflix-header-brand.css", "Header"),
        new("dinkflix-header-modern.css", "Header"),
        new("dinkflix-header-legacy.css", "Header"),
        new("dinkflix-hero.css", "Hero", Feature.Hero),
        new("dinkflix-hero-slide.css", "Hero", Feature.Hero),
        new("dinkflix-hero-carousel.css", "Hero", Feature.Hero),
        new("dinkflix-media.css", "Media"),
        new("dinkflix-sizing.css", "Media"),
        new("dinkflix-media-metadata.css", "Media"),
        new("dinkflix-overrides.css", "Media"),
        new("dinkflix-details.css", "Details", Feature.Details),
        new("dinkflix-details-hero.css", "Details", Feature.Details),
        new("dinkflix-details-actions.css", "Details", Feature.Details),
        new("dinkflix-details-sections.css", "Details", Feature.Details),
        new("dinkflix-details-similar.css", "Details", Feature.Details),
        new("dinkflix-details-episodes.css", "Details", Feature.Details),
        new("dinkflix-details-boot.js", "Details", Feature.Details, IsBlockingScript: true),
        new("dinkflix-runtime.js", "Build"),
        new("dinkflix-theme.js", "Build"),
        new("dinkflix-header.js", "Build"),
        new("dinkflix-hero.js", "Build", Feature.Hero),
        new("dinkflix-media.js", "Build"),
        new("dinkflix-details.js", "Build", Feature.Details)
    ];

    public static IReadOnlyDictionary<string, Asset> ByFileName { get; } = Ordered.ToDictionary(
        asset => asset.FileName,
        StringComparer.Ordinal);
}
