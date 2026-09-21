from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def balanced(path: Path, open_char: str, close_char: str) -> None:
    text = path.read_text(encoding="utf-8")
    depth = 0
    quote = None
    escape = False
    block = False
    line = False
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line:
            if ch == "\n":
                line = False
        elif block:
            if ch == "*" and nxt == "/":
                block = False
                i += 1
        elif quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
        elif ch in ('"', "'"):
            quote = ch
        elif ch == "/" and nxt == "*":
            block = True
            i += 1
        elif ch == "/" and nxt == "/":
            line = True
            i += 1
        elif ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth < 0:
                raise AssertionError(f"negative balance in {path}")
        i += 1
    if depth != 0 or quote or block:
        raise AssertionError(f"unbalanced {path}: depth={depth}")


manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
assert manifest["name"] == "DINKFLIX"
assert manifest["guid"] == "B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B"
assert manifest["versions"] == []

build = (ROOT / "build.yaml").read_text(encoding="utf-8")
assert 'version: "7.0.0.1"' in build
assert 'targetAbi: "12.0.0.0"' in build
assert 'framework: "net10.0"' in build

css = (ROOT / "dinkflix.css").read_text(encoding="utf-8")
assert "#dinkflix-app" not in css
assert "location.hash" not in css
assert "@import" not in css
assert "var(--df-accent)" in css
balanced(ROOT / "dinkflix.css", "{", "}")

js = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js").read_text(encoding="utf-8")
for forbidden in ("innerHTML =", "pushState(", "replaceState(", "window.location =", "createElement(\"video\")"):
    assert forbidden not in js, forbidden
balanced(ROOT / "src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js", "{", "}")

cs_files = list((ROOT / "src/Jellyfin.Plugin.DinkFlix").rglob("*.cs"))
for path in cs_files:
    balanced(path, "{", "}")

assert "IStartupFilter" in (ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixServiceRegistrator.cs").read_text()
assert "StreamResponseBodyFeature" in (ROOT / "src/Jellyfin.Plugin.DinkFlix/DinkFlixIndexMiddleware.cs").read_text()
assert "Jellyfin.Controller\" Version=\"12.0.0\"" in (ROOT / "src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj").read_text()

html = (ROOT / "src/Jellyfin.Plugin.DinkFlix/Configuration/configPage.html").read_text(encoding="utf-8")
for field in ("EnableEnhancements", "GroupContinueWatching", "ShowLocalEndTime", "ShowMediaTechnicalDetails"):
    assert field in html

print("DINKFLIX static checks: PASS")
print(f"CSS lines: {len(css.splitlines())}")
print(f"JS lines: {len(js.splitlines())}")
print(f"C# files: {len(cs_files)}")
