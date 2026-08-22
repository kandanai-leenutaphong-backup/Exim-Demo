import os

from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
)


def main() -> None:
    endpoint = os.environ["SEARCH_ENDPOINT"]
    name = os.getenv("SEARCH_INDEX", "claimpilot-policy")
    credential = DefaultAzureCredential()
    indexes = SearchIndexClient(endpoint, credential)
    fields = [
        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
        SearchField(name="content", type=SearchFieldDataType.String, searchable=True),
        SimpleField(name="clause", type=SearchFieldDataType.String, filterable=True),
        SimpleField(name="page", type=SearchFieldDataType.Int32, filterable=True),
        SimpleField(name="citation", type=SearchFieldDataType.String),
    ]
    semantic = SemanticSearch(
        configurations=[
            SemanticConfiguration(
                name="claimpilot-semantic",
                prioritized_fields=SemanticPrioritizedFields(
                    content_fields=[SemanticField(field_name="content")]
                ),
            )
        ]
    )
    indexes.create_or_update_index(SearchIndex(name=name, fields=fields, semantic_search=semantic))
    client = SearchClient(endpoint, name, credential)
    client.upload_documents(
        [
            {
                "id": "policy-7-3-page-2",
                "content": (
                    "Clause 7.3 Filing Window. The insured must submit the claim "
                    "within 180 calendar days of the shipment date."
                ),
                "clause": "7.3",
                "page": 2,
                "citation": "Clause 7.3, page 2",
            }
        ]
    )
    print(f"Seeded {name} with the synthetic Clause 7.3 policy passage.")


if __name__ == "__main__":
    main()
