# Research notes

The architecture is based on current Jellyfin 12 Web behavior and the patterns used by maintained Jellyfin themes/plugins.

- Jellyfin 12 uses a Modern React/MUI app while retaining shared/legacy components for parity. Custom CSS is still supported for Web clients.
- Jellyfin's base theme exposes `--jf-palette-*` and `--jf-card-borderRadius` variables. DINKFLIX overrides those variables so native Modern/MUI surfaces inherit the palette.
- Current community themes generally use one externally hosted CSS import for the base visual layer; optional functionality is separate.
- A maintained Jellyfin 12 plugin example uses `BasePluginConfiguration`, `BasePlugin<T>`, `IHasWebPages`, and `IPluginServiceRegistrator`.
- A maintained Jellyfin 12 branding plugin uses `IStartupFilter` + middleware to transform only `/web/` index HTML when an early-paint server-side hook is genuinely required.

Important limitation: this environment cannot run the final .NET 10 restore/build against NuGet. The source has been statically checked and aligned with the API shapes documented by current Jellyfin 12-compatible projects, but the GitHub runner is the authoritative compilation test.
