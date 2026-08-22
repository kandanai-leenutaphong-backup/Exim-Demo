import json
import logging
import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.storage.blob import BlobServiceClient
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .audit import AuditStore
from .config import Settings, get_settings
from .pipeline import Pipeline
from .security import current_user_oid

logger = logging.getLogger("claimpilot")


def credential_for(settings: Settings):
    if settings.is_local:
        return DefaultAzureCredential()
    return ManagedIdentityCredential(client_id=settings.azure_client_id)


def track_panel(panel: str, case_id: str, user_oid: str, status: str) -> None:
    logging.getLogger("claimpilot.panel").info(
        "panel_complete",
        extra={"custom_dimensions": {"panel": panel, "case_id": case_id, "user_oid": user_oid, "status": status}},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.applicationinsights_connection_string:
        configure_azure_monitor(connection_string=settings.applicationinsights_connection_string)
    credential = credential_for(settings)
    audit = AuditStore(settings, credential)
    app.state.settings = settings
    app.state.credential = credential
    app.state.audit = audit
    app.state.pipeline = Pipeline(settings, audit, track_panel, credential)
    yield


app = FastAPI(title="ClaimPilot AI", version="1.0.0", lifespan=lifespan)
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def safe_error(_: Request, exc: Exception):
    logger.exception("Unhandled request error", exc_info=exc)
    return __import__("fastapi").responses.JSONResponse(
        status_code=500,
        content={"detail": "ClaimPilot could not complete this step. Please retry or use the cached demo mode."},
    )


@app.get("/health")
async def health(request: Request):
    request.app.state.pipeline.load_cached()
    return {"status": "ok", "mode": request.app.state.settings.demo_mode}


@app.post("/api/cases/{case_id}/upload")
async def upload(
    case_id: str,
    request: Request,
    user_oid: Annotated[str, Depends(current_user_oid)],
    files: list[UploadFile] = File(...),
):
    settings: Settings = request.app.state.settings
    accepted = []
    for file in files:
        content = await file.read()
        if not content:
            raise HTTPException(400, f"{file.filename} is empty.")
        safety = "not_applicable"
        content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
        # Content Safety image analysis applies to uploaded images. PDFs and native
        # office/text documents continue to Blob Storage after standard file checks.
        if settings.demo_mode != "cached":
            if content_type.startswith("image/"):
                await _content_safety_check(request, content)
                safety = "passed"
            if not settings.storage_account_url:
                raise HTTPException(503, "Blob Storage is not configured.")
            blob = BlobServiceClient(settings.storage_account_url, request.app.state.credential)
            client = blob.get_blob_client(settings.storage_container, f"{case_id}/{file.filename}")
            client.upload_blob(content, overwrite=True)
        else:
            safety = "cached_demo"
        accepted.append({"file": file.filename, "bytes": len(content), "safety": safety})
    panel = {
        "panel": "upload",
        "status": "complete",
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").UTC).isoformat(),
        "data": {"files": accepted},
    }
    request.app.state.audit.write(case_id, user_oid, panel)
    return panel


async def _content_safety_check(request: Request, content: bytes) -> None:
    from azure.ai.contentsafety.aio import ContentSafetyClient
    from azure.ai.contentsafety.models import AnalyzeImageOptions, ImageData

    endpoint = request.app.state.settings.content_safety_endpoint
    if not endpoint:
        raise HTTPException(503, "Content Safety is not configured.")
    async with ContentSafetyClient(endpoint, request.app.state.credential) as client:
        result = await client.analyze_image(AnalyzeImageOptions(image=ImageData(content=content)))
    blocked = [item for item in result.categories_analysis if item.severity and item.severity >= 4]
    if blocked:
        raise HTTPException(422, "Upload blocked by the image safety policy.")


@app.post("/api/cases/{case_id}/analyze")
async def analyze(
    case_id: str,
    request: Request,
    user_oid: Annotated[str, Depends(current_user_oid)],
):
    async def events():
        async for panel in request.app.state.pipeline.stream(case_id, user_oid):
            yield f"event: panel\ndata: {json.dumps(panel, ensure_ascii=False)}\n\n"
        yield "event: complete\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/api/cases/{case_id}/result")
async def result(case_id: str, request: Request):
    payload = request.app.state.pipeline.result(case_id)
    if payload is None:
        raise HTTPException(404, "No result exists for this case.")
    return payload


@app.get("/api/history")
async def history(request: Request):
    return {"items": request.app.state.audit.history()}


@app.get("/documents/{filename}")
async def document(filename: str, request: Request):
    allowed = {"08_policy.pdf"}
    if filename not in allowed:
        raise HTTPException(404, "Document not found.")
    path: Path = request.app.state.settings.data_dir / "claim_pack" / filename
    if not path.exists():
        raise HTTPException(404, "Document not found.")
    return FileResponse(path, media_type="application/pdf")


static_dir = Path(__file__).parents[1] / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
