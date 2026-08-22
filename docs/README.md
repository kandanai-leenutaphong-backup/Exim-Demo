# ClaimPilot AI

ClaimPilot AI is a synthetic export credit insurance claim pre-check demo for a
six-minute presentation. It makes seven processing stages visible and streams
each result as it completes. No real customer or claims data is included.

## Safety and data guarantees

- Every case artifact is generated locally and every PDF page is marked
  `SAMPLE — NOT REAL DATA`.
- All organizations, buyers, ports, and countries are fictional.
- The sanctions list is labeled
  `ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST`.
- Screening is a deterministic local JSON lookup. It never calls an LLM.
- Values below 0.60 confidence are marked unverified and cannot feed derived
  calculations or factual report statements.
- No keys are stored in source. Local development uses
  `DefaultAzureCredential`. Azure uses a user-assigned managed identity.

## Prerequisites

- Python 3.12
- Node.js 20 or newer
- Docker
- Azure CLI and Azure Developer CLI
- An Azure subscription with permission to create resources and role
  assignments
- A pre-created single-tenant Entra app registration for Container Apps auth
- Approved chat and embedding model names with quota in your selected region

The region, tenant, subscription, Entra client ID, and model names have no
invented defaults. Add them to the azd environment as shown in
`infra/README.md`.

## Generate and run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r datagen/requirements.txt -r backend/requirements.txt
make generate
make demo-check-cached

cd frontend
npm install
VITE_DEMO_MODE=cached npm run dev
```

In a second terminal:

```bash
source .venv/bin/activate
cd backend
DEMO_MODE=cached uvicorn app.main:app --reload
```

The frontend uses its demo sign-in only when `VITE_DEMO_MODE=cached`. Live
deployments use Microsoft Entra authentication.

## Deploy

```bash
azd auth login
azd init
azd env set AZURE_LOCATION <approved-region>
azd env set AZURE_TENANT_ID <tenant-id>
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
azd env set ENTRA_CLIENT_ID <single-tenant-app-client-id>
azd env set FOUNDRY_CHAT_DEPLOYMENT <approved-chat-deployment>
azd env set FOUNDRY_CHAT_MODEL <approved-chat-model-catalog-name>
azd env set FOUNDRY_CHAT_MODEL_VERSION <available-chat-model-version>
azd env set FOUNDRY_EMBEDDING_DEPLOYMENT <approved-embedding-deployment>
azd env set FOUNDRY_EMBEDDING_MODEL <approved-embedding-model-catalog-name>
azd env set FOUNDRY_EMBEDDING_MODEL_VERSION <available-embedding-model-version>
azd up
```

After provisioning, add the deployed Container App URL as a redirect URI on
the Entra app registration. Run `make demo-check` with values exported from
`azd env get-values`. Run `make seed-search` once to create the policy search
index. Use `make seed` to clear prior synthetic audit entries.

## Service and SDK notes

The implementation uses the current split Azure SDK packages rather than
retired umbrella packages: `azure-ai-documentintelligence`,
`azure-ai-contentsafety`, `azure-ai-textanalytics`,
`azure-ai-translation-text`, `azure-search-documents`,
the stable `openai` Azure client, `azure-storage-blob`, `azure-cosmos`,
`azure-keyvault-secrets`, and `azure-monitor-opentelemetry`.

Foundry IQ availability differs by subscription and region. The deployment
therefore provisions a standard Azure AI Search vector and semantic index as
the safe fallback. If Foundry IQ is available, it can be connected to the same
policy source without changing the panel contract.

## Cost estimate

Pricing varies by region and agreement, so the deployment does not state a
false fixed price. A single live demo performs roughly 8 document analyses,
8 vision classifications, one language pass, one translation pass, one search
query, one short model completion, blob operations, and small Cosmos writes.
At typical consumption pricing this is usually well under USD 1 in transaction
charges. Standing resources dominate: AI Search Basic, Log Analytics,
Application Insights, and any provisioned model capacity can continue to incur
cost between demos. Use the Azure Pricing Calculator for the selected region
and run `azd down --purge` when the environment is no longer needed.

Cached mode performs no billable AI inference during the presentation.
