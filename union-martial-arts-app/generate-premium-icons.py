from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install it with: pip install pillow"
    ) from exc

BASE_DIR = Path(__file__).resolve().parent
CORE_DIR = BASE_DIR / "assets" / "icons" / "core"
SHEETS_DIR = BASE_DIR / "assets" / "icons" / "sheets"
PREVIEWS_DIR = BASE_DIR / "assets" / "icons" / "previews"

ICON_NAMES = [
    "home",
    "checkin",
    "notifications",
    "payments",
    "profile",
    "credential",
]
SIZES = [1024, 512, 256, 128, 64]

# UNION palette
BLUE_ELECTRIC = (26, 92, 255, 255)
BLUE_NAVY = (4, 14, 58, 255)
BLUE_MID = (22, 49, 168, 255)
WHITE = (245, 249, 255, 255)
WHITE_SOFT = (214, 226, 255, 255)
GOLD = (222, 177, 91, 255)
STROKE_SCALE = 1.31
SYMBOL_SCALE = 1.12
LINE_THICKNESS_SCALE = 1.15


def ensure_dirs() -> None:
    CORE_DIR.mkdir(parents=True, exist_ok=True)
    SHEETS_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def blend(c1: tuple[int, int, int, int], c2: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
        int(lerp(c1[3], c2[3], t)),
    )


def linear_gradient(size: int, top: tuple[int, int, int, int], bottom: tuple[int, int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        row = blend(top, bottom, t)
        for x in range(size):
            px[x, y] = row
    return img


def draw_base(size: int = 1024) -> tuple[Image.Image, ImageDraw.ImageDraw, tuple[int, int, int, int], int]:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Slightly larger drawable plate so symbols occupy more visual area.
    pad = int(size * 0.098)
    box = (pad, pad, size - pad, size - pad)
    radius = int(size * 0.24)

    # soft shadow for depth
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    offset = int(size * 0.024)
    sd.rounded_rectangle(
        (box[0], box[1] + offset, box[2], box[3] + offset),
        radius=radius,
        fill=(4, 10, 34, 88),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(size * 0.045)))
    canvas.alpha_composite(shadow)

    # beveled plate
    grad = linear_gradient(size, BLUE_ELECTRIC, BLUE_NAVY)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    canvas.paste(grad, (0, 0), mask)

    rim = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    rd.rounded_rectangle(box, radius=radius, outline=(185, 212, 255, 120), width=max(4, int(size * 0.015)))
    canvas.alpha_composite(rim)

    # subtle inner bevel to lift the face without looking glossy
    bevel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bvd = ImageDraw.Draw(bevel)
    inset = int(size * 0.01)
    inner_box = (box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset)
    bvd.rounded_rectangle(
        inner_box,
        radius=max(1, radius - inset),
        outline=(255, 255, 255, 18),
        width=max(1, int(size * 0.007)),
    )
    canvas.alpha_composite(bevel)

    # top-left highlight bloom
    bloom = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bloom)
    bd.ellipse(
        (
            int(size * 0.04),
            int(size * -0.04),
            int(size * 0.96),
            int(size * 0.52),
        ),
        fill=(255, 255, 255, 34),
    )
    bloom = bloom.filter(ImageFilter.GaussianBlur(radius=int(size * 0.062)))
    canvas.alpha_composite(bloom)

    return canvas, draw, box, radius


def stroke(draw: ImageDraw.ImageDraw, points, width: int, color=WHITE) -> None:
    draw.line(points, fill=color, width=width, joint="curve")


def scaled_stroke(size: int, ratio: float) -> int:
    return max(8, int(size * ratio * STROKE_SCALE * LINE_THICKNESS_SCALE))


def scale_symbol_layer(layer: Image.Image, scale: float) -> Image.Image:
    if abs(scale - 1.0) < 1e-6:
        return layer

    size = layer.size[0]
    new_size = max(1, int(round(size * scale)))
    resized = layer.resize((new_size, new_size), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = (size - new_size) // 2
    out.alpha_composite(resized, (offset, offset))
    return out


def draw_gold_accent(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    w = box[2] - box[0]
    dot_d = int(w * 0.11)
    margin = int(w * 0.08)
    x2 = box[2] - margin
    y1 = box[1] + margin
    x1 = x2 - dot_d
    y2 = y1 + dot_d
    draw.ellipse((x1, y1, x2, y2), fill=GOLD)


def icon_home(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    cx = (box[0] + box[2]) // 2
    top = int(box[1] + w * 0.25)
    base_y = int(box[1] + w * 0.73)
    s = scaled_stroke(size, 0.03)

    roof = [(cx, top), (int(cx - w * 0.24), int(top + w * 0.22)), (int(cx + w * 0.24), int(top + w * 0.22)), (cx, top)]
    stroke(draw, roof, s)

    body = (
        int(cx - w * 0.16),
        int(top + w * 0.22),
        int(cx + w * 0.16),
        base_y,
    )
    draw.rounded_rectangle(body, radius=int(w * 0.03), outline=WHITE, width=s)

    door = (
        int(cx - w * 0.045),
        int(base_y - w * 0.16),
        int(cx + w * 0.045),
        base_y,
    )
    draw.rounded_rectangle(door, radius=int(w * 0.018), outline=WHITE_SOFT, width=max(4, s // 2))
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


def icon_checkin(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    s = scaled_stroke(size, 0.028)

    clip = (
        int(box[0] + w * 0.34),
        int(box[1] + w * 0.2),
        int(box[0] + w * 0.66),
        int(box[1] + w * 0.3),
    )
    draw.rounded_rectangle(clip, radius=int(w * 0.03), outline=WHITE_SOFT, width=max(4, s // 2))

    board = (
        int(box[0] + w * 0.26),
        int(box[1] + w * 0.27),
        int(box[0] + w * 0.74),
        int(box[1] + w * 0.76),
    )
    draw.rounded_rectangle(board, radius=int(w * 0.055), outline=WHITE, width=s)

    stroke(draw, [(int(box[0] + w * 0.36), int(box[1] + w * 0.55)), (int(box[0] + w * 0.47), int(box[1] + w * 0.65)), (int(box[0] + w * 0.66), int(box[1] + w * 0.45))], s)
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


def icon_notifications(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    s = scaled_stroke(size, 0.03)
    cx = (box[0] + box[2]) // 2

    bell = [
        (cx, int(box[1] + w * 0.2)),
        (int(box[0] + w * 0.31), int(box[1] + w * 0.55)),
        (int(box[0] + w * 0.69), int(box[1] + w * 0.55)),
        (cx, int(box[1] + w * 0.2)),
    ]
    stroke(draw, bell, s)
    stroke(draw, [(int(box[0] + w * 0.31), int(box[1] + w * 0.55)), (int(box[0] + w * 0.69), int(box[1] + w * 0.55))], s)
    stroke(draw, [(int(box[0] + w * 0.42), int(box[1] + w * 0.63)), (int(box[0] + w * 0.58), int(box[1] + w * 0.63))], max(4, s // 2), WHITE_SOFT)
    draw.ellipse((int(box[0] + w * 0.45), int(box[1] + w * 0.6), int(box[0] + w * 0.55), int(box[1] + w * 0.7)), fill=WHITE)
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


def icon_payments(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    s = scaled_stroke(size, 0.028)

    card = (
        int(box[0] + w * 0.18),
        int(box[1] + w * 0.3),
        int(box[0] + w * 0.82),
        int(box[1] + w * 0.7),
    )
    draw.rounded_rectangle(card, radius=int(w * 0.06), outline=WHITE, width=s)
    draw.rectangle((card[0], int(card[1] + w * 0.08), card[2], int(card[1] + w * 0.16)), fill=WHITE_SOFT)
    draw.rounded_rectangle((int(box[0] + w * 0.25), int(box[1] + w * 0.5), int(box[0] + w * 0.42), int(box[1] + w * 0.58)), radius=int(w * 0.015), fill=WHITE_SOFT)
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


def icon_profile(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    s = scaled_stroke(size, 0.03)

    head = (
        int(box[0] + w * 0.38),
        int(box[1] + w * 0.24),
        int(box[0] + w * 0.62),
        int(box[1] + w * 0.48),
    )
    draw.ellipse(head, outline=WHITE, width=s)

    body = (
        int(box[0] + w * 0.25),
        int(box[1] + w * 0.5),
        int(box[0] + w * 0.75),
        int(box[1] + w * 0.78),
    )
    draw.rounded_rectangle(body, radius=int(w * 0.13), outline=WHITE, width=s)
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


def icon_credential(size: int = 1024) -> Image.Image:
    canvas, _, box, _ = draw_base(size)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w = box[2] - box[0]
    s = scaled_stroke(size, 0.028)

    card = (
        int(box[0] + w * 0.18),
        int(box[1] + w * 0.24),
        int(box[0] + w * 0.82),
        int(box[1] + w * 0.76),
    )
    draw.rounded_rectangle(card, radius=int(w * 0.06), outline=WHITE, width=s)
    # avatar circle
    draw.ellipse((int(box[0] + w * 0.25), int(box[1] + w * 0.36), int(box[0] + w * 0.41), int(box[1] + w * 0.52)), outline=WHITE_SOFT, width=max(4, s // 2))
    # text lines
    draw.rounded_rectangle((int(box[0] + w * 0.46), int(box[1] + w * 0.37), int(box[0] + w * 0.74), int(box[1] + w * 0.41)), radius=int(w * 0.01), fill=WHITE_SOFT)
    draw.rounded_rectangle((int(box[0] + w * 0.46), int(box[1] + w * 0.45), int(box[0] + w * 0.69), int(box[1] + w * 0.49)), radius=int(w * 0.01), fill=(187, 208, 255, 220))
    canvas.alpha_composite(scale_symbol_layer(layer, SYMBOL_SCALE))
    draw_gold_accent(ImageDraw.Draw(canvas), box)
    return canvas


BUILDERS = {
    "home": icon_home,
    "checkin": icon_checkin,
    "notifications": icon_notifications,
    "payments": icon_payments,
    "profile": icon_profile,
    "credential": icon_credential,
}


def save_icon_set(name: str, master: Image.Image) -> None:
    # Base canonical file at 1024
    master.save(CORE_DIR / f"{name}.png")
    # Explicit multi-size export
    for size in SIZES:
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(CORE_DIR / f"{name}-{size}.png")


def build_contact_sheet() -> None:
    tile = 256
    cols = 3
    rows = 2
    gap = 24
    pad = 26
    width = cols * tile + (cols - 1) * gap + pad * 2
    height = rows * (tile + 40) + (rows - 1) * gap + pad * 2
    sheet = Image.new("RGBA", (width, height), (8, 18, 58, 255))
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except OSError:
        font = ImageFont.load_default()

    for i, name in enumerate(ICON_NAMES):
        r = i // cols
        c = i % cols
        x = pad + c * (tile + gap)
        y = pad + r * (tile + 40 + gap)

        # subtle tile panel
        draw.rounded_rectangle((x - 10, y - 8, x + tile + 10, y + tile + 10), radius=24, fill=(24, 40, 110, 170), outline=(98, 132, 255, 90), width=2)

        icon_path = CORE_DIR / f"{name}-256.png"
        icon = Image.open(icon_path).convert("RGBA")
        sheet.alpha_composite(icon, (x, y))

        tw = draw.textlength(name, font=font)
        draw.text((x + (tile - tw) / 2, y + tile + 14), name, fill=(225, 236, 255, 255), font=font)

    sheet.save(PREVIEWS_DIR / "core-contact-sheet.png")


def main() -> None:
    ensure_dirs()

    for name in ICON_NAMES:
        master = BUILDERS[name](1024)
        save_icon_set(name, master)

    build_contact_sheet()

    print("Generated premium core icons:")
    for name in ICON_NAMES:
        print(f"- {name}: {CORE_DIR / (name + '.png')}")
    print(f"- contact sheet: {PREVIEWS_DIR / 'core-contact-sheet.png'}")


if __name__ == "__main__":
    main()
