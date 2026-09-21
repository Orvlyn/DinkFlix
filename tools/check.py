from pathlib import Path
import json, re

try:
    import tinycss2
except ImportError:
    tinycss2 = None

ROOT = Path(__file__).resolve().parents[1]


def balanced(path: Path):
    text = path.read_text(encoding="utf-8")
    depth = 0
    quote = None
    esc = False
    block = False
    line = False
    i = 0

    while i < len(text):
        ch = text[i]
        nx = text[i + 1] if i + 1 < len(text) else ""

        if line:
            if ch == "\n":
                line = False
        elif block:
            if ch == "*" and nx == "/":
                block = False
                i += 1
        elif quote:
            if esc:
                esc = False
            elif ch == "\\": 
                esc = True
            elif ch == quote:
                quote = None
        elif ch in ('"', "'"):
            quote = ch
        elif ch == "/" and nx == "*":
            block = True
            i += 1
        elif ch == "/" and nx == "/":
            line = True
            i += 1
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                raise AssertionError(f"negative brace balance: {path}")

        i += 1

    if depth or quote or block:
        raise AssertionError(f"unbalanced source: {path}")


manifest = json.loads((ROOT / "manifest.json").read_text())
assert isinstance(manifest, list)

plugin = next(
    (p for p in manifest if p.get("guid") == "B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B"),
    None,
)
assert plugin is not None
assert plugin["name"] == "DINKFLIX"
assert isinstance(plugin.get("versions"), list)

txt = (ROOT / "build.yaml").read_text()
m = re.search(r'^version:\s*["\']?([^"\'\s]+)', txt, re.M)
assert m, "build.yaml version missing"
version = m.group(1)

for token in [
    f'version: "{version}"',
    'targetAbi: "12.0.0.0"',
    'framework: "net10.0"',
]:
    assert token in txt, token

css = (ROOT / "dinkflix.css").read_text()
assert "#dinkflix-app" in css
assert "location.hash" not in css
assert "--jf-palette-primary-main" in css
balanced(ROOT / "dinkflix.css")

if tinycss2:
    errors = [
        r
        for r in tinycss2.parse_stylesheet(
            css,
            skip_whitespace=True,
            skip_comments=True,
        )
        if r.type == "error"
    ]
    assert not errors, errors

js = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js").read_text()
for bad in ["pushState(", "replaceState(", 'createElement("video")']:
    assert bad not in js, bad

assert "EnableEnhancements" not in js
assert "GroupContinueWatching" not in js
assert "ShowLocalEndTime" not in js
assert "ShowMediaTechnicalDetails" not in js
assert "df-hero" in js
assert "dinkflix-app" in js
assert "My List" in js
balanced(ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js")

pc = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Configuration/PluginConfiguration.cs").read_text()
assert "BasePluginConfiguration" in pc
assert "using MediaBrowser.Model.Plugins;" in pc
assert "bool " not in pc

pl = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Plugin.cs").read_text()
assert "BasePlugin<PluginConfiguration>" in pl
assert "IHasWebPages" not in pl
assert "IApplicationPaths" in pl and "IXmlSerializer" in pl

mw = (ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixIndexMiddleware.cs").read_text()
assert "cdn.jsdelivr.net" not in mw
assert "Jellyfin.Plugin.DinkFlix.Web.dinkflix.css" in mw
assert 'id=\\\"dinkflix-theme\\\"' in mw
assert "ReadEmbeddedResourceAsync" in mw
assert 'app.UseMiddleware<DinkFlixIndexMiddleware>()' in (
    ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixStartupFilter.cs"
).read_text()

csproj = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj").read_text()
assert 'EmbeddedResource Include="../../dinkflix.css"' in csproj

for p in (ROOT / "src/Jellyfin.Plugin.DinkFlix").rglob("*.cs"):
    balanced(p)

assert not (ROOT / "src/Jellyfin.Plugin.DinkFlix/PluginConfiguration.cs").exists()

print("DINKFLIX static checks: PASS")
print(f"version: {version}")
print("Jellyfin ABI: 12.0.0.0")
print(f"CSS lines: {len(css.splitlines())}")
print(f"JS lines: {len(js.splitlines())}")
