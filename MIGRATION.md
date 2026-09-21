# DINKFLIX clean replacement

This repository is intended to replace the old DINKFLIX source, not sit beside it.

Before building the new plugin, remove the old DINKFLIX source tree and replace it with this repository contents. In particular, do not leave old DINKFLIX `.cs` files or the old custom `dinkflix.js` in the project alongside this build.

Keep the `.git` directory if you are replacing a local clone. Everything else can be replaced by this package.

Jellyfin Custom CSS should contain only:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css");
```

Do not enable an old DINKFLIX script through JavaScript Injector.

The new plugin has a new GUID because the old repository manifest/GUID was not available to the build environment. Remove the old disabled DINKFLIX plugin installation once before installing the new release to avoid duplicate plugin identities.
