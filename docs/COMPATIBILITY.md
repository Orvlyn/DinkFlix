# Compatibility notes

Baseline: Jellyfin 12.1.x, .NET 10.0, File Transformation 3.0.1.x.

DINKFLIX Web is desktop-first and intentionally does not claim to restyle native mobile/tvOS/Android clients.

Known coexistence guidance:
- Jellyfin Enhanced: compatible by design; DINKFLIX consumes normal Jellyfin item metadata and favourites.
- Intro Skipper: independent playback feature; no DINKFLIX dependency.
- JavaScript Injector: not required by DINKFLIX Web; keep only for other scripts after plugin install.
- Kefin Tweaks: potential DOM overlap if a tweak targets the same header/home nodes; isolate while testing.
- Home Screen Sections: not required and should not be installed for the default DINKFLIX home architecture.
