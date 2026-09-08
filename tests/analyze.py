"""Numerically locate layout landmarks in a screenshot by scanning pixel rows/columns.

Used to compare the live render against the reference design (bnb.png) without eyeballing.
"""
import sys
from PIL import Image


def load(p):
    return Image.open(p).convert("RGB")


def is_gold(px):
    r, g, b = px
    return r > 180 and 140 < g < 230 and b < 120 and (r - b) > 90


def is_bg(px, bg, tol=14):
    return all(abs(px[i] - bg[i]) <= tol for i in range(3))


def col_profile(im, y0, y1, pred):
    """For each column, count matching pixels in the row band."""
    w, _ = im.size
    px = im.load()
    return [sum(1 for y in range(y0, y1) if pred(px[x, y])) for x in range(w)]


def runs(profile, thresh):
    """Contiguous column ranges where profile exceeds thresh."""
    out, start = [], None
    for i, v in enumerate(profile):
        if v > thresh and start is None:
            start = i
        elif v <= thresh and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(profile) - 1))
    return out


def analyze(path, label):
    im = load(path)
    w, h = im.size
    px = im.load()
    bg = px[4, h // 2]
    print(f"\n{'='*62}\n{label}  {w}x{h}   bg={'#%02x%02x%02x' % bg}\n{'='*62}")

    # --- Content bounds: columns that differ from bg anywhere ---
    nonbg_cols = [
        x for x in range(w)
        if any(not is_bg(px[x, y], bg) for y in range(0, h, 7))
    ]
    if nonbg_cols:
        print(f"content x-range      : {nonbg_cols[0]} .. {nonbg_cols[-1]}  "
              f"(left margin {nonbg_cols[0]}, right margin {w-1-nonbg_cols[-1]})")

    # --- Navbar height: first mostly-bg row after the top content ---
    def row_nonbg(y):
        return sum(1 for x in range(0, w, 3) if not is_bg(px[x, y], bg))
    for y in range(20, min(160, h)):
        if row_nonbg(y) < 3:
            print(f"navbar bottom (approx): y={y}")
            break

    # --- Gold columns across the hero band (cube + CTA) ---
    hero_end = int(h * 0.42)
    gp = col_profile(im, 60, hero_end, is_gold)
    gruns = [r for r in runs(gp, 4) if r[1] - r[0] > 6]
    if gruns:
        widest = max(gruns, key=lambda r: r[1] - r[0])
        print(f"hero gold col-runs   : {gruns[:8]}")
        print(f"widest gold run      : x {widest[0]}..{widest[1]} (w={widest[1]-widest[0]+1})")

    # --- Sidebar: rightmost sustained vertical panel edge ---
    mid_lo, mid_hi = int(h * 0.06), int(h * 0.80)
    colcount = [
        sum(1 for y in range(mid_lo, mid_hi, 4) if not is_bg(px[x, y], bg))
        for x in range(w)
    ]
    span = (mid_hi - mid_lo) // 4
    dense = [x for x in range(int(w * 0.62), w) if colcount[x] > span * 0.55]
    if dense:
        print(f"sidebar x-range      : {dense[0]} .. {dense[-1]}  (width ~{dense[-1]-dense[0]+1})")

    # --- Card grid: vertical gutters in the card band ---
    card_y0, card_y1 = int(h * 0.50), int(h * 0.88)
    gut = [
        x for x in range(0, int(w * 0.78))
        if all(is_bg(px[x, y], bg) for y in range(card_y0, card_y1, 5))
    ]
    groups, cur = [], []
    for x in gut:
        if cur and x - cur[-1] > 1:
            groups.append((cur[0], cur[-1]))
            cur = []
        cur.append(x)
    if cur:
        groups.append((cur[0], cur[-1]))
    inner = [g for g in groups if g[0] > 5 and g[1] < int(w * 0.78) - 5]
    if inner:
        print(f"card gutters (x)     : {inner}")
        print(f"gutter widths        : {[g[1]-g[0]+1 for g in inner]}")

    return im


if __name__ == "__main__":
    for p, label in zip(sys.argv[1::2], sys.argv[2::2]):
        analyze(p, label)
