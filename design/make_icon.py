"""Gera os ícones do app a partir da arte (design/arte-original.webp).
Recorta o rostinho do Xepinha (cachorro) e do Oli (gato) e remove o fundo de papel.
Uso: python3 design/make_icon.py"""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import os, sys

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "arte-original.webp")
im = Image.open(SRC).convert("RGB")
paper = im.getpixel((300, 300))

def cutout(box, k, clear=None, fade=0.2):
    c = im.crop(box)
    if clear:  # pinta de papel retângulos (frações) para tirar sujeira da arte
        d = ImageDraw.Draw(c)
        for x0, y0, x1, y1 in clear:
            d.rectangle((x0*c.width, y0*c.height, x1*c.width, y1*c.height), fill=paper)
    c = c.resize((int(c.width*k), int(c.height*k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 90, 3))
    diff = ImageChops.difference(c, Image.new("RGB", c.size, paper)).convert("L")
    alpha = diff.point(lambda v: max(0, min(255, int((v-14)*255/26))))
    sil = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(1.2))
    # fade no pescoço (parte de baixo)
    g = Image.linear_gradient("L").resize(c.size)  # 0 em cima, 255 embaixo
    start = int(255*(1-fade))
    fade_mask = g.point(lambda v: 255 if v < start else max(0, int(255*(1-(v-start)/(255-start)))))
    sil = ImageChops.multiply(sil, fade_mask)
    out = c.convert("RGBA"); out.putalpha(sil)
    return out

def compose(size, scale, path, bg=paper):
    S = size
    dog = cutout((172, 902, 418, 1100), 3.1*scale, fade=0.22)
    cat = cutout((548, 1014, 702, 1170), 3.45*scale, clear=[(0.86, 0, 1, 0.14), (0.5, 0, 0.78, 0.26), (0, 0.72, 0.2, 1)], fade=0.2)
    canvas = Image.new("RGBA", (S, S), tuple(bg)+(255,))
    ox = (S - int(S*scale)) // 2; oy = (S - int(S*scale)) // 2
    canvas.alpha_composite(dog, (ox + int(40*scale), oy + int(40*scale)))
    canvas.alpha_composite(cat, (ox + int(462*scale), oy + int(470*scale)))
    canvas.convert("RGB").save(path)

if __name__ == "__main__":
    root = os.path.join(HERE, "..")
    out = lambda *p: os.path.join(root, *p)
    os.makedirs(out("public", "icons"), exist_ok=True)
    tmp = out("design", "icon-1024.png")
    compose(1024, 1.0, tmp)
    big = Image.open(tmp)
    for size, path in ((512, out("src/app/icon.png")), (180, out("src/app/apple-icon.png")),
                       (192, out("public/icons/icon-192.png")), (512, out("public/icons/icon-512.png"))):
        big.resize((size, size), Image.LANCZOS).save(path)
    big.convert("RGBA").resize((48, 48), Image.LANCZOS).save(out("src/app/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    # maskable: rostos dentro da zona segura (80% central)
    compose(1024, 0.72, tmp.replace("icon-1024", "_m"))
    Image.open(tmp.replace("icon-1024", "_m")).resize((512, 512), Image.LANCZOS).save(out("public/icons/icon-maskable-512.png"))
    os.remove(tmp.replace("icon-1024", "_m"))
    print("ícones gerados")
