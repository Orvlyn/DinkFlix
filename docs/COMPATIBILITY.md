# Compatibility

## Target

DINKFLIX Web 2.1 targets:

- Jellyfin Server 12.1.x
- .NET 10
- Jellyfin plugin ABI `12.1.0.0`
- Desktop Jellyfin Web as the primary browser experience

## Dependencies

The normal frontend injection path depends on File Transformation 3.x. DINKFLIX registers its transformation through reflection so it does not take a compile-time binary dependency on File Transformation.

JavaScript Injector remains useful for separate user scripts but should not also be used to inject the DINKFLIX frontend after the plugin is installed.

## Client scope

DINKFLIX Web is intentionally optimized for desktop browser use. Native Android, iOS, tvOS, Android TV and other dedicated Jellyfin clients are not the target and do not consume this frontend.
