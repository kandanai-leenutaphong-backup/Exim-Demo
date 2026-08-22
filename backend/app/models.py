from typing import Any, Literal

from pydantic import BaseModel, Field


PanelName = Literal[
    "classification",
    "extraction",
    "language",
    "policy",
    "screening",
    "score",
    "report",
]


class PanelResult(BaseModel):
    panel: PanelName
    status: Literal["complete", "warning", "error"] = "complete"
    timestamp: str
    data: dict[str, Any]


class CaseResult(BaseModel):
    case_id: str
    panels: list[PanelResult] = Field(default_factory=list)

