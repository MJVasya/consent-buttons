"""Generate simple cookie icons for the Consent Buttons extension."""
from PIL import Image, ImageDraw
import os

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "icons")
os.makedirs(OUT, exist_ok=True)

S = 128
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Cookie body
d.ellipse([8, 8, S - 8, S - 8], fill=(217, 160, 102, 255), outline=(150, 100, 55, 255), width=6)
# Bite taken out (top-right)
d.ellipse([S - 52, -14, S + 26, 64], fill=(0, 0, 0, 0))
# Chips
chips = [(38, 40, 11), (72, 30, 9), (92, 62, 11), (52, 74, 10), (80, 94, 9), (34, 96, 8)]
for x, y, r in chips:
    d.ellipse([x - r, y - r, x + r, y + r], fill=(90, 58, 30, 255))

for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon{size}.png"))
print("icons written to", OUT)
