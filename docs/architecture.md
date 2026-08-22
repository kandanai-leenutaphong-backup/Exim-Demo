# Architecture

## Service map

```text
Browser
  | Entra ID sign-in
  v
Azure Container Apps
  |-- FastAPI SSE orchestrator
  |-- React static application
  |-- scikit-learn readiness model
  |
  |-- Azure AI Content Safety -> upload gate
  |-- Azure Blob Storage -> synthetic source files
  |-- Azure AI Vision -> visible document classification
  |-- Azure AI Document Intelligence -> OCR and fields
  |-- Azure AI Language + Translator -> correspondence analysis
  |-- Azure AI Search / Foundry IQ -> policy grounding and citation
  |-- local sanctions.json -> deterministic screening
  |-- Microsoft Foundry model -> Thai draft from panels 1 through 6 only
  |-- Cosmos DB serverless -> attributable panel audit
  `-- Application Insights -> one custom event per panel

User-assigned managed identity -> RBAC on every Azure data plane
Key Vault -> secrets that cannot be removed by managed identity
```

The orchestrator emits `classification`, `extraction`, `language`, `policy`,
`screening`, `score`, and `report` as Server-Sent Events in that order. It
enforces a 400 ms minimum interval so the audience can see each capability.
`DEMO_MODE=cached` replays exactly the same contract without office network
dependency.

## Confidence boundary

Every extracted field carries its source filename and confidence. A shared
gate rejects confidence below 0.60. Downstream code receives an unverified
state and a reason instead of the field value. For the degraded bill of lading,
the shipment date is below the threshold, so the 180-day filing calculation is
not performed. The report input can state only that the deadline is unverified
and that `03_bill_of_lading.pdf` must be requested again.

## Grounding and citations

The policy document is indexed by page and clause. Retrieval returns both an
answer and structured citation fields. The frontend renders the citation as a
chip linked to `/documents/08_policy.pdf#page=<page>`. This lets the claims
officer inspect the exact source rather than trust generated prose.

## Why sanctions screening is not an LLM call

Sanctions screening is a control, not a creative language task. It must be
repeatable, explainable, testable, and tied to a specific list version. The
implementation therefore normalizes the counterparty name and performs an
exact deterministic lookup in local `sanctions.json`. The result, matched
entry, list label, and timestamp are written to the audit trail.

Using an LLM here would create avoidable variation, make false matches harder
to reproduce, and obscure which list entry caused a referral. The UI labels
the panel `RULE-BASED` and `not AI` so the audience sees that production AI
systems deliberately combine AI with conventional controls.

The bundled list contains only fictional entities and countries and is labeled
`ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST`. It is not suitable for real
screening.

## Security

- Single-tenant Entra authentication is enforced by Container Apps built-in
  authentication.
- Production selects `ManagedIdentityCredential`; local development selects
  `DefaultAzureCredential`.
- Storage and AI services disable local key authentication where supported.
- Least-privilege role assignments are scoped to each resource.
- Uploaded images pass Content Safety before Blob Storage.
- Errors are logged to Application Insights while the browser receives a safe
  message without stack traces.

