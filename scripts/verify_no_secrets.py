import re
from pathlib import Path

ROOT = Path(__file__).parents[1]
SKIP = {"node_modules", "dist", ".azure", ".git", ".venv", "__pycache__"}
PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|client[_-]?secret|password)\s*[:=]\s*['\"][^'\"]{8,}"),
    re.compile(r"(?i)AccountKey=[A-Za-z0-9+/=]{20,}"),
]


def main() -> None:
    hits = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in SKIP for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for line_number, line in enumerate(text.splitlines(), 1):
            if any(pattern.search(line) for pattern in PATTERNS):
                hits.append(f"{path.relative_to(ROOT)}:{line_number}")
    if hits:
        raise SystemExit("Potential credentials found:\n" + "\n".join(hits))
    print("PASS no credential-shaped values found in source files.")


if __name__ == "__main__":
    main()
