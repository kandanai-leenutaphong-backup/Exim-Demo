import json
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return " ".join(normalized.casefold().split())


def screen_counterparty(name: str, sanctions_path: Path) -> dict[str, Any]:
    """Perform deterministic screening, deliberately without an LLM.

    Screening is a reproducible control. An LLM would make the same input
    capable of producing different decisions and would weaken auditability.
    """
    source = json.loads(sanctions_path.read_text(encoding="utf-8"))
    target = normalize_name(name)
    match = next(
        (
            entry
            for entry in source["entries"]
            if target
            in {
                normalize_name(entry.get("entity_name", entry.get("name", ""))),
                *(normalize_name(alias) for alias in entry.get("aliases", [])),
            }
        ),
        None,
    )
    return {
        "result": "refer" if match else "clear",
        "counterparty": name,
        "matched_entry": match,
        "list_label": source["label"],
        "list_version": source["version"],
        "checked_at": datetime.now(UTC).isoformat(),
        "method": "deterministic exact-name lookup",
        "uses_llm": False,
    }
