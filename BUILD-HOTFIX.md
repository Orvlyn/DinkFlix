# DINKFLIX 7.0.0.1 build hotfix

The previous build failed at `DinkFlixIndexMiddleware.cs` because an interpolated raw C# string contained literal CSS braces. The bootstrap builder is now ordinary string concatenation, eliminating CS9006 entirely.

The GitHub Actions workflow also moves to Node 24-compatible action versions: checkout v7, setup-dotnet v6, upload-artifact v6, and softprops/action-gh-release v3. The runner is pinned to Ubuntu 24.04 to avoid the announced ubuntu-latest image migration.
