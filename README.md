# DINKFLIX Web

DINKFLIX Web is a desktop-first Jellyfin Web experience for a personal media server. It is designed to make Jellyfin feel like a polished streaming service without turning the interface into a heavy, flashy app.

## The design target

DINKFLIX is built around a clean, understandable navigation bar, a cinematic Recently Added hero, useful discovery rows and a calm visual hierarchy. Cyan (`#00FFC6`) is the identity colour, while ratings, quality, HDR, age ratings and tags use restrained supporting colours.

The goal is premium through spacing, typography, artwork, hierarchy and motion—not through constant glow, blur or animation.

## What DINKFLIX Web 3.0 provides

- Custom desktop navigation: Home, Movies, TV Shows, My List and Search
- Recently Added hero with automatic rotation and pause-on-hover
- Continue Watching and Recently Played discovery
- Recently Added, Movies and TV Shows rows
- Dedicated Movies and TV Shows library grids with search, sorting and filters
- Account-linked My List using Jellyfin favourites
- Rich cards with ratings, quality, HDR, age-rating and tag badges when Jellyfin exposes that metadata
- Custom title pages with artwork, overview, metadata and related content
- Search designed for browsing rather than administration
- Human About page written around a personal friends-and-family server
- Desktop-browser focus; the native Jellyfin mobile and TV apps are intentionally not redesigned
- Lightweight frontend: no React/Preact/Vue runtime, no external fonts, no external CSS imports and no external JavaScript libraries
- File Transformation injection with CSS and JS embedded directly in the plugin assembly

## Requirements

- Jellyfin Server 12.1.x
- File Transformation 3.x compatible with Jellyfin 12.x
- A desktop browser using Jellyfin Web

JavaScript Injector may remain installed for other scripts, but do not inject DINKFLIX through it at the same time as the plugin.

Home Screen Sections is not required. DINKFLIX owns its own desktop home experience.

## Important architecture note

DINKFLIX Web is a real Jellyfin plugin. It does not rely on an ElegantFin CSS import. The frontend is bundled into the plugin and registered with the File Transformation plugin. File Transformation then injects the DINKFLIX assets directly into the served Jellyfin Web `index.html`.

The plugin is deliberately small on the server side: it registers one transformation and serves the frontend from embedded resources. The actual streaming/player stack remains Jellyfin's own system.

## GitHub website workflow — no command line required

This repository is intended to be maintained through the GitHub website.

### First upload

Extract the DINKFLIX Web package on your computer.

Open your GitHub repository and choose:

**Add file → Upload files**

Drag the contents of the extracted package into the upload area. Do not upload the ZIP itself.

GitHub's browser uploader may omit the hidden `.github` directory. That is normal. The only file that must be added separately is:

`.github/workflows/dinkflix-release.yml`

Use:

**Add file → Create new file**

In the file-name box, enter exactly:

`.github/workflows/dinkflix-release.yml`

Then paste the contents of the supplied `GITHUB-WORKFLOW.txt` file and commit the new file.

You only have to do that once for the workflow.

### Build the plugin

Open:

**Actions → DINKFLIX Build & Release**

Click:

**Run workflow**

For the version, leave:

`3.0.0.0`

Click:

**Run workflow**

The workflow then:

1. Verifies every required source file exists.
2. Confirms the root CSS/JS copies match the embedded copies.
3. Checks JavaScript and JSON syntax.
4. Restores Jellyfin 12.1/.NET 10 build dependencies.
5. Publishes the plugin DLL.
6. Creates `DinkFlix.Web_3.0.0.0.zip` containing the plugin DLL.
7. Creates or updates the GitHub release `v3.0.0.0`.
8. Updates `manifest.json` with the download URL and MD5 checksum.

There is no separate tag command and no separate release upload.

## Add the repository to Jellyfin

Once the GitHub Actions run is green and the release exists:

**Dashboard → Plugins → Repositories → +**

Repository name:

`DINKFLIX`

Repository URL:

`https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`

Save it.

Then go to the Catalog, find **DINKFLIX Web**, install it and restart Jellyfin.

## Existing plugins

Recommended setup for a server using DINKFLIX:

- **File Transformation** — keep installed; DINKFLIX uses it to inject its frontend
- **Jellyfin Enhanced** — keep installed; DINKFLIX is designed to coexist with it
- **Intro Skipper** — independent and safe to keep
- **JavaScript Injector** — keep for unrelated scripts, but do not duplicate the DINKFLIX frontend there
- **Kefin Tweaks** — keep if you use it, but disable any Kefin header/home changes that create duplicate UI
- **Home Screen Sections** — not required for DINKFLIX Web

## After the plugin is working

Remove the old DINKFLIX/ElegantFin import from:

**Dashboard → General → Branding → Custom CSS**

Do not leave the old DINKFLIX JavaScript in JavaScript Injector either.

The plugin itself now contains the DINKFLIX frontend.

## Performance philosophy

DINKFLIX prefers CSS `transform` and `opacity` transitions, restrained shadows and limited blur. It avoids continuously animated full-page effects and avoids a frontend framework runtime. Images are loaded lazily where possible and the interface respects `prefers-reduced-motion`.

## About DINKFLIX

DINKFLIX started from a simple idea: a personal Jellyfin server should be easy for friends and family to use. Jellyfin is powerful, but people who are only there to watch something should not have to think about how the server works.

DINKFLIX is built around that idea: open it, understand it, find something good, and press play.

## Credits

DINKFLIX is an independent project by Orvlyn. It originally grew from an ElegantFin-based theme and takes general inspiration from modern streaming interfaces, including the clarity and cinematic presentation of projects such as SleekFin. The DINKFLIX Web 3.x frontend is its own implementation rather than a colour override of another theme.

## License

See `LICENSE`.
