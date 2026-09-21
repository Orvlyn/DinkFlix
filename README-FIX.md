# DINKFLIX Web 5.2.0.0 — plugin fix

This is a **replacement-files package**, not a new repository.

It fixes the build error you reported:

> `Newtonsoft could not be found` in `WebFileTransformation.cs`

The replacement callback deliberately uses `object` + JSON/reflection so the DINKFLIX plugin does not need to ship or bind to Newtonsoft's assembly across Jellyfin plugin AssemblyLoadContexts.

It also fixes a bigger Jellyfin 12.x runtime problem: the frontend was calling legacy user-scoped routes such as `/Users/{userId}/Items` and `/Users/{userId}/Views`. Current Jellyfin 12.x APIs use `/Items?UserId=...` and `/UserViews?UserId=...`. The current API surface is documented in the generated Jellyfin API references. 

It also changes the plugin registration back to the documented File Transformation integration rather than registering a custom `IStartupFilter`. The File Transformation project explicitly documents reflection-based registration because plugins are loaded in separate AssemblyLoadContexts. citeturn843672view0

## Replace these files in your existing GitHub repository

- `dinkflix.js`
- `dinkflix.css`
- `src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj`
- `src/Jellyfin.Plugin.DinkFlix/Services/PluginServiceRegistrator.cs`
- `src/Jellyfin.Plugin.DinkFlix/Services/WebFileTransformation.cs`
- `src/Jellyfin.Plugin.DinkFlix/Services/FileTransformationRegistrationService.cs` (new)
- `src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js`
- `src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.css`

Leave your existing `.github` workflow alone for this fix.

Do **not** add a DINKFLIX script to JavaScript Injector. Keep File Transformation installed.
