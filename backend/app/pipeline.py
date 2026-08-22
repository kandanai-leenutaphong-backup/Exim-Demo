import asyncio
import json
import time
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, AsyncIterator

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from .audit import AuditStore
from .config import Settings

PANEL_ORDER = [
    "classification",
    "extraction",
    "language",
    "policy",
    "screening",
    "score",
    "report",
]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def find_field(panel: dict[str, Any], name: str) -> dict[str, Any] | None:
    for document in panel.get("data", {}).get("documents", []):
        for field in document.get("fields", []):
            if field.get("name") == name:
                return {**field, "file": document.get("file")}
    return None


def confidence_gate(field: dict[str, Any] | None, threshold: float) -> tuple[bool, str]:
    if field is None:
        return False, "Field was not extracted."
    confidence = float(field.get("confidence", 0))
    if confidence < threshold:
        return (
            False,
            f"{field.get('name')} from {field.get('file')} is unverified "
            f"({confidence:.0%} confidence; minimum {threshold:.0%}).",
        )
    return True, ""


class ReadinessModel:
    feature_names = [
        "document_count",
        "days_to_filing",
        "invoice_amount",
        "buyer_country_risk_band",
        "prior_claim_count",
    ]

    def __init__(self, data_dir: Path) -> None:
        model_path = data_dir / "readiness_model.joblib"
        if model_path.exists():
            self.model = joblib.load(model_path)
        else:
            history = pd.read_csv(data_dir / "history.csv")
            self.model = RandomForestClassifier(n_estimators=120, random_state=125)
            self.model.fit(history[self.feature_names], history["was_accepted"])
            joblib.dump(self.model, model_path)

    def score(self, features: dict[str, float]) -> tuple[int, list[dict[str, Any]]]:
        frame = pd.DataFrame([[features[name] for name in self.feature_names]], columns=self.feature_names)
        score = round(float(self.model.predict_proba(frame)[0][1]) * 100)
        ranked = sorted(
            zip(self.feature_names, self.model.feature_importances_, strict=True),
            key=lambda item: item[1],
            reverse=True,
        )[:3]
        labels = {
            "document_count": "Document completeness",
            "days_to_filing": "Days to filing",
            "invoice_amount": "Invoice amount",
            "buyer_country_risk_band": "Buyer country risk band",
            "prior_claim_count": "Prior claim count",
        }
        factors = [
            {"factor": labels[name], "value": features[name], "importance": round(float(weight), 3)}
            for name, weight in ranked
        ]
        return score, factors


class Pipeline:
    def __init__(self, settings: Settings, audit: AuditStore, telemetry: Any, credential: Any) -> None:
        self.settings = settings
        self.audit = audit
        self.telemetry = telemetry
        self.credential = credential
        self.cached_path = settings.data_dir / "cached_run.json"
        self._results: dict[str, dict[str, Any]] = {}

    def load_cached(self) -> dict[str, Any]:
        with self.cached_path.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        panels = payload["panels"]
        names = [panel["panel"] for panel in panels]
        if names != PANEL_ORDER:
            raise ValueError(f"Cached panel order is invalid: {names}")
        shipment = find_field(next(p for p in panels if p["panel"] == "extraction"), "shipment_date")
        allowed, _ = confidence_gate(shipment, self.settings.confidence_threshold)
        if allowed:
            raise ValueError("Cached B/L shipment date must remain below the confidence gate.")
        return payload

    async def stream(self, case_id: str, user_oid: str) -> AsyncIterator[dict[str, Any]]:
        emitted: list[dict[str, Any]] = []
        floor = self.settings.panel_emission_floor_ms / 1000
        if self.settings.demo_mode == "cached":
            source = deepcopy(self.load_cached())["panels"]
        else:
            from .live_pipeline import LivePipeline

            source = LivePipeline(self.settings, self.credential).run()

        async def emit(items):
            if hasattr(items, "__aiter__"):
                async for item in items:
                    yield item
            else:
                for item in items:
                    yield item

        async for panel in emit(source):
            started = time.monotonic()
            panel["timestamp"] = now_iso()
            self.audit.write(case_id, user_oid, panel)
            self.telemetry(panel["panel"], case_id, user_oid, panel["status"])
            emitted.append(panel)
            elapsed = time.monotonic() - started
            if elapsed < floor:
                await asyncio.sleep(floor - elapsed)
            yield panel
        self._results[case_id] = {"case_id": case_id, "panels": emitted}

    def result(self, case_id: str) -> dict[str, Any] | None:
        if case_id in self._results:
            return self._results[case_id]
        if case_id == "ECI-2026-000125" and self.cached_path.exists():
            return self.load_cached()
        return None
