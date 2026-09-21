# DINKFLIX Web v2.0.1

DINKFLIX Web is a desktop-first Jellyfin Web frontend layer. It is intentionally more than a CSS theme: CSS handles the visual system, while a small JavaScript frontend uses Jellyfin's existing APIs for the hero, discovery rows, metadata and My List.

## Important: this archive is repo-ready, not a precompiled plugin binary

The current working environment does not have the .NET 10 SDK, so this archive contains the complete source project and GitHub Actions build/release pipeline rather than pretending a DLL was compiled and tested here. Push it to your existing `Orvlyn/DinkFlix` repository, tag a release, and GitHub Actions builds the Jellyfin 12.1 plugin and updates `manifest.json`.

The package also contains the standalone `dinkflix.css` and `dinkflix.js` for an immediate JS Injector test before you install the actual plugin.

## Compatibility baseline

- Jellyfin Web 12.1.x
- .NET 10.0
- File Transformation 3.0.1.x with its Jellyfin 12.1 build
- Desktop web browsers

The DINKFLIX plugin does **not** require Home Screen Sections or JavaScript Injector.

## What to keep on your server

Keep File Transformation. Keep Jellyfin Enhanced and Intro Skipper if you use them. Keep JavaScript Injector for unrelated scripts, but disable any old DINKFLIX script once the DINKFLIX Web plugin is installed. Kefin Tweaks can coexist, but if it modifies the same header/home DOM, test it separately to avoid double modifications.

Do not install Home Screen Sections for the DINKFLIX rollout. DINKFLIX owns the desktop home layout and adding another section-replacement plugin creates an unnecessary second owner.

## 1. Make sure File Transformation is on the Jellyfin 12.1 build

Jellyfin: **Dashboard -> Plugins -> Repositories -> +**

Add:

- Repository name: `File Transformation`
- Repository URL: `https://www.iamparadox.dev/jellyfin/plugins/manifest.json`

Then open **Plugins -> Catalog**, find **File Transformation**, and install/update it. On Jellyfin 12.1, the repository currently publishes the 12.1-compatible build. Restart Jellyfin after installing/updating a plugin.

## 2. Put this package into your existing DinkFlix GitHub repository

Your existing repository is:

`https://github.com/Orvlyn/DinkFlix`

The cleanest approach is:

1. Make a backup of your current repo and your current Custom CSS/JS Injector DINKFLIX setup.
2. Unzip this archive.
3. Copy the contents of the **`plugin/`** folder into the root of your `Orvlyn/DinkFlix` repository, replacing conflicting files if you are ready to make v2 the new branch.
4. Keep the root `dinkflix.css` and `dinkflix.js` from this archive as the new frontend source.
5. Commit and push.

Example Git commands:

```bash
git clone https://github.com/Orvlyn/DinkFlix.git
cd DinkFlix
# copy the contents of the plugin/ folder from this archive into this folder
git add .
git commit -m "feat: DINKFLIX Web v2"
git push origin main
git tag v2.0.1
git push origin v2.0.1
```

GitHub Actions will then:

- build against Jellyfin 12.1 / .NET 10
- create `DinkFlix.Web_12.1.0.zip`
- publish the GitHub Release
- calculate the MD5 checksum
- update the root `manifest.json` with the release URL/checksum

Check the **Actions** tab in GitHub. Do not add the DINKFLIX repository to Jellyfin until that workflow has completed successfully.

## 3. Add the DINKFLIX plugin repository to Jellyfin

After the GitHub Action succeeds:

**Dashboard -> Plugins -> Repositories -> +**

Add:

- Repository name: `DINKFLIX`
- Repository URL: `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`

Save it. Then go to:

**Plugins -> Catalog**

Search for **DINKFLIX Web**, select it, and install it. Restart Jellyfin.

## 4. Turn off the old DINKFLIX injector/theme

Once the plugin is installed, do not run the same frontend twice.

In **Dashboard -> General -> Branding -> Custom CSS**, remove the old ElegantFin/DinkFlix stylesheet.

In **Dashboard -> Plugins -> JavaScript Injector**, disable the old DINKFLIX script. Keep JavaScript Injector itself if you use other scripts.

Hard refresh the browser with `Ctrl + Shift + R`.

## 5. Emergency rollback

If something looks wrong, disable/uninstall **DINKFLIX Web**, remove the DINKFLIX custom CSS, re-enable your old JS Injector script if you still have it saved, and hard refresh. Jellyfin's original Web UI remains underneath the transformation.

## 6. Immediate test mode (before installing the compiled plugin)

The root `dinkflix.css` and `dinkflix.js` can be tested with your existing JavaScript Injector. This is optional and is useful for checking the visual layer before doing the GitHub release step.

Use:

- Custom CSS: contents of `dinkflix.css`
- JavaScript Injector: contents of `dinkflix.js`

Do **not** use test mode and the actual DINKFLIX Web plugin at the same time.

## Current DINKFLIX v2 feature set

- minimal floating navigation
- recently-added cinematic hero
- automatic hero rotation with hover/focus/page-visibility pause
- Continue Watching
- Recently Played
- Recently Added
- Movies and TV Shows split into their own rows
- My List based on Jellyfin favourites
- rating / quality / HDR / age-rating / year badges
- progress bars on resumable items
- hover metadata and actions
- detail-page My List action
- DINKFLIX About page
- desktop-first responsive fallback
- reduced-motion support
- framework-free frontend runtime

## Design intent

DINKFLIX is built for the people who actually use the server: friends and family should be able to sit down, find something good and press play without needing to understand Jellyfin's internals. The visual system uses DINKFLIX cyan as an identity accent while keeping the rest of the palette restrained. Animation is used for feedback and polish rather than constant motion.

## Credits

DINKFLIX began as a customization of ElegantFin by lscambo13. This v2 frontend is an original DINKFLIX implementation; SleekFin by varunaditya-plus was used as a design/architecture reference for research, not as the source of the DINKFLIX implementation. DINKFLIX uses File Transformation by IAmParadox27.

## License

DINKFLIX retains the GPLv2 license posture of the existing project. See `LICENSE`.
