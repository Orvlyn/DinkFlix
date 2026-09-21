# DINKFLIX migration

1. Replace the old repository contents with this repository tree. Do not merge old C# or old frontend files back in.
2. Keep the same DINKFLIX GUID: `B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B`.
3. In Jellyfin Custom CSS, use exactly the import shown in `README.md`.
4. Remove any old DINKFLIX JavaScript Injector script. The new plugin injects only its own small enhancement script.
5. Build/publish the plugin, then restart Jellyfin.

Do not install another theme as a dependency.
