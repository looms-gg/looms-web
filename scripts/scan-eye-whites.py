#!/usr/bin/env python3
"""Scan bundled eye PNGs for near-white sclera pixels and print EYES_WITH_WHITES ids.

Usage:
  python3 scripts/scan-eye-whites.py
"""

from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Install Pillow: python3 -m pip install pillow") from exc

ROOT = Path(__file__).resolve().parents[1]
EYES = ROOT / "src" / "assets" / "eyes"


def has_whites(path: Path) -> bool:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = im.getpixel((x, y))
            if a > 200 and r >= 220 and g >= 220 and b >= 220:
                return True
    return False


def main() -> None:
    with_ids = []
    without_ids = []
    for path in sorted(EYES.glob("eye-*.png")):
        (with_ids if has_whites(path) else without_ids).append(path.stem)
    print(f"with_whites={len(with_ids)} without={len(without_ids)}")
    print("EYES_WITH_WHITES = new Set([")
    for eye_id in with_ids:
        print(f'  "{eye_id}",')
    print("])")


if __name__ == "__main__":
    main()
