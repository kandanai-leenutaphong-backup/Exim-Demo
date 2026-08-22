import os

from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential


def main() -> None:
    endpoint = os.environ["COSMOS_ENDPOINT"]
    client = CosmosClient(endpoint, credential=DefaultAzureCredential())
    container = client.get_database_client("claimpilot").get_container_client("audit")
    items = container.query_items(
        "SELECT c.id, c.case_id FROM c WHERE c.case_id = @case",
        parameters=[{"name": "@case", "value": "ECI-2026-000125"}],
        enable_cross_partition_query=True,
    )
    count = 0
    for item in items:
        container.delete_item(item["id"], partition_key=item["case_id"])
        count += 1
    print(f"Reset complete. Removed {count} audit entries for ECI-2026-000125.")


if __name__ == "__main__":
    main()

