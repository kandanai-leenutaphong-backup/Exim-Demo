import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.pipeline import PANEL_ORDER, confidence_gate, find_field  # noqa: E402


def verify_cached() -> None:
    path = ROOT / "data" / "cached_run.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert [panel["panel"] for panel in payload["panels"]] == PANEL_ORDER
    extraction = next(panel for panel in payload["panels"] if panel["panel"] == "extraction")
    shipment = find_field(extraction, "shipment_date")
    allowed, reason = confidence_gate(shipment, 0.60)
    assert not allowed, "B/L shipment date unexpectedly passed the 0.60 gate"
    assert shipment["file"] == "03_bill_of_lading.pdf"
    policy = next(panel for panel in payload["panels"] if panel["panel"] == "policy")
    assert policy["data"]["filing_window"]["status"] == "unverified"
    assert policy["data"]["citation"]["page"] > 0
    report = next(panel for panel in payload["panels"] if panel["panel"] == "report")
    assert "03_bill_of_lading.pdf" in report["data"]["thai_report"]
    print(f"PASS cached run: {reason}")


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required for the live demo check")
    return value


async def verify_live() -> None:
    from azure.ai.contentsafety.aio import ContentSafetyClient
    from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
    from azure.ai.textanalytics.aio import TextAnalyticsClient
    from azure.core.exceptions import HttpResponseError
    from azure.identity.aio import DefaultAzureCredential
    from azure.search.documents.indexes.aio import SearchIndexClient
    from azure.storage.blob.aio import BlobServiceClient
    from azure.cosmos.aio import CosmosClient

    credential = DefaultAzureCredential()
    checks: list[tuple[str, object]] = []
    try:
        blob = BlobServiceClient(required("STORAGE_ACCOUNT_URL"), credential)
        await blob.get_account_information()
        checks.append(("Blob Storage", True))

        async with ContentSafetyClient(required("CONTENT_SAFETY_ENDPOINT"), credential) as client:
            await client.get_blocklist_text(blocklist_name="claimpilot-health", blocklist_text_id="health")
    except HttpResponseError as exc:
        if getattr(exc, "status_code", None) in {400, 404}:
            checks.append(("Content Safety", True))
        else:
            raise

    async with DocumentIntelligenceClient(required("DOCUMENT_INTELLIGENCE_ENDPOINT"), credential) as client:
        await client.get_resource_details()
        checks.append(("Document Intelligence", True))

    async with TextAnalyticsClient(required("LANGUAGE_ENDPOINT"), credential) as client:
        await client.detect_language(["ClaimPilot health check"])
        checks.append(("AI Language", True))

    search = SearchIndexClient(required("SEARCH_ENDPOINT"), credential)
    await search.get_service_statistics()
    checks.append(("AI Search", True))

    cosmos = CosmosClient(required("COSMOS_ENDPOINT"), credential=credential)
    database = cosmos.get_database_client(os.getenv("COSMOS_DATABASE", "claimpilot"))
    await database.read()
    await cosmos.close()
    checks.append(("Cosmos DB", True))

    import httpx

    translator_token = await credential.get_token("https://cognitiveservices.azure.com/.default")
    async with httpx.AsyncClient(timeout=20) as http:
        translator = await http.post(
            f"{required('TRANSLATOR_ENDPOINT').rstrip('/')}/translate",
            params={"api-version": "3.0", "to": "th"},
            headers={
                "Authorization": f"Bearer {translator_token.token}",
                "Ocp-Apim-Subscription-Region": required("TRANSLATOR_REGION"),
                "Content-Type": "application/json",
            },
            json=[{"text": "ClaimPilot health check"}],
        )
        translator.raise_for_status()
        foundry = await http.get(
            f"{required('FOUNDRY_ENDPOINT').rstrip('/')}/openai/models",
            params={"api-version": "v1"},
            headers={"Authorization": f"Bearer {translator_token.token}"},
        )
        foundry.raise_for_status()
    checks.extend([("Translator", True), ("Foundry", True)])
    await credential.close()
    for name, _ in checks:
        print(f"PASS {name}")


if __name__ == "__main__":
    verify_cached()
    if os.getenv("DEMO_CHECK_LIVE", "1") == "1":
        asyncio.run(verify_live())
