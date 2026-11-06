targetScope = 'subscription'

@description('Short name for this environment, usually set by azd as AZURE_ENV_NAME.')
@minLength(1)
@maxLength(32)
param environmentName string

@description('Azure region. centralindia is a reasonable default for users in India.')
param location string

@description('Random string of at least 32 characters. Not the placeholder from .env.example.')
@secure()
@minLength(32)
param secretKey string

@description('Supabase project URL, for example https://your-project.supabase.co.')
param supabaseUrl string

@description('Supabase anon key. This key is public in the browser. Do not put the service-role key here.')
@secure()
param supabaseAnonKey string

@description('mock, openai, or azure_openai.')
param aiProvider string = 'mock'

@description('Required only when AI_PROVIDER=openai. Leave empty for mock.')
@secure()
param openAiApiKey string = ''

param openAiModel string = 'gpt-4o-mini'

@description('Azure OpenAI or Microsoft Foundry endpoint. Required only for azure_openai.')
param azureOpenAiEndpoint string = ''

@description('Required only when AI_PROVIDER=azure_openai.')
@secure()
param azureOpenAiApiKey string = ''

param azureOpenAiDeployment string = ''

var resourceSuffix = take(uniqueString(subscription().id, environmentName, location), 6)
var compactName = take(toLower(replace(environmentName, '-', '')), 12)
var tags = {
  'azd-env-name': environmentName
}
var registryName = 'cr${compactName}${resourceSuffix}'
var vaultName = 'kv${compactName}${resourceSuffix}'
var apiName = 'ca-api-${resourceSuffix}'
var webName = 'ca-web-${resourceSuffix}'
var placeholderImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    name: compactName
    location: location
    tags: tags
    environmentName: 'cae-${compactName}-${resourceSuffix}'
  }
}

module registry './modules/registry.bicep' = {
  name: 'registry'
  scope: resourceGroup
  params: {
    name: registryName
    location: location
    tags: tags
  }
}

module keyVault './modules/keyvault.bicep' = {
  name: 'keyVault'
  scope: resourceGroup
  params: {
    name: vaultName
    location: location
    tags: tags
  }
}

var apiHost = '${apiName}.${monitoring.outputs.defaultDomain}'
var webHost = '${webName}.${monitoring.outputs.defaultDomain}'

var apiSecrets = concat(
  [
    {
      name: 'secret-key'
      value: secretKey
    }
    {
      name: 'supabase-anon-key'
      value: supabaseAnonKey
    }
  ],
  empty(openAiApiKey) ? [] : [
    {
      name: 'openai-api-key'
      value: openAiApiKey
    }
  ],
  empty(azureOpenAiApiKey) ? [] : [
    {
      name: 'azure-openai-api-key'
      value: azureOpenAiApiKey
    }
  ]
)

var apiEnv = concat(
  [
    { name: 'PORT', value: '8000' }
    { name: 'ENVIRONMENT', value: 'production' }
    { name: 'DEBUG', value: 'False' }
    { name: 'LOG_LEVEL', value: 'INFO' }
    { name: 'AI_PROVIDER', value: aiProvider }
    { name: 'AI_REQUEST_TIMEOUT_SECONDS', value: '60' }
    { name: 'OPENAI_MODEL', value: openAiModel }
    { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
    { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAiDeployment }
    { name: 'ALLOWED_ORIGINS', value: 'https://${webHost}' }
    { name: 'SUPABASE_URL', value: supabaseUrl }
    { name: 'SECRET_KEY', secretRef: 'secret-key' }
    { name: 'SUPABASE_ANON_KEY', secretRef: 'supabase-anon-key' }
    { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: monitoring.outputs.connectionString }
  ],
  empty(openAiApiKey) ? [] : [
    { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
  ],
  empty(azureOpenAiApiKey) ? [] : [
    { name: 'AZURE_OPENAI_API_KEY', secretRef: 'azure-openai-api-key' }
  ]
)

module api './modules/container-app.bicep' = {
  name: 'api'
  scope: resourceGroup
  params: {
    name: apiName
    location: location
    tags: tags
    environmentId: monitoring.outputs.environmentId
    containerImage: placeholderImage
    targetPort: 8000
    env: apiEnv
    secrets: apiSecrets
    livenessPath: '/health'
    readinessPath: '/api/v1/health/ready'
    serviceName: 'api'
  }
}

module web './modules/container-app.bicep' = {
  name: 'web'
  scope: resourceGroup
  params: {
    name: webName
    location: location
    tags: tags
    environmentId: monitoring.outputs.environmentId
    containerImage: placeholderImage
    targetPort: 3000
    env: [
      { name: 'PORT', value: '3000' }
      { name: 'HOSTNAME', value: '0.0.0.0' }
      { name: 'NODE_ENV', value: 'production' }
      { name: 'API_URL', value: 'https://${apiHost}' }
      { name: 'SUPABASE_URL', value: supabaseUrl }
      { name: 'SUPABASE_ANON_KEY', secretRef: 'supabase-anon-key' }
      { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: monitoring.outputs.connectionString }
    ]
    secrets: [
      {
        name: 'supabase-anon-key'
        value: supabaseAnonKey
      }
    ]
    livenessPath: '/api/health'
    readinessPath: '/api/health'
    serviceName: 'web'
  }
}

module apiAcrPull './modules/acr-pull.bicep' = {
  name: 'apiAcrPull'
  scope: resourceGroup
  params: {
    registryName: registry.outputs.name
    principalId: api.outputs.principalId
  }
}

module webAcrPull './modules/acr-pull.bicep' = {
  name: 'webAcrPull'
  scope: resourceGroup
  params: {
    registryName: registry.outputs.name
    principalId: web.outputs.principalId
  }
}

module apiKeyVaultRole './modules/keyvault-secrets-user.bicep' = {
  name: 'apiKeyVaultRole'
  scope: resourceGroup
  params: {
    vaultName: keyVault.outputs.name
    principalId: api.outputs.principalId
  }
}

module webKeyVaultRole './modules/keyvault-secrets-user.bicep' = {
  name: 'webKeyVaultRole'
  scope: resourceGroup
  params: {
    vaultName: keyVault.outputs.name
    principalId: web.outputs.principalId
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_LOCATION string = location
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = registry.outputs.name
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output API_URL string = 'https://${api.outputs.fqdn}'
output WEB_URL string = 'https://${web.outputs.fqdn}'
