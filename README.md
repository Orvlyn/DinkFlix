# DINKFLIX Web v2 — Signature UI

DINKFLIX Web v2 is a desktop-first Jellyfin Web redesign built around a lightweight frontend layer instead of a giant CSS-only reskin.

The design direction is intentionally original: clean navigation, cinematic but restrained hero artwork, richer metadata, a useful My List, separated movie/TV discovery, and a more human DINKFLIX identity.

## Baseline

- Jellyfin Server/Web: **12.1**
- Target client: **Jellyfin Web on desktop browsers**
- Existing DINKFLIX ElegantFin CSS: **disable while testing v2**
- JavaScript Injector: **recommended**
- File Transformation: **recommended** and already present in the expected setup
- Jellyfin Enhanced: **compatible / optional**
- Intro Skipper: **compatible / optional**
- Kefin Tweaks: **disable while testing v2** if it changes header/home DOM, then re-enable one feature at a time
- Home Screen Sections: **not required for v2**

Jellyfin Web 12.1 is the current stable web baseline used for this package. The project deliberately avoids taking over the playback UI, so the normal Jellyfin player and your Intro Skipper remain responsible for playback.

## What this build includes

### DINKFLIX navigation

A compact floating desktop navigation bar with:

- DINKFLIX branding
- Home
- Movies
- TV Shows
- My List
- Search
- Jellyfin user menu
- Optional Requests link when a native Requests/Seerr link is discoverable

The navigation reuses Jellyfin's own routes instead of inventing a duplicate router.

### Cinematic home hero

The hero automatically uses **recently added movies and TV** from the current user's library.

It:

- rotates automatically
- pauses when hovered or focused
- pauses while the tab is hidden
- loads the active backdrop first and only prepares the next slide lazily
- uses logo artwork when available and falls back to the title
- shows rating, year, type, genre and age information when Jellyfin provides it
- supports Play and More Info actions

The Play action deliberately routes through Jellyfin's normal detail-page play control instead of attempting to replace the PlaybackManager.

### Homepage sections

DINKFLIX generates:

1. Continue Watching
2. Recently Added
3. Movies
4. TV Shows
5. My List

The rows use native Jellyfin API data and DINKFLIX's own card design rather than a frontend framework.

### Cards

Cards are designed to stay calm at rest, then reveal more information on hover/focus:

- rating
- year
- quality when dimensions are available
- HDR indicator when range metadata is available
- official rating
- progress
- overview on hover
- My List control

The card system favors transform/opacity transitions instead of constant expensive effects.

### My List

DINKFLIX uses **Jellyfin favourites** as its My List backend.

That means My List is per-Jellyfin-user and server-backed rather than living only in browser localStorage.

This also means you do **not** need a separate watchlist database plugin just to get a practical save-for-later list.

### Detail pages

The v2 JavaScript adds a DINKFLIX My List action to compatible item detail pages while leaving Jellyfin's main playback and metadata controls intact.

### About page

`#/dinkflix-about` opens an original DINKFLIX About page with the project philosophy and credits.

## Installation — current, no custom plugin build required

You already have JavaScript Injector and File Transformation, so this is the cleanest first deployment.

### 1. Remove the old DINKFLIX CSS

In Jellyfin:

**Dashboard → General → Branding → Custom CSS**

Remove the old ElegantFin-derived DinkFlix stylesheet/import while testing v2. Keeping both active will cause selectors to fight each other.

### 2. Install the new CSS

Copy the contents of `dinkflix.css` into Jellyfin's Custom CSS box.

Do not paste the JavaScript into the CSS box.

### 3. Add the JavaScript with JS Injector

In Jellyfin:

**Dashboard → Plugins → JavaScript Injector → Add Script**

Use:

- **Name:** `DINKFLIX Web v2`
- **Enabled:** Yes
- **Requires Authentication:** Yes
- **JavaScript Code:** paste the contents of `dinkflix.js`

Save the script.

### 4. Hard refresh

On desktop use:

`Ctrl + Shift + R`

If your browser is aggressive with cached JavaScript, close the Jellyfin tab completely and open it again.

## Recommended plugin setup for your current server

### Keep enabled

- File Transformation
- JavaScript Injector
- Jellyfin Enhanced
- Intro Skipper

### Temporarily disable while validating DINKFLIX v2

- Kefin Tweaks

Do this only for troubleshooting. Kefin Tweaks can make DOM changes that are difficult to distinguish from a DINKFLIX problem during first deployment.

After DINKFLIX v2 is confirmed working, turn Kefin Tweaks back on and test its features one at a time.

### Do not install yet

**Home Screen Sections** is not required for this version. DINKFLIX already owns its desktop home layout. Adding another home-section manager at the same time would create two systems competing to control the page.

## Performance philosophy

This build deliberately avoids turning every component into glassmorphism.

The main animation primitives are:

- transform
- opacity
- short transitions
- small shadows
- restrained blur on the navigation

Hero backdrops are loaded on demand instead of eagerly loading every hero image.

A `prefers-reduced-motion` fallback is included.

## Current limitations

This is the **foundation release**, not the final one-click catalog plugin.

The important distinction is that the frontend itself is already usable through your existing JS Injector setup. The future DINKFLIX plugin can package the same frontend automatically and add server-owned settings/API functionality without changing the visual design.

The v2 frontend intentionally does not:

- replace Jellyfin's playback engine
- replace authentication
- modify Jellyfin's database
- depend on Seerr for My List
- require Home Screen Sections
- require a JavaScript frontend framework

## Compatibility philosophy

Jellyfin Web is an SPA and Jellyfin continues to evolve its page structure. DINKFLIX therefore uses feature detection, native routes, and soft-fail behavior rather than assuming every DOM selector exists forever.

When Jellyfin or a plugin changes something, the intended failure mode is "that DINKFLIX feature disappears" rather than "Jellyfin becomes unusable."

## About the references

The redesign research was informed by the strengths of both ElegantFin and SleekFin.

ElegantFin was the original foundation of the existing DINKFLIX theme. DINKFLIX v2 is intentionally being moved away from that model.

SleekFin demonstrates that Jellyfin can support a much deeper web frontend layer: its current architecture has dedicated header, hero, media and detail features and uses Jellyfin's API for dynamic content.

The DINKFLIX v2 frontend is an original implementation written specifically for this project.

## License

DINKFLIX remains distributed under GPL-2.0-or-later in this development package to preserve the licensing posture of the existing repository. See `LICENSE` for the full text carried by the current project.

## Project identity

DINKFLIX is designed for friends and family who should be able to use the server without needing to know how the server works.

The server is the complicated part.

The interface shouldn't be.
