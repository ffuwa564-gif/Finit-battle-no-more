"""Full HD proposal plates for STILLVEIL's myth-and-story design discussion.

The footer (y >= 930) is reserved for separately timed dialogue subtitles.
These are explanatory graphics, deliberately distinguished from shipped UI.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "artifacts/myth-lab"
WIDTH, HEIGHT = 1920, 1080
CONTENT_LEFT, CONTENT_RIGHT = 380, 1540
FONT_REGULAR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
WHITE = "#f4f1e9"
MUTED = "#b5c3d0"
GOLD = "#d8bd8c"
KINDS = {
    "lore": ("原典・物語のモチーフ", "#b6c9ec", "01"),
    "proposal": ("最初の提案", "#b9dfa8", "02"),
    "critique": ("反論・崩れる条件", "#efb7aa", "03"),
    "revision": ("修正版の仕組み", "#9ddbd7", "04"),
    "verdict": ("会議での評価", "#dfca94", "05"),
}


@lru_cache(maxsize=32)
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


@lru_cache(maxsize=1)
def content_maps() -> tuple[dict, dict]:
    content = json.loads((ARTIFACTS / "content.json").read_text())
    return ({c["id"]: c for c in content["characters"]}, {a["id"]: a for a in content["assets"]})


def wrap(text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    """Pixel-based Japanese wrapping; explicit newlines remain meaningful."""
    result: list[str] = []
    for paragraph in str(text).split("\n"):
        if not paragraph:
            result.append("")
        while paragraph:
            if face.getlength(paragraph) <= width:
                result.append(paragraph)
                break
            # Measuring every growing prefix is expensive for CJK shaping.
            # A binary search preserves the same pixel limit with O(log n)
            # measurements per line instead of one measurement per character.
            lower, upper = 1, len(paragraph)
            while lower < upper:
                middle = (lower+upper+1)//2
                if face.getlength(paragraph[:middle]) <= width:
                    lower = middle
                else:
                    upper = middle-1
            split = lower
            if split < len(paragraph) and paragraph[split] in "、。，．！？）」』】％%":
                split += 1
            result.append(paragraph[:split])
            paragraph = paragraph[split:]
    return result


def _resized_rgba(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


@lru_cache(maxsize=8)
def _fitted_file(path: str, width: int, height: int) -> Image.Image:
    # The official standing PNGs are large. Decode/crop/downsample each one once
    # per layout, rather than repeating that work for every phase in the video.
    with Image.open(path) as original:
        return _resized_rgba(original, width, height)


def _paste_fit(canvas: Image.Image, image: Image.Image, bounds: tuple[int, int, int, int]) -> None:
    x, y, w, h = bounds
    path = getattr(image, "filename", None)
    if path:
        image.close()
        image = _fitted_file(str(path), w, h)
    else:
        image = _resized_rgba(image, w, h)
    canvas.alpha_composite(image, (x + (w-image.width)//2, y+h-image.height))


@lru_cache(maxsize=24)
def _background(character_id: str) -> Image.Image:
    characters, assets = content_maps()
    character = characters.get(character_id)
    # A location-only chapter can name an existing background asset directly.
    # This avoids assigning a different character's portrait to the garden woman.
    asset = assets.get(character.get("artId", "")) if character else assets.get(character_id)
    if character_id and not character and not asset:
        raise ValueError("Unknown character or background asset ID: " + character_id)
    path = ROOT / "public" / asset["path"] if asset else None
    if path and path.exists():
        scene = Image.open(path).convert("RGB")
        scene = ImageOps.fit(scene, (WIDTH, HEIGHT), Image.Resampling.LANCZOS, centering=(.5, .30))
        scene = scene.filter(ImageFilter.GaussianBlur(15))
        scene = ImageEnhance.Brightness(scene).enhance(.27).convert("RGBA")
    else:
        scene = Image.new("RGBA", (WIDTH, HEIGHT), "#111d2b")
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (5, 13, 26, 95))
    scene = Image.alpha_composite(scene, tint)
    glow = Image.new("RGBA", scene.size)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-70, 260, 420, 1030), fill=(134, 184, 119, 22))
    gd.ellipse((1470, 260, 2010, 1030), fill=(210, 141, 186, 21))
    scene = Image.alpha_composite(scene, glow.filter(ImageFilter.GaussianBlur(80)))
    return scene


def _title(draw: ImageDraw.ImageDraw, text: str, y: int, color: str, *, maximum=54, reserve=0) -> int:
    width = CONTENT_RIGHT-CONTENT_LEFT-88-reserve
    size = maximum
    while size > 36 and font(size, True).getlength(text) > width:
        size -= 1
    lines = wrap(text, font(size, True), width)
    if len(lines) > 2:
        raise ValueError("Title is too long for a readable plate: " + text)
    for line in lines:
        draw.text((CONTENT_LEFT+44, y), line, font=font(size, True), fill=color)
        y += size+11
    return y


def _arrow(draw: ImageDraw.ImageDraw, x1: int, x2: int, y: int, color: str) -> None:
    draw.line((x1, y, x2-8, y), fill=color, width=3)
    draw.polygon([(x2, y), (x2-12, y-8), (x2-12, y+8)], fill=color)


def draw_plate(chapter: dict[str, Any], phase: dict[str, Any], output_path: str | Path) -> Path:
    """Draw one proposal state; chapter/phase text must already be editorially reviewed.

    chapter: id, title, character_id, source_short, source_url, label.
      Optional: eyebrow, verdict (short display label).
    phase: kind, title, bullets (up to four concise strings), nodes (0..4 dicts).
      Each node has title, optional value and optional CSS-style color.
      Optional: kicker (short explanation above the node diagram), note.
    `source_url` is preserved by the caller for the source list, not printed long-form.
    Raises ValueError rather than silently dropping or clipping editorial content.
    """
    kind = phase.get("kind", "proposal")
    if kind not in KINDS:
        raise ValueError(f"Unknown plate kind: {kind}")
    kind_label, accent, step = KINDS[kind]
    nodes = phase.get("nodes", [])
    bullets = phase.get("bullets", [])
    if len(nodes) > 4:
        raise ValueError("Use at most four diagram nodes per plate")
    if len(bullets) > 4:
        raise ValueError("Use at most four bullets per plate")
    scene = _background(chapter.get("character_id", "")).copy()
    draw = ImageDraw.Draw(scene)

    # One clearly persistent status marker, not a screenshot of a live skill UI.
    draw.text((45, 28), "STILLVEIL  /  MYTH & MEMORY", font=font(30, True), fill=GOLD)
    draw.rounded_rectangle((1323, 23, 1874, 83), radius=14, fill="#273327", outline="#99b49b", width=1)
    draw.text((1350, 34), "次期アップデート企画 ／ 未実装", font=font(29, True), fill="#d4e9c6")
    draw.line((45, 106, 1874, 106), fill="#87795f", width=1)

    # Cast is separate from the content plane and does not cover diagrams.
    draw.text((53, 168), "ずんだもん", font=font(37, True), fill="#b5df93")
    draw.text((57, 220), "発想・ひらめき担当", font=font(25), fill=MUTED)
    draw.text((1610, 168), "四国めたん", font=font(37, True), fill="#efbfd8")
    draw.text((1614, 220), "批評・整理担当", font=font(25), fill=MUTED)
    _paste_fit(scene, Image.open(ARTIFACTS / "assets/zunmon003.png"), (17, 300, 335, 618))
    _paste_fit(scene, Image.open(ARTIFACTS / "assets/met012.png"), (1570, 320, 335, 598))

    # Main title strip and source line.
    draw.rounded_rectangle((CONTENT_LEFT, 140, CONTENT_RIGHT, 302), radius=21,
                           fill=(10, 20, 35, 228), outline="#5c6979", width=1)
    label = chapter.get("label", "DESIGN NOTE")
    chapter_id = str(chapter.get("id", ""))
    eyebrow = chapter.get("eyebrow", f"{chapter_id.upper()}  /  {label}")
    draw.text((CONTENT_LEFT+44, 155), eyebrow, font=font(25, True), fill=accent)
    characters, assets = content_maps()
    character = characters.get(chapter.get("character_id", ""))
    portrait_asset = assets.get(character.get("portraitId", "")) if character else None
    portrait_path = ROOT / "public" / portrait_asset["path"] if portrait_asset else None
    has_portrait = bool(portrait_path and portrait_path.exists() and chapter.get("show_portrait", True))
    title_y = _title(draw, chapter.get("title", ""), 193, WHITE, maximum=49,
                     reserve=146 if has_portrait else 0)
    if has_portrait:
        # A small current-game portrait identifies the subject, while the large
        # discussion area remains an explicitly unimplemented explanatory plate.
        portrait = ImageOps.fit(Image.open(portrait_path).convert("RGBA"), (112, 112),
                                Image.Resampling.LANCZOS, centering=(.5, .28))
        mask = Image.new("L", (112, 112))
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 111, 111), radius=14, fill=255)
        portrait.putalpha(mask)
        scene.alpha_composite(portrait, (CONTENT_RIGHT-138, 165))
        draw.rounded_rectangle((CONTENT_RIGHT-138, 165, CONTENT_RIGHT-27, 276),
                               radius=14, outline=accent, width=1)
    if title_y > 265:
        # Keep a long title readable without letting it collide with the source line.
        raise ValueError("Chapter title needs a shorter display form: " + chapter.get("title", ""))
    source = chapter.get("source_short", "出典・調査資料は概要欄へ")
    source_font = font(25)
    if source_font.getlength(source) > (918 if has_portrait else 1058):
        raise ValueError("Use a short source citation, not the full URL")
    draw.text((CONTENT_LEFT+44, 263), source, font=source_font, fill=MUTED)

    # Phase progress makes proposal -> criticism -> revision legible in a long video.
    labels = list(KINDS)
    progress_y = 329
    for i, key in enumerate(labels):
        px = CONTENT_LEFT+44+i*218
        color = KINDS[key][1] if key == kind else "#6d7d8f"
        draw.line((px, progress_y, px+174, progress_y), fill=color, width=4 if key == kind else 1)
        small = {"lore":"由来", "proposal":"提案", "critique":"反論", "revision":"修正", "verdict":"評価"}[key]
        draw.text((px, progress_y+9), small, font=font(25, key == kind), fill=color)

    draw.rounded_rectangle((CONTENT_LEFT, 380, CONTENT_RIGHT, 690), radius=22,
                           fill=(11, 22, 38, 240), outline="#3c4d63", width=1)
    # The phase heading is short enough to stay on one line at 36+ px.
    heading = phase.get("title", kind_label)
    heading_size = 42
    while heading_size > 36 and font(heading_size, True).getlength(heading) > 1065:
        heading_size -= 1
    if font(heading_size, True).getlength(heading) > 1065:
        raise ValueError("Shorten the phase heading: " + heading)
    draw.text((CONTENT_LEFT+44, 397), heading, font=font(heading_size, True), fill=accent)
    body_size = 36
    body_lines = [wrap(str(t), font(body_size), 1024) for t in bullets]
    if sum(map(len, body_lines)) > 5:
        body_size = 32
        body_lines = [wrap(str(t), font(body_size), 1024) for t in bullets]
    count = sum(map(len, body_lines))
    if count > 5:
        raise ValueError("Plate body exceeds five readable lines; split the phase")
    y = 462
    for lines in body_lines:
        draw.ellipse((CONTENT_LEFT+46, y+16, CONTENT_LEFT+54, y+24), fill=accent)
        for line in lines:
            draw.text((CONTENT_LEFT+74, y), line, font=font(body_size), fill=WHITE)
            y += body_size+9
        y += 4

    # Flow diagrams use bounded, named states rather than apparent live HP results.
    kicker = phase.get("kicker", "説明図・数値は仮")
    draw.text((CONTENT_LEFT+8, 711), kicker, font=font(26, True), fill=accent)
    if nodes:
        available = CONTENT_RIGHT-CONTENT_LEFT
        gap = 36
        node_width = (available-gap*(len(nodes)-1))//len(nodes)
        top, bottom = 758, 882
        for i, node in enumerate(nodes):
            x = CONTENT_LEFT+i*(node_width+gap)
            nc = node.get("color", accent)
            draw.rounded_rectangle((x, top, x+node_width, bottom), radius=18,
                                   fill="#18273a", outline=nc, width=2)
            title = str(node.get("title", ""))
            title_lines = wrap(title, font(32, True), node_width-26)
            value = str(node.get("value", ""))
            if len(title_lines) > 2:
                raise ValueError("Shorten a diagram node title: " + title)
            yy = top+(6 if len(title_lines) == 2 and value else 12)
            for line in title_lines:
                draw.text((x+(node_width-font(32, True).getlength(line))/2, yy), line,
                          font=font(32, True), fill=WHITE)
                yy += 34 if len(title_lines) == 2 and value else 38
            if value:
                value_size = 34
                while value_size > 32 and font(value_size, True).getlength(value) > node_width-24:
                    value_size -= 1
                vf = font(value_size, True)
                if vf.getlength(value) > node_width-24:
                    raise ValueError("Shorten a diagram node value: " + value)
                draw.text((x+(node_width-vf.getlength(value))/2, bottom-47), value, font=vf, fill=nc)
            if i+1 < len(nodes):
                _arrow(draw, x+node_width+7, x+node_width+gap-7, (top+bottom)//2, accent)
    note = phase.get("note", "企画会議の評価は、開発・採用の決定ではありません")
    if font(24).getlength(note) > 1160:
        raise ValueError("Shorten the plate note")
    draw.text((CONTENT_LEFT+5, 893), note, font=font(24), fill=MUTED)

    # The subtitle zone remains intentionally empty for the edit pipeline.
    draw.rectangle((0, 930, WIDTH, HEIGHT), fill="#080f1b")
    draw.line((45, 931, 1875, 931), fill="#5e6b7b", width=1)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    scene.convert("RGB").save(output_path)
    return output_path


if __name__ == "__main__":
    preview = ARTIFACTS / "preview"
    chapter = {
        "id": "04", "title": "ヘカテ — 三叉路で一手を待つ", "character_id": "hecate",
        "source_short": "『デメテル讃歌』：松明・捜索・証言の限界", "source_url": "https://www.gutenberg.org/ebooks/348",
        "label": "SKILL IDEA",
    }
    draw_plate(chapter, {"kind":"proposal", "title":"今すぐ撃つか、ラウンド末まで待つか",
        "bullets":["先頭の一手を、そのラウンドの末尾へ送る。", "行動回数は増えず、回復が間に合わない危険もある。", "待っている間に倒れたら、その一手は失われる。"],
        "nodes":[{"title":"先頭の一手","value":"待機"},{"title":"敵味方が行動","value":"被弾も起きる"},{"title":"R末に実行","value":"追加行動なし"}]}, preview/"hecate-proposal.png")
    draw_plate(chapter, {"kind":"critique", "title":"「最後なら安全」にはならない",
        "bullets":["敵の攻撃より前に回復したい場面では、逆効果。", "待機を解除して何度も選び直す操作は認めない。", "石の追撃や必殺まで再実行すると、閉路が生まれる。"],
        "nodes":[{"title":"回復を後回し","value":"先に被弾"},{"title":"対象が倒れる","value":"治療不能"},{"title":"機会を失う","value":"判断の代償"}]}, preview/"hecate-critique.png")
    draw_plate({"id":"13", "title":"リオラ — 帰る者へ順番を譲る", "character_id":"liora",
        "source_short":"ゲーム内の物語：「命令より、帰る者を守る。」", "label":"LEADER IDEA"},
        {"kind":"revision", "title":"行動の追加ではなく、既存の順番を交換する",
         "bullets":["まだ動いていない味方一人を、自分の順番へ招く。", "リオラの行動は相手の元の位置へ。総数は変わらない。", "行動済み・戦闘不能の相手は対象にできない。"],
         "nodes":[{"title":"リオラの順番","value":"譲渡"},{"title":"未行動の味方","value":"先に動く"},{"title":"元の位置","value":"リオラが動く"}]}, preview/"liora-revision.png")
    print(preview)
