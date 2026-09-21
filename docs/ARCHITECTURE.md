# DINKFLIX Web v2 architecture

DINKFLIX Web v2 has two layers.

1. **C# plugin host**: registers a File Transformation callback, exposes embedded frontend assets through `/Plugins/DinkFlixWeb/Client/*`, and exposes an admin page.
2. **Frontend**: framework-free JavaScript + CSS. It uses Jellyfin's `ApiClient` and existing hash routing, with feature detection and defensive error handling.

File Transformation is intentionally used as the web-server integration point instead of editing `jellyfin-web` files on disk. The transform targets the literal `index.html` pipeline entry and inserts DINKFLIX's stylesheet/script tags once using a marker block.

Home Screen Sections is not used because DINKFLIX itself becomes the owner of the desktop home layout. JavaScript Injector is not required for plugin mode.
