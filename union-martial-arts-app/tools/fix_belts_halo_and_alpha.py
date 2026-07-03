from pathlib import Path
import json
import numpy as np
from PIL import Image
import cv2

root = Path(__file__).resolve().parents[1]
belts = root / "assets" / "belts"
names = json.loads((root / "names-belts.json").read_text(encoding="utf-8"))

W = H = 2048
TARGET_W, TARGET_H = 1215, 1600
CX, CY = 1021.0, 961.5
OX = int(round(CX - TARGET_W / 2.0))
OY = int(round(CY - TARGET_H / 2.0))


def clean_single_alpha(alpha: np.ndarray) -> np.ndarray:
    a = alpha.copy().astype(np.uint8)

    # Remove tiny detached noise
    fg = (a > 0).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    keep = np.zeros_like(fg, dtype=bool)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 400:
            keep |= (lab == i)
    a = np.where(keep, a, 0).astype(np.uint8)

    # Turn enclosed holes into true transparency
    fg2 = (a > 0).astype(np.uint8)
    bg = (fg2 == 0).astype(np.uint8)
    h, w = bg.shape
    flood = bg.copy()
    mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, mask, (0, 0), 2)
    outside = flood == 2
    holes = (bg == 1) & (~outside)
    a[holes] = 0
    return a


# Build canonical alpha geometry from black belt
ref = np.array(Image.open(belts / "belt-black.png").convert("RGBA"))
ref_a = clean_single_alpha(ref[:, :, 3])
ys, xs = np.where(ref_a > 0)
ref_crop_a = ref_a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
canonical_alpha = cv2.resize(ref_crop_a, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LANCZOS4)
canonical_alpha = np.clip(canonical_alpha, 0, 255).astype(np.uint8)

for name in names:
    arr = np.array(Image.open(belts / name).convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.float32)
    a = clean_single_alpha(arr[:, :, 3])

    ys, xs = np.where(a > 0)
    crop_rgb = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1, :]
    crop_rgba = np.dstack([crop_rgb.astype(np.uint8), a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]])
    rs = cv2.resize(crop_rgba, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)

    # Apply canonical alpha for strict identical geometry
    rs[:, :, 3] = canonical_alpha.astype(np.float32)

    # White de-matting on edge pixels
    rr = rs[:, :, :3]
    aa = rs[:, :, 3]
    an = aa / 255.0
    semi = (aa > 0) & (aa < 255)
    if np.any(semi):
        cn = rr / 255.0
        fn = (cn - (1.0 - an[:, :, None])) / np.maximum(an[:, :, None], 1e-5)
        fn = np.clip(fn, 0.0, 1.0)
        rr[semi] = fn[semi] * 255.0
    rr[aa == 0] = 0

    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[OY:OY + TARGET_H, OX:OX + TARGET_W, :3] = np.clip(rr, 0, 255).astype(np.uint8)
    out[OY:OY + TARGET_H, OX:OX + TARGET_W, 3] = canonical_alpha

    Image.fromarray(out, "RGBA").save(belts / name)

# Rebuild contact sheet
thumbs = []
for n in names:
    im = Image.open(belts / n).convert("RGBA")
    im.thumbnail((230, 230), Image.Resampling.LANCZOS)
    thumbs.append(im)

sheet = Image.new("RGBA", (1300, 1000), (239, 242, 247, 255))
for i, t in enumerate(thumbs):
    x = (i % 5) * 260 + (260 - t.width) // 2
    y = (i // 5) * 250 + (250 - t.height) // 2
    sheet.alpha_composite(t, (x, y))
sheet.save(belts / "contact-sheet.png")

# QA
sizes = set()
bboxes = set()
centers = set()
for n in names:
    arr = np.array(Image.open(belts / n).convert("RGBA"))
    a = arr[:, :, 3]
    sizes.add((arr.shape[1], arr.shape[0]))
    ys, xs = np.where(a > 0)
    bboxes.add((int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    centers.add((round((xs.min() + xs.max()) / 2, 1), round((ys.min() + ys.max()) / 2, 1)))

print("processed", len(names), "belts")
print("sizes", sizes)
print("bboxes", bboxes)
print("centers", centers)
