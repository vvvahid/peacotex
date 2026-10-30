"""
Builds the site's logo files from the logo artwork (design/logo.png: gold and blue embossed on cream paper).

The paper is taken out so the logo sits on the dark site: what is coloured (gold, blue) or clearly
darker than the paper (outlines) stays; the emboss shadows and highlights on the paper go. The
shallower ATELIER / tagline lettering gets a gentler threshold. The gold is then lifted a little so
it reads on a dark ground as it does on cream.

Run from the project root:  python design/make-brand.py
Writes public/brand/*.webp, src/app/icon.png and src/app/apple-icon.png.
"""
from PIL import Image, ImageFilter
import numpy as np

SRC = "design/logo.png"
INK = (11, 10, 9)          # the site's background (--color-ink)
GAIN, GAMMA = 1.3, 0.85    # brightness lift for a dark ground

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)

# Paper colour at every point: a wide median (wider than any stroke) of a downscaled copy.
small = im.resize((im.width // 4, im.height // 4), Image.LANCZOS)
paper = small.filter(ImageFilter.MedianFilter(21)).filter(ImageFilter.GaussianBlur(6)).resize(im.size, Image.BICUBIC)
bg = np.asarray(paper).astype(np.float32)

W = np.array([0.299, 0.587, 0.114], np.float32)
dl = a @ W - bg @ W                                          # lighter (+) or darker (-) than the paper
dc = (a.max(2) - a.min(2)) - (bg.max(2) - bg.min(2))         # colour beyond the paper's own tint
ss = lambda x, e0, e1: np.clip((x - e0) / (e1 - e0), 0, 1)

alpha = np.maximum(ss(dc, 12, 34), ss(-dl, 55, 95))
soft = np.maximum(ss(dc, 6, 22), ss(-dl, 28, 62))            # ATELIER + tagline (below y = 750)
alpha[750:, :] = np.maximum(alpha[750:, :], soft[750:, :])
alpha = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.5))
alpha = np.asarray(alpha).astype(np.float32) / 255

# Un-mix the paper from the edge pixels, then lift for the dark ground.
al = alpha[..., None]
col = np.where(al > 0.02, (a - (1 - al) * bg) / np.maximum(al, 0.02), 0)
col = np.clip(((np.clip(col, 0, 255) / 255) ** GAMMA) * GAIN, 0, 1) * 255
logo = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), "RGBA")


def trim(img, pad=8):
    x0, y0, x1, y1 = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


full = trim(logo)
mark = trim(logo.crop((540, 40, 1200, 548)))        # the peacock
word = trim(logo.crop((150, 548, 1390, 735)))       # PEACOTEX

for name, img, widths in [("logo", full, [1200, 640]), ("mark", mark, [480, 240]), ("wordmark", word, [900, 450])]:
    for w in widths:
        img.resize((w, round(img.height * w / img.width)), Image.LANCZOS).save(f"public/brand/{name}-{w}.webp", "WEBP", quality=90, method=6)

for size, path in [(512, "src/app/icon.png"), (180, "src/app/apple-icon.png")]:
    tile = Image.new("RGBA", (size, size), INK + (255,))
    m = mark.copy()
    m.thumbnail((int(size * 0.86), int(size * 0.86)), Image.LANCZOS)
    tile.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    tile.convert("RGB").save(path)

print("logo", full.size, "mark", mark.size, "wordmark", word.size)
