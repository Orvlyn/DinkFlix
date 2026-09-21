# Stage 2 installation

## Jellyfin Custom CSS

Paste this single line into **Dashboard → General → Branding → Custom CSS**:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css");
```

Then Save and press **Ctrl + F5** in the browser.

Do not paste the entire CSS file into the Custom CSS field.

## GitHub

`dinkflix.css` should live at the repository root:

`Orvlyn/DinkFlix/main/dinkflix.css`

Jellyfin loads that live stylesheet directly from GitHub each time the web client loads the custom CSS.
