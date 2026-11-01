"""Render the unimplemented myth-skill discussion as Full HD narrated plates.

The original game SE are used quietly as editorial transitions, not as proof
that any proposed skill has been implemented. BGM is added once to the final
concatenation, so it remains continuous across chapters.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess
import wave

import numpy as np
from PIL import Image

from visuals import draw_plate

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/athena-council"
RENDER = OUT / "render"
ASSETS = OUT / "assets"
RENDER.mkdir(parents=True, exist_ok=True)
CRF = 28
WIDTH, HEIGHT, FPS = 1920, 1080, 30
SAMPLE_RATE = 24000
SFX_SOURCE = ROOT/"artifacts/diary-111/capture/rewind.mp4"
SFX_METADATA = SFX_SOURCE.with_suffix(".json")


def ffmpeg(*args: str) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "error", "-xerror", "-y", *map(str, args)], check=True)


def probe(path: str | Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
    ]))


def duration(path: str | Path) -> float:
    return float(probe(path)["format"]["duration"])


def complete_render(path: str | Path, expected: float) -> bool:
    path = Path(path)
    if not path.exists():
        return False
    try:
        data = probe(path)
        video = next(s for s in data["streams"] if s["codec_type"] == "video")
        return (abs(float(data["format"]["duration"])-expected) <= .15
                and video["width"] == WIDTH and video["height"] == HEIGHT
                and video["r_frame_rate"] == "30/1"
                and any(s["codec_type"] == "audio" for s in data["streams"]))
    except (subprocess.CalledProcessError, KeyError, StopIteration, ValueError):
        return False


def _read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as stream:
        if stream.getframerate() != SAMPLE_RATE or stream.getsampwidth() != 2:
            raise ValueError(f"Expected 24 kHz 16-bit PCM: {path}")
        channels = stream.getnchannels()
        signal = np.frombuffer(stream.readframes(stream.getnframes()), dtype="<i2").astype(np.float32)/32768
    if channels > 1:
        signal = signal.reshape(-1, channels).mean(axis=1)
    return signal


def ensure_editorial_sfx() -> dict[str, Path]:
    """Extract isolated, current-game UI/guard cues using the capture clock."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    paths = {"ui": ASSETS/"ui-native.wav", "guard": ASSETS/"guard-native.wav"}
    if all(p.exists() for p in paths.values()):
        return paths
    if not SFX_SOURCE.exists() or not SFX_METADATA.exists():
        raise FileNotFoundError("Provide assets/ui-native.wav and guard-native.wav, or the original native echo capture")
    meta = json.loads(SFX_METADATA.read_text())
    clock_offset = float(meta.get("initialOffset", 0))
    events = meta["events"]
    ui = next(float(e["time"]) for e in events if e.get("kind") == "select")
    guard = next(float(e["time"]) for e in events if e.get("kind") == "guard")
    segments = {"ui": (ui-clock_offset, .15), "guard": (guard-clock_offset, .90)}
    for key, (start, length) in segments.items():
        if paths[key].exists():
            continue
        ffmpeg("-ss", max(0, start), "-i", SFX_SOURCE, "-t", length,
               "-vn", "-ac", "1", "-ar", SAMPLE_RATE, "-c:a", "pcm_s16le", paths[key])
    (ASSETS/"editorial-se.json").write_text(json.dumps({
        "source": "STILLVEIL native application audio capture, game commit dec20eb",
        "originalCapture": str(SFX_SOURCE), "captureClockOffset": clock_offset,
        "segments": segments, "usage": "Quiet editorial chapter/phase cues; not newly implemented skill audio."
    }, ensure_ascii=False, indent=2))
    return paths


def phase_changes(chapter: dict) -> list[dict]:
    """Preserve the spoken sequence, including a return to an earlier phase."""
    lines = chapter["lines"]
    if not lines:
        raise ValueError("Cannot render a chapter without dialogue")
    changes = [{"phase": int(lines[0].get("phase", 0)), "time": 0.0}]
    for line in lines[1:]:
        index = int(line.get("phase", 0))
        if index != changes[-1]["phase"]:
            changes.append({"phase": index, "time": max(0, float(line["start"])-float(chapter["start"]))})
    return changes


def plate_timeline(chapter: dict) -> Path:
    """ffconcat of still plates and three .05 s blend frames per transition."""
    ident = chapter["id"]
    phases = chapter["phases"]
    paths: dict[int, Path] = {}
    for index, phase in enumerate(phases):
        path = RENDER/f"{ident}-phase{index}.png"
        try:
            draw_plate(chapter, phase, path)
        except ValueError as exc:
            raise ValueError(f"{ident}, phase {index}: {exc}") from exc
        paths[index] = path
    changes = phase_changes(chapter)
    segments: list[tuple[Path, float]] = []
    cursor = 0.0
    previous = changes[0]["phase"]
    if previous not in paths:
        raise ValueError(f"Unknown phase {previous} in chapter {ident}")
    for number, change in enumerate(changes[1:], 1):
        current = change["phase"]
        if current not in paths:
            raise ValueError(f"Unknown phase {current} in chapter {ident}")
        end = float(change["time"])
        fade = min(.15, max(0.0, end-cursor))
        if end-cursor-fade > .001:
            segments.append((paths[previous], end-cursor-fade))
        before = Image.open(paths[previous]).convert("RGB")
        after = Image.open(paths[current]).convert("RGB")
        for i, fraction in enumerate((.25, .50, .75)):
            path = RENDER/f"{ident}-transition{number}-{i}.png"
            Image.blend(before, after, fraction).save(path)
            segments.append((path, fade/3))
        previous = current
        cursor = end
    segments.append((paths[previous], max(.001, float(chapter["duration"])-cursor)))
    concat = RENDER/f"{ident}-plates.ffconcat"
    # PNG image demuxers use a 1/25 time base; fps=30 below produces the target
    # stream. The final -t prevents cumulative container rounding from drifting.
    text = "ffconcat version 1.0\n"
    for path, hold in segments:
        if hold <= 0:
            continue
        text += f"file '{path.name}'\nduration {hold:.7f}\n"
    text += f"file '{paths[previous].name}'\n"
    concat.write_text(text)
    (RENDER/f"{ident}-visual-timeline.json").write_text(json.dumps({
        "chapterId": ident, "duration": chapter["duration"], "changes": changes,
        "crossfadeSeconds": .15, "unimplemented": True,
    }, ensure_ascii=False, indent=2))
    return concat


def mix_chapter_audio(chapter: dict) -> Path:
    ident = chapter["id"]
    sfx_paths = ensure_editorial_sfx()
    ui, guard = _read_wav(sfx_paths["ui"]), _read_wav(sfx_paths["guard"])
    # Short fades avoid a cut in the isolated recording becoming an extra click.
    for signal in (ui, guard):
        fade = min(int(.004*SAMPLE_RATE), len(signal)//3)
        if fade:
            signal[:fade] *= np.linspace(0, 1, fade)
            signal[-fade:] *= np.linspace(1, 0, fade)
    total = math.ceil((float(chapter["duration"])+.05)*SAMPLE_RATE)
    mix = np.zeros(total, dtype=np.float32)
    for line in chapter["lines"]:
        signal = _read_wav(ROOT/line["wav"])
        start = round((float(line["start"])-float(chapter["start"]))*SAMPLE_RATE)
        if start < 0 or start+len(signal) > len(mix):
            raise ValueError(f"Speech outside chapter bounds: {ident}, {line['text']}")
        mix[start:start+len(signal)] += signal*.86
    for n, change in enumerate(phase_changes(chapter)):
        kind = chapter["phases"][change["phase"]].get("kind")
        signal = guard if kind == "verdict" else ui
        gain = .12 if kind == "verdict" else .17
        start = round((float(change["time"])+(.12 if n == 0 else 0))*SAMPLE_RATE)
        signal = signal[:max(0, len(mix)-start)]
        mix[start:start+len(signal)] += signal*gain
    peak = float(np.abs(mix).max())
    if peak > .91:
        mix *= .91/peak
    path = RENDER/f"{ident}-dialogue.wav"
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes((mix*32767).astype("<i2").tobytes())
    return path


def _ass_time(seconds: float) -> str:
    centiseconds = max(0, round(seconds*100))
    s, cs = divmod(centiseconds, 100)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02}:{s:02}.{cs:02}"


def _caption_pages(text: str) -> list[str]:
    """No silent truncation: very long utterances receive proportionate pages."""
    text = str(text).replace("\n", " ").replace("\\", "＼").replace("{", "｛").replace("}", "｝")
    pages = []
    while len(text) > 60:
        cut = max(text.rfind(mark, 25, 60) for mark in "。！？、")
        if cut < 25:
            cut = 56
        else:
            cut += 1
        pages.append(text[:cut])
        text = text[cut:]
    if text:
        pages.append(text)
    return pages


def _two_lines(text: str) -> str:
    if len(text) <= 30:
        return text
    middle = len(text)//2
    # Keep two lines within the footer while avoiding splits such as 使 / う or
    # リー / ダー. Phrase particles are a useful fallback when there is no comma.
    candidates = range(max(10, len(text)-34), min(31, len(text)-10)+1)
    def score(index: int) -> float:
        left, right = text[index-1], text[index]
        distance = abs(index-middle)
        if left in "。！？、":
            return distance-8
        if right in "、。，．！？）」』】":
            return distance+40
        if left in "はがをにもでとへや":
            return distance-2
        katakana = lambda c: "ァ" <= c <= "ヿ" or c == "ー"
        hiragana = lambda c: "ぁ" <= c <= "ゖ"
        kanji = lambda c: "一" <= c <= "鿿"
        if katakana(left) and katakana(right):
            return distance+20
        if hiragana(right) and (hiragana(left) or kanji(left)):
            return distance+12
        return distance
    split = min(candidates, key=score)
    return text[:split]+r"\N"+text[split:]


def subtitles(chapter: dict) -> Path:
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Z,Noto Sans CJK JP,50,&H00F5FFF0,&H000000FF,&H00212A18,&H50000000,1,0,0,0,100,100,0,0,1,3,1,2,65,65,25,1
Style: M,Noto Sans CJK JP,50,&H00FFF4FB,&H000000FF,&H002F1A2C,&H50000000,1,0,0,0,100,100,0,0,1,3,1,2,65,65,25,1
Style: U,Noto Sans CJK JP,50,&H00EAF0FF,&H000000FF,&H00221A30,&H50000000,1,0,0,0,100,100,0,0,1,3,1,2,65,65,25,1
Style: Cue,Noto Sans CJK JP,10,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    zero = float(chapter["start"])
    for line in chapter["lines"]:
        who = {"z":"Z","m":"M","u":"U"}[line["speaker"]]
        name = {"Z":"ずんだもん","M":"めたん","U":"中国うさぎ"}[who]
        color = {"Z":"&H0093DFB5&","M":"&H00D8BFEF&","U":"&H00C1C9FF&"}[who]
        begin, end = float(line["start"])-zero, float(line["end"])-zero
        pages = _caption_pages(line["text"])
        weight = sum(map(len, pages))
        t = begin
        for page in pages:
            length = (end-begin)*len(page)/weight
            text = r"{\fs28\c"+color+"}"+name+r"{\r"+who+r"}\h\h"+_two_lines(page)
            header += f"Dialogue: 2,{_ass_time(t)},{_ass_time(t+length)},{who},,0,0,0,,{text}\n"
            t += length
        # A small active-speaker underline, independent of the subtitle footer.
        x = 35 if who in {"Z","M"} else 1600
        width = 260 if who in {"Z","M"} else 275
        bar_y = {"Z":211,"M":581,"U":265}[who]
        bar = r"{\an7\pos("+f"{x},{bar_y}"+r")\p1\bord0\shad0\fad(70,70)\c"+color+r"}m 0 0 l "+str(width)+r" 0 l "+str(width)+r" 4 l 0 4"
        header += f"Dialogue: 1,{_ass_time(begin)},{_ass_time(end)},Cue,,0,0,0,,{bar}\n"
    path = RENDER/f"{chapter['id']}.ass"
    path.write_text(header)
    return path


def render_chapter(chapter: dict, *, crf: int = CRF, force: bool = False) -> Path:
    ident = chapter["id"]
    expected = float(chapter["duration"])
    destination = RENDER/f"{ident}.mp4"
    if not force and complete_render(destination, expected):
        return destination
    plates = plate_timeline(chapter)
    audio = mix_chapter_audio(chapter)
    ass = subtitles(chapter)
    temporary = RENDER/f"{ident}.rendering.mp4"
    graph = f"[0:v]fps=30,setsar=1,ass={ass}[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[a]"
    ffmpeg("-filter_complex_threads", "1", "-safe", "0", "-f", "concat", "-i", plates,
           "-i", audio, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
           "-t", expected, "-r", FPS, "-c:v", "libx264", "-threads", "2",
           "-preset", "veryfast", "-crf", crf, "-g", "300", "-keyint_min", "30",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
           "-movflags", "+faststart", temporary)
    if not complete_render(temporary, expected):
        raise RuntimeError(f"Incomplete chapter render: {ident}")
    temporary.replace(destination)
    print(f"RENDERED {ident}: {expected:.3f}s, {destination.stat().st_size} bytes", flush=True)
    return destination


render = render_chapter


def concatenate(chapters: list[dict], destination: str | Path | None = None) -> Path:
    paths = [RENDER/f"{ch['id']}.mp4" for ch in chapters]
    for ch, path in zip(chapters, paths):
        if not complete_render(path, float(ch["duration"])):
            raise RuntimeError(f"A complete chapter is required before concatenation: {path}")
    expected = sum(duration(path) for path in paths)
    destination = Path(destination or OUT/"STILLVEIL-Athena-Council-1080p.mp4")
    temporary = destination.with_name(destination.stem+".rendering.mp4")
    concat = RENDER/("preview-chapters.txt" if len(chapters) == 2 else "chapters.txt")
    concat.write_text("".join(f"file '{path.name}'\n" for path in paths))
    graph = (f"[0:a]aformat=sample_rates=48000:channel_layouts=stereo[dialogue];"
             f"[1:a]volume=0.04,afade=t=in:d=1,afade=t=out:st={max(0, expected-2)}:d=2[bgm];"
             "[dialogue][bgm]amix=inputs=2:duration=first:normalize=0,"
             "loudnorm=I=-16:TP=-2.5:LRA=11[a]")
    ffmpeg("-filter_complex_threads", "1", "-safe", "0", "-f", "concat", "-i", concat,
           "-stream_loop", "-1", "-i", ROOT/"public/audio/fjordnosundakaze.mp3",
           "-filter_complex", graph, "-map", "0:v", "-map", "[a]", "-t", expected,
           "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
           "-threads", "2", "-movflags", "+faststart", temporary)
    actual = duration(temporary)
    if abs(actual-expected) > .3:
        raise RuntimeError(f"Incomplete final concatenation: expected {expected}, got {actual}")
    temporary.replace(destination)
    (RENDER/(destination.stem+"-manifest.json")).write_text(json.dumps({
        "duration": actual, "expectedDuration": expected,
        "bytes": destination.stat().st_size, "chapterIds": [c["id"] for c in chapters],
        "dimensions": [WIDTH, HEIGHT], "frameRate": FPS,
        "master": {"loudnessTargetLUFS": -16, "truePeakTargetDB": -2.5},
        "proposalStatus": "Proposed mechanics are unimplemented; current-rule evidence and toy models are labeled separately."
    }, ensure_ascii=False, indent=2))
    print(f"FINAL {destination}: {actual:.3f}s, {destination.stat().st_size} bytes", flush=True)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chapter", help="Render one chapter ID")
    parser.add_argument("--partial", action="store_true", help="Read the incremental narration manifest")
    parser.add_argument("--preview-two", action="store_true", help="Render/concatenate only the first two available chapters")
    parser.add_argument("--force", action="store_true", help="Replace a complete cached chapter render")
    parser.add_argument("--crf", type=int, default=CRF)
    args = parser.parse_args()
    manifest_path = OUT/("narration-partial.json" if args.partial else "narration.json")
    document = json.loads(manifest_path.read_text())
    chapters = document["chapters"]
    if args.preview_two:
        if len(chapters) < 2:
            raise SystemExit("Two complete narration chapters are required for the preview")
        chapters = chapters[:2]
    if args.chapter:
        chapters = [ch for ch in chapters if ch["id"] == args.chapter]
        if not chapters:
            raise SystemExit("Requested chapter is not yet available in the narration manifest")
    for ch in chapters:
        render_chapter(ch, crf=args.crf, force=args.force)
    if args.preview_two:
        concatenate(chapters, OUT/"STILLVEIL-Athena-Council-Preview-2Chapters-1080p.mp4")
    elif not args.partial and not args.chapter:
        concatenate(chapters)


if __name__ == "__main__":
    main()
