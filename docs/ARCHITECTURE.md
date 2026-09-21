# Architecture

DINKFLIX Web is a regular Jellyfin plugin. `PluginServiceRegistrator` registers an ASP.NET Core `IStartupFilter`. The startup filter buffers the Jellyfin Web entry document and injects embedded CSS and JavaScript before `</head>`. No Jellyfin files are modified on disk.

DINKFLIX-owned pages use `#/dinkflix/...` routes to avoid colliding with Jellyfin's own router. `#/home` is intentionally owned by the DINKFLIX home, while Requests, Bookmarks, Calendar, profile, preferences and admin routes remain native.
