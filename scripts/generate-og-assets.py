#!/usr/bin/env python3
"""Generate high-resolution (1200x630) Open Graph & Discord preview cards.

Uses the authentic 3D isometric renders from Three.js/skinview3d and the
looms design system (DESIGN.md): plaza-void/home surfaces, plaza-line
hairlines, Nunito 800 display type, cyan pill badges, cyan creator names.
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

# DESIGN.md tokens (hex equivalents of the plaza palette)
VOID = (18, 18, 20)        # plaza-void   #121214
HOME = (26, 26, 30)        # plaza-home   #1a1a1e
LINE = (62, 62, 68)        # plaza-line   #3e3e44
INK = (236, 236, 236)      # plaza-ink    #ececec
MUTED = (154, 154, 163)    # plaza-muted  #9a9aa3
CYAN = (10, 185, 240)      # mii-cyan     #0ab9f0

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


def with_alpha(c: tuple[int, int, int], a: int) -> tuple[int, int, int, int]:
    return (c[0], c[1], c[2], a)


def get_font(bold: bool, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "Nunito-ExtraBold.ttf" if bold else "Nunito-SemiBold.ttf"
    local_path = FONTS_DIR / filename
    if local_path.exists():
        try:
            return ImageFont.truetype(str(local_path), size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    label: str,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int, int],
    text_color: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] | None = None,
    pad_x: int = 18,
    pad_y: int = 9,
) -> tuple[int, int]:
    """Draws a 999px-radius pill starting at xy; returns its bottom-right corner.

    The label is centered using its real glyph bounding box (via textbbox),
    not the font's em box, so ascender/descender headroom can't leave the
    text sitting visibly high or low inside the pill.
    """
    x, y = xy
    tb = draw.textbbox((0, 0), label, font=font)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    box = (x, y, x + int(tw) + pad_x * 2, y + th + pad_y * 2)
    draw.rounded_rectangle(box, radius=(th + pad_y * 2) // 2, fill=fill, outline=outline, width=1)
    draw.text((x + pad_x - tb[0], y + pad_y - tb[1]), label, font=font, fill=text_color)
    return box[2], box[3]


def truncate_to_width(text: str, font, max_width: int) -> str:
    """Single-line ellipsis truncation to a pixel width."""
    if not text:
        return text
    probe = Image.new("RGBA", (8, 8))
    probe_draw = ImageDraw.Draw(probe)
    if probe_draw.textlength(text, font=font) <= max_width:
        return text
    while text and probe_draw.textlength(text + "…", font=font) > max_width:
        text = text[:-1]
    return text + "…"


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
    # Full-bleed plaza-void canvas — no inset "card in a card" frame.
    img = Image.new("RGBA", (W, H), with_alpha(VOID, 255))

    # Wash: a soft radial tint of the piece's own color, strongest behind the
    # stage so the render feels lit, not floating.
    wash_l, wash_c, wash_h = parse_oklch(wash_color_str)
    wash_rgb = oklch_to_rgb(wash_l, wash_c, wash_h)
    wash_alpha = Image.new("L", (W, H), 0)
    wash_draw = ImageDraw.Draw(wash_alpha)
    wash_draw.ellipse((640, -40, 1400, 720), fill=14)
    wash_draw.ellipse((-300, -300, 420, 420), fill=8)
    wash_layer = Image.new("RGBA", (W, H), with_alpha(wash_rgb, 255))
    img = Image.composite(wash_layer, img, wash_alpha)
    draw = ImageDraw.Draw(img)

    # Right stage: plaza-home tile, 18px radius, plaza-line hairline, cyan-tinted
    # floor glow under the render.
    stage_box = (656, 64, 1136, 566)
    stage_fill = mix(wash_rgb, HOME, 0.10)
    draw.rounded_rectangle(stage_box, radius=18, fill=with_alpha(stage_fill, 255), outline=with_alpha(LINE, 255), width=1)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((740, 420, 1052, 520), fill=with_alpha(mix(CYAN, wash_rgb, 0.5), 46))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Real 3D isometric render with a soft drop shadow
    if iso_img_path.exists():
        iso_img = Image.open(iso_img_path).convert("RGBA")
        bbox = iso_img.getbbox()
        if bbox:
            cropped = iso_img.crop(bbox)
            scale = min(340 / cropped.width, 340 / cropped.height)
            new_w, new_h = int(round(cropped.width * scale)), int(round(cropped.height * scale))
            scaled_iso = cropped.resize((new_w, new_h), resample=Image.Resampling.NEAREST)
            cx = (stage_box[0] + stage_box[2] - new_w) // 2
            cy = (stage_box[1] + stage_box[3] - new_h) // 2 - 6
            shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow)
            shadow_draw.ellipse(
                (cx + new_w // 2 - new_w // 2, cy + new_h - 14, cx + new_w, cy + new_h + 14),
                fill=(0, 0, 0, 90),
            )
            img = Image.alpha_composite(img, shadow)
            img.paste(scaled_iso, (cx, cy), scaled_iso)
            draw = ImageDraw.Draw(img)

    # Logo (top-left)
    logo_path = ROOT / "src/assets/looms-full.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((210, 66), Image.Resampling.LANCZOS)
        img.paste(logo, (72, 64), logo)
        draw = ImageDraw.Draw(img)

    # Fonts — Nunito hierarchy per DESIGN.md
    font_title = get_font(bold=True, size=58)
    font_badge = get_font(bold=True, size=16)
    font_creator = get_font(bold=True, size=26)
    font_desc = get_font(bold=False, size=23)
    font_footer = get_font(bold=True, size=18)

    # Slot pill — the design-system pill: cyan tint fill, cyan text, cyan hairline.
    bx, by = 72, 172
    pill_fill = with_alpha(mix(CYAN, VOID, 0.16), 255)
    pill_line = with_alpha(CYAN, 110)
    bx2, by2 = draw_pill(draw, (bx, by), badge_label, font_badge, pill_fill, with_alpha(CYAN, 255), outline=pill_line)

    # Optional second pill to the right (saves / layer count) — quiet neutral.
    extra = footer_text.split("  ·  ")[0] if "saves" in footer_text or "layers" in footer_text else None
    if extra:
        neutral_fill = with_alpha(HOME, 255)
        draw_pill(
            draw,
            (bx2 + 12, by),
            extra.upper(),
            font_badge,
            neutral_fill,
            with_alpha(MUTED, 255),
            outline=with_alpha(LINE, 255),
        )
        footer_text = "  ·  ".join(footer_text.split("  ·  ")[1:])

    # Title — plaza-ink, ExtraBold, tight leading. Single line, ellipsized to
    # stay clear of the stage tile.
    title = truncate_to_width(title, font_title, 640 - 72)
    draw.text((72, 228), title, font=font_title, fill=with_alpha(INK, 255))

    # Subtitle / creator — cyan, 700. Creator names are cyan per DESIGN.md.
    # Single line, ellipsized to stay clear of the stage tile.
    subtitle = truncate_to_width(subtitle, font_creator, 640 - 72)
    if subtitle.startswith("by "):
        author = subtitle[3:]
        draw.text((72, 306), "by ", font=font_creator, fill=with_alpha(MUTED, 255))
        by_w = draw.textlength("by ", font=font_creator)
        draw.text((72 + by_w, 306), author, font=font_creator, fill=with_alpha(CYAN, 255))
    else:
        draw.text((72, 306), subtitle, font=font_creator, fill=with_alpha(CYAN, 255))

    # Description — plaza-muted body, exactly 3 lines, last line ellipsized on
    # a word boundary if the blurb runs longer (never a silent cut-off).
    lines = textwrap.wrap(description or "", width=36)
    if len(lines) > 3:
        lines = lines[:3]
        lines[2] = truncate_to_width(lines[2].rstrip() + "…", font_desc, 640 - 72)
    ty = 366
    for line in lines:
        draw.text((72, ty), line, font=font_desc, fill=with_alpha(MUTED, 255))
        ty += 36

    # Footer — cyan looms dot + muted domain, sitting on a hairline rule.
    draw.line((72, 536, 560, 536), fill=with_alpha(LINE, 255), width=1)
    draw.ellipse((72, 556, 84, 568), fill=with_alpha(CYAN, 255))
    draw.text((96, 552), truncate_to_width(footer_text, font_footer, 640 - 96), font=font_footer, fill=with_alpha(MUTED, 255))

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

    generated = 0
    for piece in pieces:
        p_id = piece["id"]
        iso_file = ISO_PIECES_DIR / f"{p_id}.png"
        meta_file = ISO_PIECES_DIR / f"{p_id}.json"

        # No source render (the IsoThumb pipeline is client-side now) — keep the
        # last committed card instead of overwriting it with an empty stage.
        if not iso_file.exists():
            print(f"⚠️  Skipping {p_id}: no isometric render at {iso_file}")
            continue

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
        generated += 1

    print(f"✅ Generated {generated} piece cards in public/og/pieces/ ({len(pieces) - generated} kept)")

    # Outfit default card — used for /look, individual looks, and the home page.
    # scripts/bake-featured-look.mjs refreshes the render + sidecar each build
    # with the current #1 look. Without a fresh render we keep the committed
    # card rather than shipping an empty stage.
    featured_iso = ISO_PIECES_DIR / "__featured_outfit.png"
    featured_meta = ISO_PIECES_DIR / "__featured_outfit.json"

    if not featured_iso.exists():
        print("⚠️  No featured outfit render; keeping existing public/og/outfit-default.png")
    else:
        title = "Winter Explorer"
        subtitle = "4 layers  ·  Curated Outfit"
        description = "Winter coat, converse shoes, dark sweatpants, and ink fall hair. Wear in Studio or export to skin."
        outfit_wash = "oklch(0.91 0.05 320)"

        if featured_meta.exists():
            try:
                meta = json.loads(featured_meta.read_text())
                outfit_wash = meta.get("wash") or outfit_wash
                name = (meta.get("name") or "").strip()
                maker = (meta.get("maker") or "").strip()
                layers = meta.get("layers")
                if name:
                    title = name
                if layers:
                    subtitle = f"by {maker}  ·  {layers} layers" if maker else f"{layers} layers  ·  #1 today"
                blurb = (meta.get("description") or "").strip()
                description = blurb or (
                    f"{title} is the look the community is wearing most on looms right now. "
                    "Open it in Studio or export the skin."
                )
            except Exception:
                pass

        render_card(
            title=title,
            subtitle=subtitle,
            badge_label="OUTFIT",
            description=description,
            footer_text="Free to style, export, and wear  ·  looms.gg",
            iso_img_path=featured_iso,
            wash_color_str=outfit_wash,
            out_path=OG_DIR / "outfit-default.png",
        )
        print(f"✅ Generated public/og/outfit-default.png for “{title}”")


if __name__ == "__main__":
    main()
