targetScope = 'subscription'

@minLength(1)
param environmentName string
@minLength(1)
param location string
@description('Object ID of the azd deployment principal for passwordless ACR push.')
param principalId string
@description('Existing single-tenant Entra application client ID. Set through azd env, never source control.')
param entraClientId string
@description('Microsoft Entra tenant ID.')
param entraTenantId string
@description('Existing or approved chat model deployment name.')
param foundryChatDeployment string
@description('Approved chat model catalog name.')
param foundryChatModel string
@description('Approved chat model version available in the selected region.')
param foundryChatModelVersion string
@description('Existing or approved embedding model deployment name.')
param foundryEmbeddingDeployment string
@description('Approved embedding model catalog name.')
param foundryEmbeddingModel string
@description('Approved embedding model version available in the selected region.')
param foundryEmbeddingModelVersion string

var token = toLower(uniqueString(subscription().id, environmentName))
var suffix = take(token, 8)
var resourceGroupName = 'rg-${environmentName}'

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: {
    application: 'ClaimPilot AI'
    dataClassification: 'synthetic-only'
    environment: environmentName
  }
}

module resources 'resources.bicep' = {
  name: 'claimpilot-resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
    suffix: suffix
    principalId: principalId
    entraClientId: entraClientId
    entraTenantId: entraTenantId
    foundryChatDeployment: foundryChatDeployment
    foundryChatModel: foundryChatModel
    foundryChatModelVersion: foundryChatModelVersion
    foundryEmbeddingDeployment: foundryEmbeddingDeployment
    foundryEmbeddingModel: foundryEmbeddingModel
    foundryEmbeddingModelVersion: foundryEmbeddingModelVersion
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_LOCATION string = location
output AZURE_CONTAINER_APP_NAME string = resources.outputs.containerAppName
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.containerRegistryName
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.containerRegistryEndpoint
output SERVICE_WEB_URI string = resources.outputs.uri
output STORAGE_ACCOUNT_URL string = resources.outputs.storageUrl
output COSMOS_ENDPOINT string = resources.outputs.cosmosEndpoint
output CONTENT_SAFETY_ENDPOINT string = resources.outputs.contentSafetyEndpoint
output VISION_ENDPOINT string = resources.outputs.visionEndpoint
output DOCUMENT_INTELLIGENCE_ENDPOINT string = resources.outputs.documentIntelligenceEndpoint
output LANGUAGE_ENDPOINT string = resources.outputs.languageEndpoint
output TRANSLATOR_ENDPOINT string = resources.outputs.translatorEndpoint
output SEARCH_ENDPOINT string = resources.outputs.searchEndpoint
output FOUNDRY_ENDPOINT string = resources.outputs.foundryEndpoint
output KEY_VAULT_URL string = resources.outputs.keyVaultUrl
output APPLICATIONINSIGHTS_CONNECTION_STRING string = resources.outputs.appInsightsConnectionString
