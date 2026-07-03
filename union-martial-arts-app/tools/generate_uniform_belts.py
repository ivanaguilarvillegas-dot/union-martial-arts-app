from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"c:\Users\cinth\OneDrive\Desktop\Claudia Code\union-martial-arts-app\union-martial-arts-app\union-martial-arts-app")
OUT = ROOT / "assets" / "belts"
NAMES = ROOT / "names-belts.json"
CONTACT = OUT / "contact-sheet.png"

CANVAS = 2048
SCALE = 4
H = W = CANVAS * SCALE
CX = 1024 * SCALE
CY = 1024 * SCALE

PALETTE = {
    "belt-white.png": (244, 247, 252),
    "belt-yellow.png": (245, 197, 24),
    "belt-orange.png": (242, 135, 46),
    "belt-green.png": (47, 158, 98),
    "belt-blue.png": (27, 63, 224),
    "belt-purple.png": (124, 58, 237),
    "belt-brown-1.png": (122, 74, 36),
    "belt-brown-2.png": (122, 74, 36),
    "belt-brown-3.png": (122, 74, 36),
    "belt-red.png": (214, 69, 69),
    "belt-red-black.png": (214, 69, 69),
    "belt-black.png": (20, 23, 43),
    "belt-black-1.png": (20, 23, 43),
    "belt-black-2.png": (20, 23, 43),
    "belt-black-3.png": (20, 23, 43),
    "belt-black-4.png": (20, 23, 43),
    "belt-black-5.png": (20, 23, 43),
}

STRIPE_COUNT = {
    "belt-brown-1.png": 1,
    "belt-brown-2.png": 2,
    "belt-brown-3.png": 3,
    "belt-black-1.png": 1,
    "belt-black-2.png": 2,
    "belt-black-3.png": 3,
    "belt-black-4.png": 4,
    "belt-black-5.png": 5,
}


def build_alpha_mask():
    mask = np.zeros((H, W), dtype=np.uint8)
    top_cx, top_cy = CX, CY - int(0.19 * H)
    outer_w, outer_h = int(0.42 * W), int(0.16 * H)
    inner_w, inner_h = int(0.31 * W), int(0.095 * H)
    cv2.ellipse(mask, (top_cx, top_cy), (outer_w // 2, outer_h // 2), 0, 0, 360, 255, -1)
    hole = np.zeros_like(mask)
    cv2.ellipse(hole, (top_cx, top_cy + int(0.01 * H)), (inner_w // 2, inner_h // 2), 0, 0, 360, 255, -1)
    mask = np.where(hole > 0, 0, mask).astype(np.uint8)

    knot_w, knot_h = int(0.11 * W), int(0.12 * H)
    cv2.rectangle(mask, (CX - knot_w // 2, CY - knot_h // 2), (CX + knot_w // 2, CY + knot_h // 2), 255, -1)

    tail_w, tail_h = int(0.095 * W), int(0.33 * H)
    left = np.zeros_like(mask)
    cv2.rectangle(left, (CX - int(0.16 * W) - tail_w // 2, CY + int(0.17 * H) - tail_h // 2), (CX - int(0.16 * W) + tail_w // 2, CY + int(0.17 * H) + tail_h // 2), 255, -1)
    M1 = cv2.getRotationMatrix2D((CX - int(0.16 * W), CY + int(0.17 * H)), 24, 1.0)
    left = cv2.warpAffine(left, M1, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)

    right = np.zeros_like(mask)
    cv2.rectangle(right, (CX + int(0.16 * W) - tail_w // 2, CY + int(0.17 * H) - tail_h // 2), (CX + int(0.16 * W) + tail_w // 2, CY + int(0.17 * H) + tail_h // 2), 255, -1)
    M2 = cv2.getRotationMatrix2D((CX + int(0.16 * W), CY + int(0.17 * H)), -24, 1.0)
    right = cv2.warpAffine(right, M2, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)

    mask = np.maximum(mask, left)
    mask = np.maximum(mask, right)
    mask = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.2)
    return np.clip(mask, 0, 255).astype(np.uint8)


def shade_map(alpha):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    grad = 1.08 - 0.31 * (yy / H) - 0.11 * (xx / W)
    grad = np.clip(grad, 0.64, 1.12)
    glow = np.exp(-(((xx - CX) ** 2) / (2 * (0.05 * W) ** 2) + ((yy - CY) ** 2) / (2 * (0.04 * H) ** 2)))
    grad += 0.08 * glow
    return np.clip(grad, 0.0, 1.2)


def paint(name, alpha, shade):
    out = np.zeros((H, W, 4), dtype=np.uint8)
    if name == "belt-red-black.png":
        split_x = CX
        left = np.array((214, 69, 69), dtype=np.float32)
        right = np.array((20, 23, 43), dtype=np.float32)
        sel = np.arange(W)[None, :] < split_x
        color = np.zeros((H, W, 3), dtype=np.float32)
        for c in range(3):
            color[:, :, c] = np.where(sel, left[c], right[c])
    else:
        base = np.array(PALETTE[name], dtype=np.float32)
        color = np.ones((H, W, 3), dtype=np.float32) * base[None, None, :]

    for c in range(3):
        out[:, :, c] = np.clip(color[:, :, c] * shade, 0, 255).astype(np.uint8)
    out[:, :, 3] = alpha

    n = STRIPE_COUNT.get(name, 0)
    if n > 0:
        stripe = np.zeros((H, W), dtype=np.uint8)
        length = int(0.10 * W)
        thick = int(0.0105 * W)
        gap = int(0.034 * W)
        angle = -18.0
        rad = np.deg2rad(angle)
        dx = int(np.cos(rad) * length)
        dy = int(np.sin(rad) * length)
        base_x = int(CX + 0.20 * W)
        base_y = int(CY + 0.22 * H)
        for i in range(n):
            cx = base_x - i * gap
            cy = base_y + int(i * 0.004 * H)
            p1 = (cx - dx // 2, cy - dy // 2)
            p2 = (cx + dx // 2, cy + dy // 2)
            cv2.line(stripe, p1, p2, 255, thickness=thick, lineType=cv2.LINE_AA)
        stripe = ((stripe > 0) & (alpha > 0)).astype(np.uint8)
        for c in range(3):
            out[:, :, c] = np.where(stripe > 0, 248, out[:, :, c]).astype(np.uint8)

    return out


def downsample(rgba):
    return cv2.resize(rgba, (CANVAS, CANVAS), interpolation=cv2.INTER_LANCZOS4)


def make_contact(paths):
    thumbs = []
    for p in paths:
        im = Image.open(p).convert("RGBA")
        im.thumbnail((230, 230), Image.Resampling.LANCZOS)
        thumbs.append(im)
    cols = 5
    rows = (len(thumbs) + cols - 1) // cols
    tw, th = 260, 250
    sheet = Image.new("RGBA", (cols * tw, rows * th), (239, 242, 247, 255))
    for i, t in enumerate(thumbs):
        x = (i % cols) * tw + (tw - t.width) // 2
        y = (i // cols) * th + (th - t.height) // 2
        sheet.alpha_composite(t, (x, y))
    sheet.save(CONTACT)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = json.loads(NAMES.read_text(encoding='utf-8'))
    alpha = build_alpha_mask()
    shade = shade_map(alpha)
    written = []
    for name in names:
        hi = paint(name, alpha, shade)
        lo = downsample(hi)
        out = OUT / name
        Image.fromarray(lo, mode='RGBA').save(out)
        written.append(out)
    make_contact(written)
    print(f"Generated {len(written)} belts in 2048x2048")


if __name__ == "__main__":
    main()
