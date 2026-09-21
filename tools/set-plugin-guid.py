from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: python tools/set-plugin-guid.py YOUR-EXISTING-DINKFLIX-GUID")

guid = sys.argv[1]
if not re.fullmatch(r"[0-9a-fA-F-]{36}", guid):
    raise SystemExit("GUID must be the standard 36-character form.")

root = Path(__file__).resolve().parents[1]
for rel in [
    "manifest.json",
    "build.yaml",
    "src/Jellyfin.Plugin.DinkFlix/Plugin.cs",
]:
    p = root / rel
    s = p.read_text(encoding="utf-8")
    s = s.replace("B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B", guid)
    p.write_text(s, encoding="utf-8")
print(f"Updated DINKFLIX plugin GUID to {guid}")
