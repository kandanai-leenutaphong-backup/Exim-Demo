import json
from pathlib import Path

from app.pipeline import PANEL_ORDER, confidence_gate, find_field
from app.screening import screen_counterparty


DATA = Path(__file__).parents[2] / "data" / "cached_run.json"


def test_cached_run_order_and_confidence_gate():
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    assert [panel["panel"] for panel in payload["panels"]] == PANEL_ORDER
    extraction = next(panel for panel in payload["panels"] if panel["panel"] == "extraction")
    shipment = find_field(extraction, "shipment_date")
    allowed, reason = confidence_gate(shipment, 0.60)
    assert not allowed
    assert shipment["file"] == "03_bill_of_lading.pdf"
    assert "unverified" in reason


def test_report_names_unverified_source():
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    report = next(panel for panel in payload["panels"] if panel["panel"] == "report")
    text = report["data"]["thai_report"]
    assert "03_bill_of_lading.pdf" in text
    assert "ยืนยัน" in text


def test_screening_is_deterministic_and_fictional():
    sanctions = DATA.parent / "sanctions.json"
    first = screen_counterparty("Zantara Meridian Trading Co.", sanctions)
    second = screen_counterparty("  zantara MERIDIAN trading co. ", sanctions)
    assert first["result"] == second["result"] == "refer"
    assert first["matched_entry"]["country"] == "Republic of Zantara"
    assert first["uses_llm"] is False
    assert first["list_label"] == "ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST"
