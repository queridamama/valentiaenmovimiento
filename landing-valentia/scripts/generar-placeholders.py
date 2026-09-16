"""
Genera las imágenes placeholder de la landing (foto hero, foto de Meli,
capturas de la app, imagen OG y favicon). Son composiciones de marca
temporales, con la etiqueta bien visible de qué archivo hay que
reemplazar y por qué — nunca fotos falsas haciéndose pasar por reales.

Uso: python3 scripts/generar-placeholders.py
No corre en el build ni en producción — es una herramienta de una sola
vez para dejar el proyecto navegable antes de tener los assets finales.
"""

from PIL import Image, ImageDraw, ImageFont
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "public", "images")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

LILA = (196, 155, 201)
ROSA = (251, 227, 232)
CELESTE = (185, 220, 229)
TEXTO = (26, 26, 26)
BLANCO = (255, 255, 255)


def gradiente(size, c1, c2, c3=None):
    w, h = size
    img = Image.new("RGB", size, c1)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        if c3 and t > 0.5:
            t2 = (t - 0.5) * 2
            r = int(c2[0] + (c3[0] - c2[0]) * t2)
            g = int(c2[1] + (c3[1] - c2[1]) * t2)
            b = int(c2[2] + (c3[2] - c2[2]) * t2)
        else:
            t2 = t * 2 if c3 else t
            t2 = min(t2, 1)
            r = int(c1[0] + (c2[0] - c1[0]) * t2)
            g = int(c1[1] + (c2[1] - c1[1]) * t2)
            b = int(c1[2] + (c2[2] - c1[2]) * t2)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def centrar_texto(draw, texto, y, font, fill, size, ancho_max=None):
    w, h = size
    bbox = draw.textbbox((0, 0), texto, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) / 2, y), texto, font=font, fill=fill)


def placeholder_marca(path, size, titulo, etiqueta, subt=None):
    img = gradiente(size, LILA, ROSA, CELESTE)
    draw = ImageDraw.Draw(img)
    f_titulo = ImageFont.truetype(FONT_BOLD, int(size[0] * 0.06))
    f_sub = ImageFont.truetype(FONT_REG, int(size[0] * 0.028))
    f_tag = ImageFont.truetype(FONT_BOLD, int(size[0] * 0.02))

    cy = size[1] / 2 - (size[0] * 0.06)
    centrar_texto(draw, titulo, cy, f_titulo, TEXTO, size)
    if subt:
        centrar_texto(draw, subt, cy + size[0] * 0.09, f_sub, TEXTO, size)

    # Etiqueta de reemplazo, siempre visible, abajo.
    tag = f"REEMPLAZAR · {etiqueta}"
    bbox = draw.textbbox((0, 0), tag, font=f_tag)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 14
    box = [
        (size[0] - tw) / 2 - pad,
        size[1] - th - pad * 3,
        (size[0] + tw) / 2 + pad,
        size[1] - pad,
    ]
    draw.rounded_rectangle(box, radius=999, fill=(255, 255, 255, 220))
    draw.text(((size[0] - tw) / 2, size[1] - th - pad * 2.3), tag, font=f_tag, fill=TEXTO)

    img.save(path, quality=88)
    print("ok:", path)


def placeholder_app(path, size, nombre_pantalla):
    img = Image.new("RGB", size, (247, 246, 244))
    draw = ImageDraw.Draw(img)
    w, h = size
    # marco tipo "pantalla de teléfono"
    margen = int(w * 0.06)
    draw.rounded_rectangle(
        [margen, margen, w - margen, h - margen], radius=40, outline=TEXTO, width=4
    )
    f_label = ImageFont.truetype(FONT_BOLD, int(w * 0.075))
    f_tag = ImageFont.truetype(FONT_REG, int(w * 0.035))
    centrar_texto(draw, nombre_pantalla, h * 0.42, f_label, LILA, size)
    centrar_texto(draw, "REEMPLAZAR POR CAPTURA REAL", h * 0.52, f_tag, (120, 120, 120), size)
    img.save(path, quality=88)
    print("ok:", path)


def favicon():
    size = (512, 512)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, 512, 512], fill=LILA + (255,))
    f = ImageFont.truetype(FONT_BOLD, 280)
    bbox = draw.textbbox((0, 0), "V", font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((512 - tw) / 2, (512 - th) / 2 - bbox[1]), "V", font=f, fill=BLANCO)
    img.save(os.path.join(BASE, "..", "favicon.png"))
    img.resize((180, 180)).save(os.path.join(BASE, "..", "apple-touch-icon.png"))
    print("ok: favicon.png / apple-touch-icon.png")


if __name__ == "__main__":
    os.makedirs(os.path.join(BASE, "valentia"), exist_ok=True)
    os.makedirs(os.path.join(BASE, "app"), exist_ok=True)

    placeholder_marca(
        os.path.join(BASE, "valentia", "hero.jpg"),
        (1600, 2000),
        "VALENTÍA",
        "public/images/valentia/hero.jpg",
        "foto editorial del hero",
    )
    placeholder_marca(
        os.path.join(BASE, "valentia", "og-cover.jpg"),
        (1200, 630),
        "VALENTÍA EN MOVIMIENTO",
        "public/images/valentia/og-cover.jpg",
        "Tomate tus sueños en serio",
    )
    placeholder_marca(
        os.path.join(BASE, "meli.webp"),
        (1200, 1500),
        "MELI",
        "public/images/meli.webp",
        "foto real de Melisa Díaz",
    )

    pantallas = {
        "home.webp": "Inicio",
        "mi-sueno.webp": "Mi Sueño",
        "movimiento.webp": "Movimiento",
        "comunidad.webp": "Comunidad",
        "evidencia.webp": "Evidencia",
    }
    for archivo, nombre in pantallas.items():
        placeholder_app(os.path.join(BASE, "app", archivo), (900, 1800), nombre)

    favicon()
