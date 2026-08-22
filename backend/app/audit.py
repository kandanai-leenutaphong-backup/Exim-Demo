import logging
from datetime import UTC, datetime
from typing import Any

from azure.cosmos import CosmosClient

from .config import Settings

logger = logging.getLogger(__name__)


class AuditStore:
    def __init__(self, settings: Settings, credential: Any) -> None:
        self._container = None
        self._memory: list[dict[str, Any]] = []
        if settings.demo_mode != "cached" and settings.cosmos_endpoint:
            client = CosmosClient(settings.cosmos_endpoint, credential=credential)
            database = client.get_database_client(settings.cosmos_database)
            self._container = database.get_container_client(settings.cosmos_container)

    def write(self, case_id: str, user_oid: str, panel: dict[str, Any]) -> None:
        item = {
            "id": f"{case_id}-{panel['panel']}-{panel['timestamp']}",
            "case_id": case_id,
            "user_oid": user_oid,
            "panel": panel["panel"],
            "timestamp": panel["timestamp"],
            "result": panel,
        }
        if self._container:
            self._container.upsert_item(item)
        else:
            self._memory.append(item)

    def history(self) -> list[dict[str, Any]]:
        if self._container:
            query = "SELECT TOP 100 * FROM c ORDER BY c.timestamp DESC"
            return list(self._container.query_items(query, enable_cross_partition_query=True))
        return sorted(self._memory, key=lambda item: item["timestamp"], reverse=True)

    def reset_demo(self) -> None:
        if self._container:
            items = self._container.query_items(
                "SELECT c.id, c.case_id FROM c WHERE c.case_id = @case",
                parameters=[{"name": "@case", "value": "ECI-2026-000125"}],
                enable_cross_partition_query=True,
            )
            for item in items:
                self._container.delete_item(item["id"], partition_key=item["case_id"])
        self._memory.clear()
        logger.info("Demo audit state reset at %s", datetime.now(UTC).isoformat())

