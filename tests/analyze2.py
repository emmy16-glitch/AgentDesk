"""Measure headline cap-height, cube bounds and gold hue, normalised across differing widths."""
import sys
from PIL import Image

REF_W = 1312.0


def load(p):
    return Image.open(p).convert("RGB")


def bright(px, t=150):
    return px[0] > t and px[1] > t and px[2] > t


def is_gold(px):
    r, g, b = px
    return r > 175 and 130 < g < 235 and b < 125 and (r - b) > 85


def text_rows(im, x0, x1, y0, y1):
    """Row bands containing bright (white text) pixels within a column window."""
    px = im.load()
    rows = []
    for y in range(y0, y1):
        c = sum(1 for x in range(x0, x1, 2) if bright(px[x, y]))
        rows.append(c)
    bands, start = [], None
    for i, v in enumerate(rows):
        if v > 2 and start is None:
            start = i
        elif v <= 2 and start is not None:
            if i - start > 4:
                bands.append((y0 + start, y0 + i - 1))
            start = None
    return bands


def gold_bbox(im, x0, x1, y0, y1):
    px = im.load()
    xs, ys, samples = [], [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if is_gold(px[x, y]):
                xs.append(x); ys.append(y); samples.append(px[x, y])
    if not xs:
        return None
    n = len(samples)
    avg = tuple(sum(s[i] for s in samples) // n for i in range(3))
    return (min(xs), min(ys), max(xs), max(ys), avg, n)


def report(path, label, scale):
    im = load(path)
    w, h = im.size
    s = lambda v: round(v / scale, 1)   # noqa: E731  -> normalise to reference width
    print(f"\n{'='*64}\n{label}  {w}x{h}  (values normalised to {int(REF_W)}px-wide design)\n{'='*64}")

    # Headline: left 45% of page, hero vertical band
    bands = text_rows(im, int(w * 0.02), int(w * 0.44), int(h * 0.08), int(h * 0.30))
    big = [b for b in bands if b[1] - b[0] >= 12]
    print("headline line bands (raw y):", big[:4])
    if big:
        caps = [b[1] - b[0] + 1 for b in big[:2]]
        print(f"headline cap-height  : raw {caps}  -> normalised {[s(c) for c in caps]}")
        if len(big) >= 2:
            base = big[1][0] - big[0][0]
            print(f"headline line pitch  : raw {base}  -> normalised {s(base)}")
        print(f"headline top y       : raw {big[0][0]} -> normalised {s(big[0][0])}")

    # Cube: gold mass in the centre of the hero
    cb = gold_bbox(im, int(w * 0.42), int(w * 0.72), int(h * 0.06), int(h * 0.36))
    if cb:
        x0, y0, x1, y1, avg, n = cb
        print(f"cube gold bbox raw   : x {x0}..{x1} (w={x1-x0+1}), y {y0}..{y1} (h={y1-y0+1})")
        print(f"cube normalised      : w={s(x1-x0+1)} h={s(y1-y0+1)} centre_x={s((x0+x1)/2)}")
        print(f"cube avg gold        : #{avg[0]:02x}{avg[1]:02x}{avg[2]:02x}  ({n} px)")
        print(f"cube centre_x as % W : {round((x0+x1)/2/w*100,1)}%")

    # Brightest / most saturated gold anywhere (primary CTA + accents)
    g = gold_bbox(im, 0, w, 0, h)
    if g:
        print(f"page-wide avg gold   : #{g[4][0]:02x}{g[4][1]:02x}{g[4][2]:02x}  ({g[5]} px gold)")


if __name__ == "__main__":
    report(sys.argv[1], "REFERENCE", 1.0)
    report(sys.argv[2], "LIVE 1440", 1440 / REF_W)
