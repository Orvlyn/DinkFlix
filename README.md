# DINKFLIX Web

A desktop-first Jellyfin Web experience built to make a personal media server feel like a polished streaming service.

DINKFLIX is not just a colour skin. The Web plugin injects a lightweight frontend that owns the desktop browsing experience while leaving Jellyfin's server administration and native video player intact.

## What is new in 2.1

- Custom DINKFLIX navigation instead of the stock desktop navigation
- Cinematic Recently Added hero with automatic rotation and pause-on-hover
- Continue Watching and Recently Played rows
- Separate Movies and TV Shows discovery
- Dedicated library grids with search, sorting and practical filters
- Account-linked My List using Jellyfin favourites
- Custom title/detail presentation with ratings, genres, tags and media badges
- Lightweight motion with reduced-motion support
- Custom DINKFLIX About page
- No external fonts, libraries, CSS imports or frontend framework runtime
- Desktop browser focus; mobile/TV clients are intentionally not the target

## Design goals

DINKFLIX is designed for friends and family using a shared personal server. The interface should feel premium without becoming busy, and attractive without sacrificing speed.

The visual system uses a dark obsidian base, DINKFLIX cyan as the primary identity colour, and restrained supporting colours for ratings, HDR, age ratings and other metadata.

## Requirements

- Jellyfin Server 12.1.x
- Jellyfin Web using the desktop/legacy web presentation that supports custom web transformations
- File Transformation 3.x compatible with Jellyfin 12.1

JavaScript Injector can remain installed for other scripts, but DINKFLIX Web is designed to register itself through File Transformation so the DINKFLIX assets do not need to be pasted into Custom CSS or JS Injector after installation.

## Installing DINKFLIX from the GitHub repository

This project is designed so a beginner can manage it from the GitHub website without using Git commands.

### 1. Upload the project to GitHub

Download the latest DINKFLIX Web source ZIP from the repository release or from the project package supplied with this repository.

Extract the ZIP on your computer. In the extracted folder you should see `.github`, `src`, `manifest.json`, `build.yaml`, `dinkflix.css` and `dinkflix.js`.

In your GitHub repository, choose **Add file → Upload files** and drag the **contents of the extracted folder** into the upload area. Do not upload the ZIP itself.

Commit the changes to `main`.

### 2. Wait for validation

Open the repository's **Actions** tab. The **Validate DINKFLIX Web** workflow should finish with a green check.

Do not create a release if validation is red.

### 3. Create a release

Open **Releases → Draft a new release**.

Create a new tag such as:

`v2.1.0.0`

Use the same tag as the release title version, then publish the release.

The release workflow builds the Jellyfin plugin ZIP, uploads it to the release and updates `manifest.json` with the release URL and checksum. Re-running the same tag is safe because the workflow updates an existing release asset rather than trying to create the release again.

### 4. Add the DINKFLIX repository to Jellyfin

In Jellyfin go to:

**Dashboard → Plugins → Repositories → +**

Repository name:

`DINKFLIX`

Repository URL:

`https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`

Save it, then open the **Catalog** and install **DINKFLIX Web**.

Restart Jellyfin after installation.

## Existing Jellyfin plugins

DINKFLIX is designed to coexist with:

- File Transformation — required for the normal plugin frontend path
- Jellyfin Enhanced — recommended and independently useful
- Intro Skipper — independent
- JavaScript Injector — optional for other scripts; do not duplicate the DINKFLIX frontend there once the plugin is installed
- Kefin Tweaks — optional; disable conflicting header/home modifications if you see duplicated navigation

Home Screen Sections is not required for DINKFLIX Web 2.1 because DINKFLIX owns its own desktop home experience.

## Custom CSS / JavaScript after installation

Remove the old ElegantFin/DINKFLIX stylesheet from **Dashboard → General → Branding → Custom CSS** after the plugin has been confirmed working.

Do not paste the DINKFLIX frontend into JavaScript Injector after the plugin is installed. Keeping both versions active can result in duplicate navigation or duplicate home content.

## Performance

DINKFLIX avoids an application framework at runtime. It uses Jellyfin's existing browser API client, lazy-loaded images, compact DOM reconciliation, CSS `transform`/`opacity` transitions, limited blur and reduced-motion support.

The theme deliberately avoids animated full-page gradients, constant JavaScript animation loops, external font loading and heavy per-card filters.

## Project identity

DINKFLIX started as a way to make a personal Jellyfin server feel less like server software and more like a streaming service.

The point is simple: make it easier for friends and family to open the server, understand what they are looking at, find something they want to watch and press play.

DINKFLIX is an independent project by **Orvlyn** and is built around Jellyfin.

## Credits and inspiration

DINKFLIX began from an ElegantFin-based theme and takes visual inspiration from modern streaming interfaces, including the clarity and cinematic presentation found in projects such as SleekFin. The DINKFLIX frontend is now maintained as its own implementation rather than as a thin colour override.

## License

See [LICENSE](LICENSE).
