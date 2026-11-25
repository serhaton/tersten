#!/usr/bin/env python3
"""
Builds the two wide product-page images per language from the 6.9-inch screenshots:
  python3 scripts/screenshots/product_page.py <version>   e.g. 1.2
Writes store-screenshots/<version>/product-page/<lang>/header-3840x1646.png and search-results-3840x2560.png.
Lays the picture out as a web page and photographs it with headless Chrome.
"""
import os, subprocess, sys, tempfile
from PIL import Image

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONT = os.path.join(ROOT, 'node_modules/@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf')
TEXT = {
    'tr': ('Tersten', 'Söyle. Çevir. Tahmin et!'),
    'en': ('Say It Backwards', 'Say it. Flip it. Guess it!'),
}
# Left, centre and right phone.
PHONES = ('03-player2', '04-answer', '05-score')
# Emoji, x %, y %, size as % of the picture height, rotation.
STICKERS = [
    ('🎤', 5, 30, 15, -12), ('🏎️', 18, 20, 7, 8), ('🍔', 9, 55, 9, -6), ('⭐', 5, 74, 10, 14),
    ('⚽', 12, 88, 9, 0), ('🎁', 19, 72, 9, -10), ('🦁', 84, 14, 11, 8), ('🎄', 91, 32, 12, -6),
    ('⭐', 82, 56, 10, -14), ('❓', 95, 58, 9, 10), ('🔔', 91, 82, 11, 12), ('🍕', 82, 90, 9, -8),
    ('🏆', 16, 40, 8, 6), ('🎅', 86, 72, 8, -4),
]

def page(lang, version, w, h):
    title, slogan = TEXT[lang]
    shots = os.path.join(ROOT, 'store-screenshots', version, '6.9-inch', lang)
    tall = h / w > 0.5
    # Phone height and top edge as % of the picture height; the short header lets the phones run off the bottom.
    ph, top = (66, 29) if tall else (88, 30)
    phones = ''.join(
        f'<div class="phone p{i}"><img src="file://{shots}/{name}.png"></div>' for i, name in enumerate(PHONES))
    stickers = ''.join(
        f'<span class="s" style="left:{x}%;top:{y}%;font-size:{s * h / 100}px;transform:translate(-50%,-50%) rotate({r}deg)">{e}</span>'
        for e, x, y, s, r in STICKERS)
    return f'''<!doctype html><html lang="{lang}"><meta charset="utf-8"><style>
@font-face {{ font-family: Baloo; src: url("file://{FONT}"); }}
html, body {{ margin: 0; width: {w}px; height: {h}px; overflow: hidden; }}
body {{ position: relative; font-family: Baloo, sans-serif; color: #fff; text-align: center;
  background: linear-gradient(115deg, #6B4BD8 0%, #B03AA8 30%, #E6306B 55%, #F5743C 80%, #FFB224 100%); }}
.blob {{ position: absolute; border-radius: 50%; background: rgba(255,255,255,0.12); }}
h1 {{ position: absolute; left: 0; right: 0; top: {h * (0.035 if tall else 0.03)}px; margin: 0; font-size: {h * (0.105 if tall else 0.15)}px; line-height: 1.1;
  text-shadow: 0 {h * 0.008}px 0 rgba(0,0,0,0.22); }}
p {{ position: absolute; left: 0; right: 0; top: {h * (0.165 if tall else 0.2)}px; margin: 0; font-size: {h * (0.042 if tall else 0.06)}px; line-height: 1.2; }}
.s {{ position: absolute; line-height: 1; filter: drop-shadow(0 {h * 0.01}px {h * 0.012}px rgba(0,0,0,0.25)); }}
.phone {{ position: absolute; top: {top}%; height: {ph}%; aspect-ratio: 1320 / 2868; box-sizing: content-box;
  border: {h * ph / 100 * 0.016}px solid #14142B; border-radius: {h * ph / 100 * 0.075}px; overflow: hidden;
  box-shadow: 0 {h * 0.02}px {h * 0.05}px rgba(20,10,60,0.45); background: #14142B; }}
.phone img {{ width: 100%; height: 100%; display: block; }}
.p0 {{ left: {28 if tall else 31}%; transform: translateX(-50%) rotate(-7deg); margin-top: {h * 0.03}px; }}
.p1 {{ left: 50%; transform: translateX(-50%); z-index: 2; }}
.p2 {{ left: {72 if tall else 69}%; transform: translateX(-50%) rotate(7deg); margin-top: {h * 0.03}px; }}
</style><body>
<div class="blob" style="left:-{h * 0.3}px;top:-{h * 0.35}px;width:{h * 0.85}px;height:{h * 0.85}px"></div>
<div class="blob" style="right:-{h * 0.25}px;bottom:-{h * 0.35}px;width:{h * 0.8}px;height:{h * 0.8}px"></div>
{stickers}<h1>{title}</h1><p>{slogan}</p>{phones}
</body></html>'''

def main():
    version = sys.argv[1]
    for lang in TEXT:
        out = os.path.join(ROOT, 'store-screenshots', version, 'product-page', lang)
        os.makedirs(out, exist_ok=True)
        for name, (w, h) in {'header-3840x1646': (1920, 823), 'search-results-3840x2560': (1920, 1280)}.items():
            with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf8') as f:
                f.write(page(lang, version, w, h))
            target = os.path.join(out, f'{name}.png')
            subprocess.run([CHROME, '--headless=new', f'--screenshot={target}', f'--window-size={w},{h}',
                            '--force-device-scale-factor=2', '--hide-scrollbars', '--allow-file-access-from-files',
                            '--virtual-time-budget=3000', f'file://{f.name}'], check=True, capture_output=True)
            os.unlink(f.name)
            # App Store Connect rejects images with an alpha channel.
            Image.open(target).convert('RGB').save(target, optimize=True)
            print(target)

if __name__ == '__main__':
    main()
