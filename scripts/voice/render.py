#!/usr/bin/env python3
"""Pre-render the Director narration in DB's cloned voice (Chatterbox on MLX).

Run inside the venv:  $VOICE_HOME/.venv-mlx/bin/python scripts/voice/render.py [options]

Reads scripts/voice/lines.json ([{id, text}]), renders N takes per line, keeps the
take whose pace is closest to a calm reading, and writes public/voice/<id>.mp3,
public/voice/manifest.json and a QA report (in $VOICE_HOME, not in the repo).
Lines that already have an mp3 are skipped unless --force.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import soundfile as sf

REPO = Path(__file__).resolve().parents[2]
VOICE_HOME = Path(os.environ.get(
    "VOICE_HOME",
    "/private/tmp/claude-501/-Users-db-Burnes-Center-Fulltime-ME/2d0e1ee7-52d8-489a-b564-da766d0888ce/scratchpad/voice",
))
MODEL_ID = "mlx-community/chatterbox-fp16"
SAMPLE_RATE = 24000
TARGET_LUFS = -16
TRUE_PEAK_DB = -1.5
FADE_SEC = 0.12
CHUNK_CHARS = 220          # longer lines are split at sentence boundaries
CHUNK_GAP_SEC = 0.22
CALM_WPS = 2.6             # words per second of an unhurried read
WPS_OK = (1.8, 3.4)        # outside this range the take is flagged
CLIP_PEAK = 0.98
PLACEHOLDER_LINES = [
    {"id": "placeholder-1", "text": "Welcome. I will walk you through the work, one project at a time."},
    {"id": "placeholder-2", "text": "This one shipped end to end, and it is still running today."},
    {"id": "placeholder-3", "text": "The interesting part was not the model. It was making it fail kindly."},
    {"id": "placeholder-4", "text": "Small team, real users, and a lot of careful boring work."},
    {"id": "placeholder-5", "text": "That is the tour. Ask me anything, or open any project to go deeper."},
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--lines", type=Path, default=REPO / "scripts/voice/lines.json")
    p.add_argument("--ref", type=Path, default=VOICE_HOME / "ref/ref_prompt.wav", help="cloning prompt wav")
    p.add_argument("--out", type=Path, default=REPO / "public/voice", help="where the mp3s and manifest go")
    p.add_argument("--only", nargs="+", metavar="ID", help="render only these ids (implies --force for them)")
    p.add_argument("--force", action="store_true", help="re-render lines that already have an mp3")
    p.add_argument("--takes", type=int, default=2, help="takes per line, best one is kept (default 2)")
    p.add_argument("--exaggeration", type=float, default=0.35, help="emotion, 0.25 flat to 0.6 lively (default 0.35)")
    p.add_argument("--cfg", type=float, default=0.3, help="cfg weight, lower is slower and calmer (default 0.3)")
    p.add_argument("--temperature", type=float, default=0.7, help="sampling temperature (default 0.7)")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--bitrate", default="80k", help="mp3 bitrate, 64k to 96k (default 80k)")
    p.add_argument("--limit", type=int, help="render only the first N pending lines (for tests)")
    p.add_argument("--voice-name", default="DB clone")
    return p.parse_args()


def load_lines(path: Path) -> list[dict]:
    if not path.exists():
        print(f"{path} not found, using {len(PLACEHOLDER_LINES)} placeholder lines", file=sys.stderr)
        return PLACEHOLDER_LINES
    lines = json.loads(path.read_text())
    bad = [l for l in lines if not (isinstance(l, dict) and l.get("id") and l.get("text"))]
    if bad:
        sys.exit(f"{path}: every entry needs an id and text, bad entry: {bad[0]!r}")
    return lines


def speakable(text: str) -> str:
    text = re.sub(r"[*_`#]", "", text)
    text = re.sub(r"\s*[—–]\s*", ", ", text)
    return re.sub(r"\s+", " ", text).strip()


def chunk_text(text: str) -> list[str]:
    if len(text) <= CHUNK_CHARS:
        return [text]
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    for s in sentences:
        if chunks and len(chunks[-1]) + len(s) + 1 <= CHUNK_CHARS:
            chunks[-1] = f"{chunks[-1]} {s}"
        else:
            chunks.append(s)
    return chunks


def ffmpeg(args: list[str]) -> str:
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"ffmpeg failed: {proc.stderr[-600:]}")
    return proc.stderr


TRIM = (
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,"
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse"
)


def postprocess(wav: np.ndarray, mp3_path: Path, bitrate: str) -> dict:
    """Trim silence, two-pass loudnorm to -16 LUFS, 120 ms fades, mono mp3."""
    with tempfile.TemporaryDirectory() as tmp:
        raw, trimmed = Path(tmp) / "raw.wav", Path(tmp) / "trimmed.wav"
        sf.write(raw, wav, SAMPLE_RATE, subtype="PCM_16")
        ln = f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK_DB}:LRA=11"
        log = ffmpeg(["-i", str(raw), "-af", f"{TRIM},{ln}:print_format=json", "-f", "null", "-"])
        m = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
        norm = (f"{ln}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        ffmpeg(["-i", str(raw), "-af", f"{TRIM},{norm}", "-ar", str(SAMPLE_RATE), str(trimmed)])
        audio, _ = sf.read(trimmed)
        dur = len(audio) / SAMPLE_RATE
        fade = f"afade=t=in:d={FADE_SEC},afade=t=out:st={max(dur - FADE_SEC, 0):.3f}:d={FADE_SEC}"
        mp3_path.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg(["-i", str(trimmed), "-af", fade, "-ac", "1", "-c:a", "libmp3lame", "-b:a", bitrate, str(mp3_path)])
    return {"durationSec": round(dur, 2), "peak": round(float(np.max(np.abs(audio))), 3)}


def synthesize(model, conds, text: str, args: argparse.Namespace, seed: int) -> np.ndarray:
    import mlx.core as mx

    parts = []
    gap = np.zeros(int(CHUNK_GAP_SEC * SAMPLE_RATE), dtype=np.float32)
    for i, chunk in enumerate(chunk_text(text)):
        mx.random.seed(seed + i)
        results = list(model.generate(
            chunk, conds=conds, exaggeration=args.exaggeration, cfg_weight=args.cfg,
            temperature=args.temperature, verbose=False,
        ))
        audio = np.concatenate([np.array(r.audio, dtype=np.float32).reshape(-1) for r in results])
        parts.extend([gap, audio] if parts else [audio])
    return np.concatenate(parts)


def score_take(words: int, dur: float, peak: float) -> float:
    """Lower is better: pace near a calm read, no clipping."""
    wps = words / max(dur, 0.01)
    return abs(wps - CALM_WPS) + (5 if peak >= CLIP_PEAK else 0) + (5 if not WPS_OK[0] <= wps <= WPS_OK[1] else 0)


def write_manifest(out: Path, voice_name: str) -> list[str]:
    ids = sorted(p.stem for p in out.glob("*.mp3"))
    manifest = {"ids": ids, "voice": voice_name, "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return ids


def main() -> None:
    args = parse_args()
    if not args.ref.exists():
        sys.exit(f"No cloning prompt at {args.ref}. Run scripts/voice/prepare-sample.sh first.")
    lines = load_lines(args.lines)
    only = set(args.only or [])
    unknown = only - {l["id"] for l in lines}
    if unknown:
        sys.exit(f"ids not in {args.lines.name}: {', '.join(sorted(unknown))}")
    def is_pending(line: dict) -> bool:
        if only:
            return line["id"] in only
        return args.force or not (args.out / f"{line['id']}.mp3").exists()

    pending = [l for l in lines if is_pending(l)]
    if args.limit:
        pending = pending[:args.limit]
    print(f"{len(lines)} lines, {len(pending)} to render, {args.takes} takes each, ref {args.ref.name}")
    if not pending:
        write_manifest(args.out, args.voice_name)
        return

    t0 = time.time()
    from mlx_audio.tts.utils import load_model
    model = load_model(MODEL_ID)
    conds = model.prepare_conditionals(str(args.ref), SAMPLE_RATE, args.exaggeration)
    print(f"model ready in {time.time() - t0:.0f}s")

    takes_dir = VOICE_HOME / "takes"
    report = []
    for n, line in enumerate(pending, 1):
        text = speakable(line["text"])
        words = len(text.split())
        t1 = time.time()
        candidates = []
        for take in range(args.takes):
            wav = synthesize(model, conds, text, args, args.seed + 1000 * take)
            path = takes_dir / f"{line['id']}.take{take + 1}.mp3"
            info = postprocess(wav, path, args.bitrate)
            info["take"] = take + 1
            info["wps"] = round(words / max(info["durationSec"], 0.01), 2)
            info["score"] = score_take(words, info["durationSec"], info["peak"])
            candidates.append((info, path))
        best, best_path = min(candidates, key=lambda c: c[0]["score"])
        args.out.mkdir(parents=True, exist_ok=True)
        (args.out / f"{line['id']}.mp3").write_bytes(best_path.read_bytes())
        flags = []
        if best["peak"] >= CLIP_PEAK:
            flags.append("clipping")
        if not WPS_OK[0] <= best["wps"] <= WPS_OK[1]:
            flags.append("odd pace")
        secs = time.time() - t1
        report.append({"id": line["id"], "words": words, "durationSec": best["durationSec"], "wps": best["wps"],
                       "peak": best["peak"], "takeKept": best["take"], "takes": len(candidates),
                       "renderSec": round(secs, 1), "flags": flags, "text": text})
        print(f"[{n}/{len(pending)}] {line['id']}  {best['durationSec']:.1f}s audio  {best['wps']} w/s  "
              f"take {best['take']}/{len(candidates)}  {secs:.0f}s render  {' '.join(flags)}")

    ids = write_manifest(args.out, args.voice_name)
    write_report(report, VOICE_HOME)
    total = time.time() - t0
    print(f"done: {len(report)} lines in {total:.0f}s ({total / len(report):.0f}s per line), "
          f"{len(ids)} recordings in manifest -> {args.out}")


def write_report(report: list[dict], home: Path) -> None:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    home.mkdir(parents=True, exist_ok=True)
    previous = home / "qa-report.json"
    kept = {r["id"]: r for r in json.loads(previous.read_text())} if previous.exists() else {}
    report = list({**kept, **{r["id"]: r for r in report}}.values())  # a re-render replaces its row
    previous.write_text(json.dumps(report, indent=2) + "\n")
    rows = ["| id | sec | words/s | peak | take | render s | flags |", "|---|---|---|---|---|---|---|"]
    rows += [f"| {r['id']} | {r['durationSec']} | {r['wps']} | {r['peak']} | {r['takeKept']}/{r['takes']} "
             f"| {r['renderSec']} | {', '.join(r['flags']) or 'ok'} |" for r in report]
    flagged = [r for r in report if r["flags"]]
    md = f"# Voice render QA {stamp}\n\n{len(report)} lines rendered so far, {len(flagged)} flagged.\n\n" + "\n".join(rows) + "\n"
    (home / "qa-report.md").write_text(md)
    print(f"QA report: {home / 'qa-report.md'} ({len(flagged)} flagged)")


if __name__ == "__main__":
    main()
