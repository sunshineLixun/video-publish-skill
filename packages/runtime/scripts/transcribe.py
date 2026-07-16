import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="auto")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "faster-whisper is required. Install it with: python3 -m pip install faster-whisper",
            file=sys.stderr,
        )
        return 2

    model = WhisperModel(args.model, device="auto", compute_type="int8")
    language = None if args.language == "auto" else args.language
    segments, _ = model.transcribe(args.audio, language=language, vad_filter=True)
    lines = [segment.text.strip() for segment in segments if segment.text.strip()]
    Path(args.output).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
