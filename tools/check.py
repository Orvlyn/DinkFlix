from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

def balanced(path: Path):
    text = path.read_text(encoding="utf-8")
    depth = 0
    quote = None
    escaped = False
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
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
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

manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
assert isinstance(manifest, list)
plugin = next(
    (p for p in manifest if p.get("guid") == "B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B"),
    None,
)
assert plugin is not None
assert plugin["name"] == "DINKFLIX"

build = (ROOT / "build.yaml").read_text(encoding="utf-8")
version_match = re.search(r'^version:\s*["\']?([^"\'\s]+)', build, re.M)
assert version_match, "build.yaml version missing"
assert version_match.group(1) == "8.4.0.0"
assert 'targetAbi: "12.0.0.0"' in build
assert 'framework: "net10.0"' in build

root_css = (ROOT / "dinkflix.css").read_text(encoding="utf-8")
embedded_css = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.css").read_text(encoding="utf-8")
assert root_css == embedded_css
assert "#dinkflix-app-shell" in root_css
assert ".df-nav-links" in root_css
assert ".df-card-media" in root_css
assert ".df-hero" in root_css
assert "repeat(auto-fill" in root_css
balanced(ROOT / "dinkflix.css")
balanced(ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.css")

root_js = (ROOT / "dinkflix.js").read_text(encoding="utf-8")
embedded_js = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js").read_text(encoding="utf-8")
assert root_js == embedded_js
for token in [
    "window.__DINKFLIX_WEB_84__",
    "VERSION = '8.4.0'",
    "function renderHome",
    "function renderLibrary",
    "function renderItem",
    "function renderList",
    "function renderSearch",
    "playbackManager",
    "path === '/details'",
    "path === '/movies' || path === '/tv' || path === '/tvshows'",
    "path === '/search'",
    "df === 'dinkflix-list'",
    "df === 'about'",
    "tab: 2",
    "tab: 3",
]:
    assert token in root_js, token
assert "createElement('video')" not in root_js

pc = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Configuration/PluginConfiguration.cs").read_text(encoding="utf-8")
assert "bool " not in pc

startup = (ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixStartupService.cs").read_text(encoding="utf-8")
assert "StartupTrigger" in startup
assert "RegisterTransformation" in startup
assert '"fileNamePattern"] = "index.html"' in startup
assert "callbackAssembly" in startup
assert "callbackClass" in startup
assert "callbackMethod" in startup
assert "MethodInfo" in startup

reg = (ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixServiceRegistrator.cs").read_text(encoding="utf-8")
assert "IScheduledTask" in reg
assert "DinkFlixStartupService" in reg
assert "AddSingleton<IScheduledTask, DinkFlixStartupService>()" in reg

wf = (ROOT / "src/Jellyfin.Plugin.DinkFlix/WebFileTransformation.cs").read_text(encoding="utf-8")
assert "DINKFLIX-WEB-84-START" in wf
assert "DINKFLIX-WEB-82-START" in wf
assert '8.4.0.0' in wf
assert "TransformIndexHtml" in wf
assert "Newtonsoft.Json.Linq" in wf

csproj = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj").read_text(encoding="utf-8")
assert 'EmbeddedResource Include="Web/dinkflix.css"' in csproj
assert 'EmbeddedResource Include="Web/dinkflix.js"' in csproj
assert 'Newtonsoft.Json' in csproj
assert 'Version>8.4.0.0<' in csproj

for obsolete in [
    "src/Jellyfin.Plugin.DinkFlix/FileTransformationRegistrationService.cs",
    "src/Jellyfin.Plugin.DinkFlix/DinkFlixIndexMiddleware.cs",
    "src/Jellyfin.Plugin.DinkFlix/DinkFlixStartupFilter.cs",
    "src/Jellyfin.Plugin.DinkFlix/Configuration/configPage.html",
    "src/Jellyfin.Plugin.DinkFlix/PluginConfiguration.cs",
]:
    assert not (ROOT / obsolete).exists(), obsolete

for path in (ROOT / "src/Jellyfin.Plugin.DinkFlix").rglob("*.cs"):
    balanced(path)

print("DINKFLIX static checks: PASS")
print("version: 8.4.0.0")
print("frontend baseline: v5.1")
