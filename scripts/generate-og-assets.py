#!/usr/bin/env python3
"""Generate high-resolution (1200x630) Open Graph & Discord preview cards.

Uses the authentic 3D isometric renders from Three.js/skinview3d,
exact OKLCH color washes, official Nunito typography, and Looms design system tokens.
"""

from __future__ import annotations

import json
import math
import re
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OG_DIR = PUBLIC / "og"
OG_PIECES_DIR = OG_DIR / "pieces"
ISO_PIECES_DIR = PUBLIC / "iso" / "pieces"
FONTS_DIR = ROOT / "scripts" / "fonts"

W, H = 1200, 630

SLOT_LABELS = {
    "eyes": "EYES",
    "hair": "HAIR",
    "hat": "HEADWEAR",
    "face": "FACE ACCESSORY",
    "shirt": "SHIRT & TOP",
    "coat": "OUTERWEAR",
    "pants": "BOTTOMS",
    "shoes": "FOOTWEAR",
}


def parse_oklch(s: str) -> tuple[float, float, float]:
    m = re.search(r"oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)", s)
    if not m:
        return (0.91, 0.04, 85.0)
    return float(m.group(1)), float(m.group(2)), float(m.group(3))


def oklch_to_rgb(l: float, c: float, h_deg: float) -> tuple[int, int, int]:
    h_rad = math.radians(h_deg)
    a = c * math.cos(h_rad)
    b = c * math.sin(h_rad)
    l_ = l + 0.3963377774 * a + 0.2158037573 * b
    m_ = l - 0.1055613458 * a - 0.0638541728 * b
    s_ = l - 0.0894841775 * a - 1.2914855480 * b
    L = l_ ** 3
    M = m_ ** 3
    S = s_ ** 3
    r = +4.0767434036 * L - 3.3077115913 * M + 0.2309699292 * S
    g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S
    b = -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S

    def gamma(v: float) -> float:
        v = max(0.0, min(1.0, v))
        return 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055

    return int(round(gamma(r) * 255)), int(round(gamma(g) * 255)), int(round(gamma(b) * 255))


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], w: float = 0.16) -> tuple[int, int, int]:
    return (
        int(round(c1[0] * w + c2[0] * (1 - w))),
        int(round(c1[1] * w + c2[1] * (1 - w))),
        int(round(c1[2] * w + c2[2] * (1 - w))),
    )


def get_font(bold: bool, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "Nunito-ExtraBold.ttf" if bold else "Nunito-SemiBold.ttf"
    local_path = FONTS_DIR / filename
    if local_path.exists():
        try:
            return ImageFont.truetype(str(local_path), size)
        except Exception:
            pass
    return ImageFont.load_default()


def render_card(
    title: str,
    subtitle: str,
    badge_label: str,
    description: str,
    footer_text: str,
    iso_img_path: Path,
    wash_color_str: str,
    out_path: Path,
) -> None:
    # Canvas: Looms base-100 (#131418)
    img = Image.new("RGBA", (W, H), (19, 20, 24, 255))
    draw = ImageDraw.Draw(img)

    # Main Card surface: Looms base-200 (#1c1d24)
    card_box = (40, 40, W - 40, H - 40)
    draw.rounded_rectangle(card_box, radius=24, fill=(28, 29, 36, 255), outline=(255, 255, 255, 20), width=1)

    # Fonts
    font_title = get_font(bold=True, size=50)
    font_subtitle = get_font(bold=False, size=24)
    font_badge = get_font(bold=True, size=16)
    font_desc = get_font(bold=False, size=22)
    font_footer = get_font(bold=False, size=18)

    # Logo (top-left)
    logo_path = ROOT / "src/assets/looms-full.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((220, 70), Image.Resampling.LANCZOS)
        img.paste(logo, (80, 75), logo)

    # Compute wash and stage background
    wash_l, wash_c, wash_h = parse_oklch(wash_color_str)
    wash_rgb = oklch_to_rgb(wash_l, wash_c, wash_h)
    stage_bg = mix(wash_rgb, (23, 24, 31), 0.16)

    # Stage Box (Right)
    stage_box = (640, 64, 1136, 566)
    draw.rounded_rectangle(
        stage_box,
        radius=20,
        fill=(stage_bg[0], stage_bg[1], stage_bg[2], 255),
        outline=(255, 255, 255, 22),
        width=1,
    )

    # Real 3D isometric render
    if iso_img_path.exists():
        iso_img = Image.open(iso_img_path).convert("RGBA")
        bbox = iso_img.getbbox()
        if bbox:
            cropped = iso_img.crop(bbox)
            scale = min(360 / cropped.width, 360 / cropped.height)
            new_w, new_h = int(round(cropped.width * scale)), int(round(cropped.height * scale))
            scaled_iso = cropped.resize((new_w, new_h), resample=Image.Resampling.NEAREST)
            cx = (stage_box[0] + stage_box[2] - new_w) // 2
            cy = (stage_box[1] + stage_box[3] - new_h) // 2
            img.paste(scaled_iso, (cx, cy), scaled_iso)

    # Left Column: Badge
    badge_x, badge_y = 80, 175
    bw = int(draw.textlength(badge_label, font=font_badge) + 24)
    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + bw, badge_y + 30),
        radius=15,
        fill=(40, 41, 50, 255),
        outline=(255, 255, 255, 25),
        width=1,
    )
    draw.text((badge_x + 12, badge_y + 5), badge_label, font=font_badge, fill=(230, 228, 240, 240))

    # Title
    draw.text((80, 222), title, font=font_title, fill=(243, 241, 248, 255))

    # Subtitle / Creator
    if subtitle.startswith("by "):
        author = subtitle[3:]
        draw.text((80, 288), "by ", font=font_subtitle, fill=(150, 147, 165, 220))
        draw.text((115, 288), author, font=font_subtitle, fill=(168, 85, 247, 255))
    else:
        draw.text((80, 288), subtitle, font=font_subtitle, fill=(168, 85, 247, 255))

    # Description / Blurb
    lines = textwrap.wrap(description, width=34)
    ty = 345
    for line in lines[:3]:
        draw.text((80, ty), line, font=font_desc, fill=(176, 173, 188, 240))
        ty += 34

    # Footer
    draw.text((80, 520), footer_text, font=font_footer, fill=(130, 127, 145, 200))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)


def main() -> None:
    OG_PIECES_DIR.mkdir(parents=True, exist_ok=True)
    OG_DIR.mkdir(parents=True, exist_ok=True)

    seed_path = ROOT / "src/data/catalog-seed.json"
    if not seed_path.exists():
        print("Missing catalog-seed.json")
        return

    pieces = json.loads(seed_path.read_text())
    print(f"🎨 Generating {len(pieces)} authentic isometric piece cards...")

    for piece in pieces:
        p_id = piece["id"]
        iso_file = ISO_PIECES_DIR / f"{p_id}.png"
        meta_file = ISO_PIECES_DIR / f"{p_id}.json"

        wash_str = "oklch(0.91 0.04 85)"
        if meta_file.exists():
            try:
                wash_str = json.loads(meta_file.read_text()).get("wash", wash_str)
            except Exception:
                pass

        slot = piece.get("slot", "shirt")
        badge = SLOT_LABELS.get(slot, slot.upper())
        saves = piece.get("saved_count", 0)

        render_card(
            title=piece["name"],
            subtitle="by ser0th",
            badge_label=badge,
            description=piece.get("blurb", ""),
            footer_text=f"{saves} saves  ·  looms.gg",
            iso_img_path=iso_file,
            wash_color_str=wash_str,
            out_path=OG_PIECES_DIR / f"{p_id}.png",
        )

    print(f"✅ Generated {len(pieces)} piece cards in public/og/pieces/")

    # Outfit default card
    featured_iso = ISO_PIECES_DIR / "__featured_outfit.png"
    outfit_wash = "oklch(0.91 0.05 320)"
    render_card(
        title="Winter Explorer",
        subtitle="4 layers  ·  Curated Outfit",
        badge_label="OUTFIT",
        description="Winter coat, converse shoes, dark sweatpants, and ink fall hair. Wear in Studio or export to skin.",
        footer_text="Curated look  ·  looms.gg",
        iso_img_path=featured_iso,
        wash_color_str=outfit_wash,
        out_path=OG_DIR / "outfit-default.png",
    )
    print("✅ Generated public/og/outfit-default.png")

    # Main site banner
    render_card(
        title="Custom skins.",
        subtitle="No art skills needed.",
        badge_label="MINECRAFT CLOTHING",
        description="Mix and match modular clothing, hair, and accessories into custom Minecraft skins in 3D.",
        footer_text="Free to style, export, and wear  ·  looms.gg",
        iso_img_path=featured_iso,
        wash_color_str="oklch(0.91 0.05 280)",
        out_path=PUBLIC / "og-image.png",
    )
    print("✅ Generated public/og-image.png")


if __name__ == "__main__":
    main()
