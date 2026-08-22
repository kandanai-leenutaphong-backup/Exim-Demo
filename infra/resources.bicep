param environmentName string
param location string
param suffix string
param principalId string
param entraClientId string
param entraTenantId string
param foundryChatDeployment string
param foundryChatModel string
param foundryChatModelVersion string
param foundryEmbeddingDeployment string
param foundryEmbeddingModel string
param foundryEmbeddingModelVersion string

var appName = 'ca-claimpilot-${suffix}'
var identityName = 'id-claimpilot-${suffix}'
var tags = {
  application: 'ClaimPilot AI'
  dataClassification: 'synthetic-only'
  environment: environmentName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: identityName
  location: location
  tags: tags
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: 'acrclaim${suffix}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource log 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-claimpilot-${suffix}'
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-claimpilot-${suffix}'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: log.id
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: 'stclaim${suffix}'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource documents 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobService
  name: 'claim-documents'
  properties: {
    publicAccess: 'None'
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: 'cosmos-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    disableLocalAuth: true
    enableAutomaticFailover: false
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: cosmos
  name: 'claimpilot'
  properties: {
    resource: {
      id: 'claimpilot'
    }
  }
}

resource audit 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: database
  name: 'audit'
  properties: {
    resource: {
      id: 'audit'
      partitionKey: {
        paths: [
          '/case_id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource vault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: 'kv-claimpilot-${suffix}'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

resource search 'Microsoft.Search/searchServices@2024-06-01-preview' = {
  name: 'srch-claimpilot-${suffix}'
  location: location
  tags: union(tags, {
    groundingMode: 'vector-semantic-fallback'
  })
  sku: {
    name: 'basic'
  }
  properties: {
    disableLocalAuth: true
    hostingMode: 'default'
    partitionCount: 1
    replicaCount: 1
    semanticSearch: 'free'
  }
}

resource contentSafety 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'cs-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'ContentSafety'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'cs-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource vision 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'vision-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'ComputerVision'
  sku: {
    name: 'S1'
  }
  properties: {
    customSubDomainName: 'vision-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource docIntel 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'di-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'FormRecognizer'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'di-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource language 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'lang-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'TextAnalytics'
  sku: {
    name: 'S'
  }
  properties: {
    customSubDomainName: 'lang-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource translator 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'tr-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'TextTranslation'
  sku: {
    name: 'S1'
  }
  properties: {
    customSubDomainName: 'tr-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: 'ai-claimpilot-${suffix}'
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'ai-claimpilot-${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: foundry
  name: foundryChatDeployment
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: foundryChatModel
      version: foundryChatModelVersion
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: foundry
  name: foundryEmbeddingDeployment
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: foundryEmbeddingModel
      version: foundryEmbeddingModelVersion
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource managedEnv 'Microsoft.App/managedEnvironments@2024-10-02-preview' = {
  name: 'cae-claimpilot-${suffix}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: log.properties.customerId
        sharedKey: log.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
        }
      ]
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          env: [
            { name: 'ENVIRONMENT', value: 'production' }
            { name: 'DEMO_MODE', value: 'cached' }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
            { name: 'STORAGE_ACCOUNT_URL', value: storage.properties.primaryEndpoints.blob }
            { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
            { name: 'CONTENT_SAFETY_ENDPOINT', value: contentSafety.properties.endpoint }
            { name: 'VISION_ENDPOINT', value: vision.properties.endpoint }
            { name: 'DOCUMENT_INTELLIGENCE_ENDPOINT', value: docIntel.properties.endpoint }
            { name: 'LANGUAGE_ENDPOINT', value: language.properties.endpoint }
            { name: 'TRANSLATOR_ENDPOINT', value: translator.properties.endpoint }
            { name: 'TRANSLATOR_REGION', value: location }
            { name: 'SEARCH_ENDPOINT', value: 'https://${search.name}.search.windows.net' }
            { name: 'FOUNDRY_ENDPOINT', value: foundry.properties.endpoint }
            { name: 'FOUNDRY_CHAT_DEPLOYMENT', value: foundryChatDeployment }
            { name: 'KEY_VAULT_URL', value: vault.properties.vaultUri }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
          ]
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

// Built-in auth is enabled once an Entra app registration is supplied.
resource auth 'Microsoft.App/containerApps/authConfigs@2024-10-02-preview' = {
  parent: app
  name: 'current'
  properties: {
    globalValidation: {
      // Keep the SPA public so MSAL can initiate sign-in. Easy Auth validates
      // bearer tokens and the API requires its injected principal header.
      unauthenticatedClientAction: 'AllowAnonymous'
      excludedPaths: [
        '/health'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          openIdIssuer: '${environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            'api://${entraClientId}'
          ]
        }
      }
    }
    platform: {
      enabled: true
    }
  }
}

var roleBlobContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var roleAcrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var roleAcrPush = '8311e382-0749-4cb8-b61a-304f252e45ec'
var roleCosmosDataContributor = '00000000-0000-0000-0000-000000000002'
var roleCognitiveUser = 'a97b65f3-24c7-4388-baec-2e87135dc908'
var roleSearchDataContributor = '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
var roleSearchIndexDataContributor = '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
var roleKeyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, roleBlobContributor)
  scope: storage
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleBlobContributor)
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, roleAcrPull)
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleAcrPull)
  }
}

resource acrPushRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, principalId, roleAcrPush)
  scope: registry
  properties: {
    principalId: principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleAcrPush)
  }
}

resource cosmosRole 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = {
  parent: cosmos
  name: guid(cosmos.id, identity.id, roleCosmosDataContributor)
  properties: {
    principalId: identity.properties.principalId
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/${roleCosmosDataContributor}'
    scope: cosmos.id
  }
}

resource contentSafetyRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(contentSafety.id, identity.id, roleCognitiveUser)
  scope: contentSafety
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource visionRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vision.id, identity.id, roleCognitiveUser)
  scope: vision
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource docIntelRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(docIntel.id, identity.id, roleCognitiveUser)
  scope: docIntel
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource languageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(language.id, identity.id, roleCognitiveUser)
  scope: language
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource translatorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(translator.id, identity.id, roleCognitiveUser)
  scope: translator
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource foundryRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, identity.id, roleCognitiveUser)
  scope: foundry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleCognitiveUser)
  }
}

resource searchRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(search.id, identity.id, roleSearchIndexDataContributor)
  scope: search
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleSearchDataContributor)
  }
}

resource vaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, identity.id, roleKeyVaultSecretsUser)
  scope: vault
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKeyVaultSecretsUser)
  }
}

output containerAppName string = app.name
output containerRegistryName string = registry.name
output containerRegistryEndpoint string = registry.properties.loginServer
output uri string = 'https://${app.properties.configuration.ingress.fqdn}'
output storageUrl string = storage.properties.primaryEndpoints.blob
output cosmosEndpoint string = cosmos.properties.documentEndpoint
output contentSafetyEndpoint string = contentSafety.properties.endpoint
output visionEndpoint string = vision.properties.endpoint
output documentIntelligenceEndpoint string = docIntel.properties.endpoint
output languageEndpoint string = language.properties.endpoint
output translatorEndpoint string = translator.properties.endpoint
output searchEndpoint string = 'https://${search.name}.search.windows.net'
output foundryEndpoint string = foundry.properties.endpoint
output keyVaultUrl string = vault.properties.vaultUri
output appInsightsConnectionString string = insights.properties.ConnectionString
