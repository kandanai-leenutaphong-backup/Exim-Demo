# Infrastructure inputs

The template intentionally has no Azure defaults for tenant, subscription,
region, or model names. Set these before `azd up`:

```bash
azd env set AZURE_LOCATION <approved-region>
azd env set AZURE_TENANT_ID <tenant-id>
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
azd env set ENTRA_CLIENT_ID <single-tenant-app-client-id>
azd env set FOUNDRY_CHAT_DEPLOYMENT <approved-chat-model-name>
azd env set FOUNDRY_CHAT_MODEL <approved-chat-model-catalog-name>
azd env set FOUNDRY_CHAT_MODEL_VERSION <available-chat-model-version>
azd env set FOUNDRY_EMBEDDING_DEPLOYMENT <approved-embedding-model-name>
azd env set FOUNDRY_EMBEDDING_MODEL <approved-embedding-model-catalog-name>
azd env set FOUNDRY_EMBEDDING_MODEL_VERSION <available-embedding-model-version>
```

The model names must be supported in the selected region and have quota. The
template does not invent a region or deployment name.
