# DINKFLIX Web — Beginner Installation Guide

## Before you start

Use Jellyfin 12.1.x and keep File Transformation installed.

Do not install Home Screen Sections just for DINKFLIX.

## GitHub website only

1. Open the DINKFLIX repository.
2. Click **Add file → Upload files**.
3. Extract the DINKFLIX source ZIP on your computer.
4. Upload the **contents** of the extracted folder. Do not upload the ZIP itself.
5. Click **Commit changes**.
6. Open **Actions** and wait for **Validate DINKFLIX Web** to finish with a green check.
7. Open **Releases → Draft a new release**.
8. Create a new tag such as `v2.1.0.0` and publish it.
9. Wait for **Build and Release DINKFLIX Web** to turn green.

The release workflow creates the plugin ZIP and updates `manifest.json` automatically.

## Jellyfin repository setup

Open:

**Dashboard → Plugins → Repositories → +**

Name:

`DINKFLIX`

URL:

`https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`

Save → Catalog → **DINKFLIX Web** → Install → Restart Jellyfin.

## Cleaning up the old theme

After DINKFLIX Web is confirmed working:

- Remove the old DINKFLIX/ElegantFin CSS from **General → Branding → Custom CSS**.
- Disable any old DINKFLIX script in JavaScript Injector.
- Keep JavaScript Injector installed if you use it for something else.
- If Kefin Tweaks causes duplicate navigation, disable the specific header/home tweak rather than removing the plugin entirely.
