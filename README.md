# DINKFLIX — Stage 2 Theme Foundation

## How DINKFLIX is installed

DINKFLIX is hosted in the GitHub repository and loaded by Jellyfin through one `@import` line.

In Jellyfin go to:

**Dashboard → General → Branding → Custom CSS**

Paste only this:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css");
```

Save, then hard-refresh the browser with **Ctrl + F5**.

You do **not** paste the full stylesheet into Jellyfin.

## Stage 2 architecture

This stage is a native Jellyfin theme foundation.

`dinkflix.css` styles Jellyfin's existing UI instead of creating a second application layer.

It deliberately does **not**:

- create a custom application root
- replace Jellyfin routing
- replace the Jellyfin player
- recreate Jellyfin menus
- recreate search
- recreate profile/preferences
- recreate Requests/Seerr
- add an external theme dependency
- require external fonts
- require an API key

## Current visual scope

- DINKFLIX graphite/obsidian palette
- `#00ffc6` accent system
- native Jellyfin navigation/app-bar styling
- navigation drawer styling
- spacious content width
- larger desktop cards
- native horizontal scrollers
- card hover/focus treatment
- badges and progress styling
- detail-page presentation
- season/episode presentation
- buttons, inputs, dialogs and menus
- player surroundings without replacing playback
- responsive sizing
- reduced-motion support

## Repository file

The live stylesheet is:

`https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css`

That means future theme changes can be made in GitHub without repeatedly pasting a large CSS file into Jellyfin.

## Important testing rule

For this stage, do **not** enable the old DINKFLIX JavaScript/frontend injector at the same time. We are testing the theme layer independently so native Jellyfin behaviour remains isolated and testable.

The DINKFLIX plugin will be rebuilt separately for functionality that CSS cannot provide.
