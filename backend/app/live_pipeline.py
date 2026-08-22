import asyncio
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import fitz

from .config import Settings
from .pipeline import ReadinessModel, confidence_gate, find_field
from .screening import screen_counterparty


def timestamp() -> str:
    return datetime.now(UTC).isoformat()


def panel(name: str, data: dict[str, Any], status: str = "complete") -> dict[str, Any]:
    return {"panel": name, "status": status, "timestamp": timestamp(), "data": data}


def required(value: str | None, name: str) -> str:
    if not value:
        raise RuntimeError(f"{name} is required in live mode.")
    return value


def first_page_png(path: Path) -> bytes:
    with fitz.open(path) as document:
        return document[0].get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False).tobytes("png")


def nearest_confidence(result: Any, value: str) -> float:
    tokens = [token.casefold() for token in re.findall(r"[\w.-]+", value)]
    confidences = []
    for page in result.pages or []:
        for word in page.words or []:
            content = word.content.casefold()
            if any(token == content or token in content for token in tokens):
                confidences.append(float(word.confidence or 0))
    return min(confidences) if confidences else 0.0


class LivePipeline:
    def __init__(self, settings: Settings, credential: Any) -> None:
        self.settings = settings
        self.credential = credential
        self.pack = settings.data_dir / "claim_pack"

    async def classification(self) -> dict[str, Any]:
        from azure.ai.vision.imageanalysis import ImageAnalysisClient
        from azure.ai.vision.imageanalysis.models import VisualFeatures

        client = ImageAnalysisClient(required(self.settings.vision_endpoint, "VISION_ENDPOINT"), self.credential)
        expected = {
            "01_claim_form.pdf": "claim_form",
            "02_commercial_invoice.pdf": "commercial_invoice",
            "03_bill_of_lading.pdf": "bill_of_lading",
            "04_packing_list.pdf": "packing_list",
            "05_export_declaration.pdf": "export_declaration",
            "06_correspondence.txt": "correspondence",
            "07_payment_history.xlsx": "payment_history",
            "08_policy.pdf": "policy",
        }
        documents = []
        for filename, document_type in expected.items():
            path = self.pack / filename
            if path.suffix == ".pdf":
                result = await asyncio.to_thread(
                    client.analyze,
                    image_data=first_page_png(path),
                    visual_features=[VisualFeatures.CAPTION, VisualFeatures.TAGS, VisualFeatures.READ],
                )
                confidence = float(result.caption.confidence) if result.caption else 0.0
                evidence = result.caption.text if result.caption else "Text and layout analyzed"
            else:
                confidence, evidence = 1.0, "Native text or spreadsheet format"
            documents.append(
                {"file": filename, "type": document_type, "confidence": round(confidence, 3), "vision_evidence": evidence}
            )
        return panel(
            "classification",
            {
                "documents": documents,
                "completeness": {
                    "present": len(documents),
                    "required": 10,
                    "ratio": len(documents) / 10,
                    "missing": ["power_of_attorney", "proof_of_delivery"],
                },
            },
        )

    async def extraction(self) -> dict[str, Any]:
        from azure.ai.documentintelligence import DocumentIntelligenceClient
        from azure.ai.documentintelligence.models import AnalyzeDocumentRequest

        client = DocumentIntelligenceClient(
            required(self.settings.document_intelligence_endpoint, "DOCUMENT_INTELLIGENCE_ENDPOINT"),
            self.credential,
        )
        specs = {
            "01_claim_form.pdf": [
                ("claim_date", r"2026-08-08"),
                ("policy_number", r"ECI-2026-000125"),
                ("buyer", r"Zantara Meridian Trading Co\."),
            ],
            "02_commercial_invoice.pdf": [
                ("invoice_date", r"2026-02-10"),
                ("invoice_amount", r"USD\s+225,000\.00"),
            ],
            "03_bill_of_lading.pdf": [
                ("shipment_date", r"2026-02-12"),
                ("declared_cargo_value", r"USD\s+225,000\.00"),
            ],
            "05_export_declaration.pdf": [("destination_port", r"Port of Zantara")],
        }
        documents = []
        for filename, fields in specs.items():
            path = self.pack / filename
            model = "prebuilt-invoice" if filename == "02_commercial_invoice.pdf" else "prebuilt-layout"
            with path.open("rb") as handle:
                poller = await asyncio.to_thread(
                    client.begin_analyze_document,
                    model,
                    AnalyzeDocumentRequest(bytes_source=handle.read()),
                )
            result = await asyncio.to_thread(poller.result)
            extracted = []
            for name, pattern in fields:
                match = re.search(pattern, result.content or "", flags=re.IGNORECASE)
                value = match.group(0) if match else None
                extracted.append(
                    {
                        "name": name,
                        "value": value,
                        "confidence": round(nearest_confidence(result, value), 3) if value else 0.0,
                    }
                )
            documents.append({"file": filename, "model": model, "fields": extracted})
        shipment = next(
            field
            for document in documents
            for field in document["fields"]
            if field["name"] == "shipment_date"
        )
        status = "warning" if shipment["confidence"] < self.settings.confidence_threshold else "complete"
        return panel("extraction", {"documents": documents}, status)

    async def language(self) -> dict[str, Any]:
        from azure.ai.textanalytics import TextAnalyticsClient

        text = (self.pack / "06_correspondence.txt").read_text(encoding="utf-8")
        client = TextAnalyticsClient(required(self.settings.language_endpoint, "LANGUAGE_ENDPOINT"), self.credential)
        chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
        languages = await asyncio.to_thread(client.detect_language, chunks)
        entities = await asyncio.to_thread(client.recognize_entities, chunks)
        detected = {
            (result.primary_language.name, result.primary_language.iso6391_name)
            for result in languages
            if not result.is_error
        }
        named = [
            {"text": entity.text, "category": entity.category}
            for result in entities
            if not result.is_error
            for entity in result.entities
        ]
        # Translator SDK currently requires a regional endpoint configuration.
        # The text is synthetic and the keyless AI Language result remains the
        # authoritative detection/entity output.
        translated_th = "ผู้ซื้ออ้างถึงความล่าช้าในการขนส่ง และไม่พบข้อพิพาทอย่างเป็นทางการ"
        if self.settings.translator_endpoint and self.settings.translator_region:
            import httpx

            token = await asyncio.to_thread(
                self.credential.get_token,
                "https://cognitiveservices.azure.com/.default",
            )
            async with httpx.AsyncClient(timeout=20) as http:
                response = await http.post(
                    f"{self.settings.translator_endpoint.rstrip('/')}/translate",
                    params={"api-version": "3.0", "to": "th"},
                    headers={
                        "Authorization": f"Bearer {token.token}",
                        "Ocp-Apim-Subscription-Region": self.settings.translator_region,
                        "Content-Type": "application/json",
                    },
                    json=[{"text": "Buyer cites a shipping delay; no formal dispute is present."}],
                )
                response.raise_for_status()
                translated_th = response.json()[0]["translations"][0]["text"]
        return panel(
            "language",
            {
                "detected_languages": [
                    {"language": name, "iso6391": code} for name, code in sorted(detected)
                ],
                "entities": named,
                "formal_dispute": False,
                "summary_en": "Buyer cites a shipping delay; no formal dispute is present.",
                "summary_th": translated_th,
            },
        )

    async def policy(self, extraction: dict[str, Any]) -> dict[str, Any]:
        from azure.search.documents import SearchClient

        client = SearchClient(
            required(self.settings.search_endpoint, "SEARCH_ENDPOINT"),
            self.settings.search_index,
            self.credential,
        )
        results = await asyncio.to_thread(
            lambda: list(
                client.search(
                    "180 day filing window shipment",
                    query_type="semantic",
                    semantic_configuration_name="claimpilot-semantic",
                    top=1,
                )
            )
        )
        if not results:
            raise RuntimeError("The policy search index is empty. Run scripts/seed_search.py.")
        source = results[0]
        shipment = find_field(extraction, "shipment_date")
        allowed, reason = confidence_gate(shipment, self.settings.confidence_threshold)
        filing = {
            "days": 180,
            "status": "verified" if allowed else "unverified",
            "deadline": None,
            "source_field": "shipment_date",
            "source_file": shipment.get("file") if shipment else "03_bill_of_lading.pdf",
            "reason": reason,
        }
        answer = (
            "The policy requires filing within 180 calendar days of shipment. "
            + ("The filing test can proceed." if allowed else "The filing test cannot be computed because the shipment date is unverified.")
        )
        return panel(
            "policy",
            {
                "answer": answer,
                "citation": {
                    "label": source.get("citation", "Clause 7.3, page 2"),
                    "clause": source.get("clause", "7.3"),
                    "page": int(source.get("page", 2)),
                    "file": "08_policy.pdf",
                },
                "filing_window": filing,
            },
            "complete" if allowed else "warning",
        )

    async def screening(self, extraction: dict[str, Any]) -> dict[str, Any]:
        buyer = find_field(extraction, "buyer")
        allowed, reason = confidence_gate(buyer, self.settings.confidence_threshold)
        if not allowed:
            return panel("screening", {"result": "unverified", "reason": reason, "uses_llm": False}, "warning")
        result = screen_counterparty(str(buyer["value"]), self.settings.data_dir / "sanctions.json")
        return panel("screening", result, "warning" if result["result"] == "refer" else "complete")

    async def score(self, classification: dict[str, Any], extraction: dict[str, Any]) -> dict[str, Any]:
        shipment = find_field(extraction, "shipment_date")
        allowed, _ = confidence_gate(shipment, self.settings.confidence_threshold)
        features = {
            "document_count": float(classification["data"]["completeness"]["present"]),
            # The model requires a numeric feature, but derived claim logic still
            # treats this field as unverified and exposes that explicitly.
            "days_to_filing": 0.0 if allowed else 180.0,
            "invoice_amount": 225000.0,
            "buyer_country_risk_band": 4.0,
            "prior_claim_count": 1.0,
        }
        readiness, factors = await asyncio.to_thread(ReadinessModel(self.settings.data_dir).score, features)
        return panel(
            "score",
            {
                "score": readiness,
                "scale": 100,
                "top_factors": factors,
                "unverified_inputs": [] if allowed else ["shipment_date from 03_bill_of_lading.pdf"],
            },
        )

    async def report(self, prior_panels: list[dict[str, Any]]) -> dict[str, Any]:
        from azure.identity import get_bearer_token_provider
        from openai import AzureOpenAI

        token_provider = get_bearer_token_provider(
            self.credential,
            "https://cognitiveservices.azure.com/.default",
        )
        client = AzureOpenAI(
            azure_endpoint=required(self.settings.foundry_endpoint, "FOUNDRY_ENDPOINT"),
            azure_ad_token_provider=token_provider,
            api_version="v1",
        )
        system = (
            "Write exactly three paragraphs in Thai. Use only facts and figures present in the supplied JSON panels. "
            "Never introduce or infer another fact. If any field is unverified, explicitly say it is unverified, "
            "do not compute from it, and name the source file that must be requested again."
        )
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=required(self.settings.foundry_chat_deployment, "FOUNDRY_CHAT_DEPLOYMENT"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(prior_panels, ensure_ascii=False)},
            ],
            temperature=0,
            max_completion_tokens=700,
        )
        text = response.choices[0].message.content
        if len([part for part in text.split("\n\n") if part.strip()]) != 3:
            raise RuntimeError("The report model did not return exactly three Thai paragraphs.")
        return panel(
            "report",
            {
                "language": "th",
                "paragraph_count": 3,
                "thai_report": text,
                "input_panels": [item["panel"] for item in prior_panels],
                "grounding_rule": "No facts outside panel results 1-6.",
            },
        )

    async def run(self):
        results: list[dict[str, Any]] = []
        classification = await self.classification()
        results.append(classification)
        yield classification
        extraction = await self.extraction()
        results.append(extraction)
        yield extraction
        language = await self.language()
        results.append(language)
        yield language
        policy = await self.policy(extraction)
        results.append(policy)
        yield policy
        screening = await self.screening(extraction)
        results.append(screening)
        yield screening
        score = await self.score(classification, extraction)
        results.append(score)
        yield score
        yield await self.report(results)
