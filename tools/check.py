from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def balanced(path: Path):
    text = path.read_text(encoding='utf-8')
    depth = 0
    quote = None
    escaped = False
    block = False
    line = False
    i = 0
    while i < len(text):
        ch = text[i]
        nx = text[i + 1] if i + 1 < len(text) else ''
        if line:
            if ch == '\n':
                line = False
        elif block:
            if ch == '*' and nx == '/':
                block = False
                i += 1
        elif quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
        elif ch in ('"', "'"):
            quote = ch
        elif ch == '/' and nx == '*':
            block = True
            i += 1
        elif ch == '/' and nx == '/':
            line = True
            i += 1
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth < 0:
                raise AssertionError(f'negative brace balance: {path}')
        i += 1
    if depth or quote or block:
        raise AssertionError(f'unbalanced source: {path}')

manifest = (ROOT / 'manifest.json').read_text(encoding='utf-8')
assert 'B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B' in manifest

build = (ROOT / 'build.yaml').read_text(encoding='utf-8')
assert 'version:' in build
assert 'targetAbi: "12.0.0.0"' in build
assert 'framework: "net10.0"' in build

root_css = (ROOT / 'dinkflix.css').read_text(encoding='utf-8')
embedded_css = (ROOT / 'src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.css').read_text(encoding='utf-8')
assert root_css == embedded_css
for token in ['--df-accent', 'html.dinkflix-native', '.dinkflix-card-surface', '.dinkflix-control']:
    assert token in root_css, token
balanced(ROOT / 'dinkflix.css')
balanced(ROOT / 'src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.css')

root_js = (ROOT / 'dinkflix.js').read_text(encoding='utf-8')
embedded_js = (ROOT / 'src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js').read_text(encoding='utf-8')
assert root_js == embedded_js
for token in ['__DINKFLIX_NATIVE_THEME_V1__', 'MutationObserver', 'dinkflix-native', 'videoOsdPage']:
    assert token in root_js, token
assert "createElement('video')" not in root_js
balanced(ROOT / 'dinkflix.js')
balanced(ROOT / 'src/Jellyfin.Plugin.DinkFlix/Web/dinkflix.js')

wf = (ROOT / 'src/Jellyfin.Plugin.DinkFlix/WebFileTransformation.cs').read_text(encoding='utf-8')
for token in ['DINKFLIX-WEB-90-START', 'DINKFLIX-WEB-90-END', 'TransformIndexHtml']:
    assert token in wf, token

csproj = (ROOT / 'src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj').read_text(encoding='utf-8')
assert 'EmbeddedResource Include="Web/dinkflix.css"' in csproj
assert 'EmbeddedResource Include="Web/dinkflix.js"' in csproj

for path in (ROOT / 'src/Jellyfin.Plugin.DinkFlix').rglob('*.cs'):
    balanced(path)

print('DINKFLIX static checks: PASS')
print('architecture: native Jellyfin enhancement layer')
