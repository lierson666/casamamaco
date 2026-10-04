"""Monta o banner do KV (public/kv/banner.png) com peças recortadas da arte original
(design/arte-original.webp): sol, passarinhos, cactos, Xepinha e Oli. Fundo transparente.
Uso: python3 design/make_kv.py"""
from PIL import Image, ImageFilter, ImageChops
import os

HERE = os.path.dirname(__file__)
im = Image.open(os.path.join(HERE, "arte-original.webp")).convert("RGB")
paper = im.getpixel((300, 300))

def piece(box, k=1.0, close=7, erase=()):
    c = im.crop(box)
    from PIL import ImageDraw
    dd = ImageDraw.Draw(c)
    for (x0, y0, x1, y1) in erase:  # apaga vizinhos que entraram no recorte
        dd.rectangle((x0-box[0], y0-box[1], x1-box[0], y1-box[1]), fill=paper)
    c = c.resize((max(1, int(c.width*k)), max(1, int(c.height*k))), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 80, 3))
    # alpha pela luminosidade: papel claro (L >= 228) vira transparente
    lum = c.convert("L")
    a = lum.point(lambda v: max(0, min(255, int((228 - v) * 255 / 50))))
    a = a.filter(ImageFilter.GaussianBlur(0.8))
    out = c.convert("RGBA"); out.putalpha(a)
    return out

W, H = 1600, 520
GROUND = 500
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

def put(img, cx, bottom=None, top=None):
    x = int(cx - img.width/2)
    y = int(bottom - img.height) if bottom is not None else int(top)
    canvas.alpha_composite(img, (x, y))

# peças (coordenadas na arte original, 852 px de largura)
sun   = piece((285, 385, 568, 658), 0.72)
bird1 = piece((80, 525, 262, 695), 0.78)
bird2 = piece((600, 550, 765, 690), 0.78)
cactL = piece((55, 935, 178, 1215), 1.2)
cactR = piece((650, 785, 792, 1215), 1.15, erase=[(650, 1040, 722, 1215)])
house = piece((405, 1030, 548, 1185), 0.85, erase=[(405, 1030, 440, 1185)])
dog   = piece((84, 900, 440, 1450), 0.86, erase=[(398, 1020, 445, 1200), (84, 930, 180, 1218)])
cat   = piece((486, 1010, 722, 1490), 0.86, erase=[(480, 1116, 567, 1200), (690, 1005, 725, 1030), (486, 1005, 548, 1096)])
plant = piece((455, 1575, 640, 1740), 0.7)
plant2 = piece((60, 1515, 290, 1740), 0.62)
cloudA = piece((150, 752, 292, 788), 0.9)
cloudB = piece((583, 735, 732, 768), 0.9)

put(cactR, 1490, bottom=GROUND)
put(cactL, 110, bottom=GROUND)
put(plant2, 330, bottom=GROUND)
put(plant, 1230, bottom=GROUND)
put(house, 800, bottom=GROUND-2)
put(dog, 575, bottom=GROUND)
put(cat, 1010, bottom=GROUND)
put(sun, 800, top=4)
put(bird1, 410, top=60)
put(bird2, 1220, top=70)
put(cloudA, 260, top=190)
put(cloudB, 1380, top=215)

# chão: tracinhos
from PIL import ImageDraw
import random
random.seed(7)
d = ImageDraw.Draw(canvas)
for _ in range(70):
    x = random.randint(20, W-20); y = random.randint(GROUND-6, H-8); w = random.randint(14, 34)
    d.rounded_rectangle((x, y, x+w, y+4), radius=2, fill=(20, 17, 15, 255))

os.makedirs(os.path.join(HERE, "..", "public", "kv"), exist_ok=True)
out = os.path.join(HERE, "..", "public", "kv", "banner.png")
canvas.save(out, optimize=True)
print("banner:", canvas.size, os.path.getsize(out)//1024, "KB")
