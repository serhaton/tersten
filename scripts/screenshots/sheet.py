#!/usr/bin/env python3
"""Contact sheet of one screenshot folder, for a quick look: sheet.py <folder> <out.png> [width per shot]"""
import os, sys
from PIL import Image

folder, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 420
files = sorted(f for f in os.listdir(folder) if f.endswith('.png'))
imgs = [Image.open(os.path.join(folder, f)).convert('RGB') for f in files]
h = round(imgs[0].height * w / imgs[0].width)
sheet = Image.new('RGB', (w * len(imgs) + 8 * (len(imgs) - 1), h), 'white')
for i, im in enumerate(imgs):
    sheet.paste(im.resize((w, h), Image.LANCZOS), (i * (w + 8), 0))
sheet.save(out)
