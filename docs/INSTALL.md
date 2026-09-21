# DINKFLIX Web installation

DINKFLIX Web is installed as a normal Jellyfin plugin from the repository manifest.

1. Upload the project files to the root of the GitHub repository.
2. If the GitHub browser uploader skips `.github`, create `.github/workflows/dinkflix-release.yml` and paste the contents of `GITHUB-WORKFLOW.txt`. This is the only hidden-file workaround required.
3. Use GitHub **Actions → DINKFLIX Build and Release → Run workflow** and leave the default version or choose a new version.
4. Wait for the build to finish successfully. The workflow creates/updates the release and updates `manifest.json` with the plugin checksum.
5. In Jellyfin, go to **Dashboard → Plugins → Repositories → +** and add `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`.
6. Install **DINKFLIX Web** from the Catalog and restart Jellyfin.

Before testing, disable any old DINKFLIX JavaScript Injector script and remove the old DINKFLIX import from Custom CSS. Do not disable JavaScript Injector itself if other scripts need it.
