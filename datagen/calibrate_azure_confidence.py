#!/usr/bin/env python3
"""Optionally compare the cached fixture with Azure Document Intelligence."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.identity import DefaultAzureCredential

ROOT = Path(__file__).resolve().parents[1]
DOCUMENT = ROOT / "data" / "claim_pack" / "03_bill_of_lading.pdf"


def main() -> int:
    endpoint = os.environ.get("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    if not endpoint:
        print(
            "Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT to run calibration. "
            "Authentication uses DefaultAzureCredential.",
            file=sys.stderr,
        )
        return 2

    client = DocumentIntelligenceClient(endpoint, DefaultAzureCredential())
    with DOCUMENT.open("rb") as handle:
        poller = client.begin_analyze_document(
            "prebuilt-layout",
            AnalyzeDocumentRequest(bytes_source=handle.read()),
        )
    result = poller.result()
    candidates = []
    for page in result.pages or []:
        for line in page.lines or []:
            if "2026-02-12" in line.content:
                confidences = [word.confidence for word in page.words or [] if word.confidence]
                candidates.append(
                    {
                        "page": page.page_number,
                        "line": line.content,
                        "mean_page_word_confidence": (
                            round(sum(confidences) / len(confidences), 4)
                            if confidences
                            else None
                        ),
                    }
                )
    print(
        json.dumps(
            {
                "document": DOCUMENT.name,
                "service_model": "prebuilt-layout",
                "shipment_date_candidates": candidates,
                "note": "Calibration does not modify cached_run.json.",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
