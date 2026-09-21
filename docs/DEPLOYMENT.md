# DINKFLIX Web 2.1 deployment

## GitHub website workflow

1. Keep the existing `v2.0.1.0` release. Do not delete it.
2. Download the DINKFLIX Web 2.1 source package and extract it.
3. In GitHub, open `Orvlyn/DinkFlix` and choose **Add file → Upload files**.
4. Upload the **contents** of the extracted package, including `.github` and `src`.
5. Commit the changes to `main`.
6. Open **Actions** and wait for **Validate DINKFLIX Web** to finish successfully.
7. Open **Releases → Draft a new release** and create the new tag `v2.1.0.0`.
8. Publish the release. The workflow builds and uploads the plugin ZIP and updates `manifest.json` automatically.

## Jellyfin website workflow

1. In Jellyfin, keep File Transformation installed and compatible with Jellyfin 12.1.x.
2. Add the DINKFLIX repository under **Dashboard → Plugins → Repositories**:
   `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`
3. Install **DINKFLIX Web** from the Catalog and restart Jellyfin.
4. After confirming the plugin works, remove the old DINKFLIX/ElegantFin stylesheet from **Dashboard → General → Branding → Custom CSS**.
5. Disable any old DINKFLIX script in JavaScript Injector. Keep JavaScript Injector itself if it is used for unrelated scripts.
6. If Kefin Tweaks adds a second header/home, disable only the conflicting Kefin tweak.

## Rollback

If the new plugin is not behaving correctly, disable/uninstall DINKFLIX Web and restore the previous custom CSS. No Jellyfin Web files on disk are modified by the normal File Transformation path.
