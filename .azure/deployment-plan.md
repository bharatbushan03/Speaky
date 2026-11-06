# Azure Deployment Plan

> **Status:** Executing — infrastructure files are written. Live provisioning is waiting for a confirmed subscription and location.

Generated: 2026-11-06

---

## 1. Project Overview

**Goal:** Make the existing SpeakReady practice app deployable on Azure, and harden the parts that would fail or be unsafe in production.

**Path:** Modernize Existing

The app stays a Next.js frontend and a FastAPI API. Supabase remains the database and sign-in provider. Azure hosts the two app containers. This plan does not provision resources or spend money until a subscription and region are confirmed.

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Development |
| Scale | Small |
| Budget | Balanced |
| **Subscription** | Not confirmed. `azd up` must not run until the user selects one. |
| **Location** | Parameterized. Suggested default `centralindia` because the user is in IST. Confirm before provision. |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| web | Frontend | Next.js 14, Node 22 | repository root |
| api | API | FastAPI, Python 3.11 | `backend/` |
| data | Existing external | Supabase Auth + Postgres | not created by this plan |

No Aspire project. No existing `azure.yaml`.

---

## 4. Recipe Selection

**Selected:** AZD (Bicep)

**Rationale:** Two long-running services (Next.js server and FastAPI) fit Container Apps. `azd up` builds both images, pushes them to Azure Container Registry, and deploys the Bicep. Terraform was not requested.

---

## 5. Architecture

**Stack:** Containers

### Service Mapping

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| web | Container App | Consumption, 0.5 vCPU, 1 GiB, 1–2 replicas |
| api | Container App | Consumption, 0.5 vCPU, 1 GiB, 1–2 replicas |
| images | Container Registry | Basic, admin user disabled |
| logs | Log Analytics + Application Insights | PerGB2018, 30-day retention |
| secrets | Key Vault + Container App secrets | Standard vault, RBAC |

### Supporting Services

| Service | Purpose |
|---------|---------|
| Log Analytics | Container logs |
| Application Insights | Request telemetry |
| Key Vault | Secret store for the app identities |
| Managed Identity | AcrPull on the registry and Key Vault Secrets User |
| Supabase | Existing auth and database. Not replaced. |

Container Apps start from the public placeholder image. `azd deploy` links each system identity to the registry and then swaps in the built image. Secrets are passed as secure `azd` parameters into Container App secrets. They are not written into Bicep source.

The web app reads `API_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` at runtime, so the API address does not have to be baked into the Next.js build.

---

## 6. Provisioning Limit Checklist

Live quota was not queried. No Azure subscription is selected in this session, and provisioning must wait for that confirmation.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| Microsoft.App/managedEnvironments | 1 | Not queried | Subscription regional quota, commonly well above 1 | Confirm with `az quota` after login |
| Microsoft.App/containerApps | 2 | Not queried | Subscription regional quota | Two apps in one environment |
| Microsoft.ContainerRegistry/registries | 1 | Not queried | Basic registries are a low count | Admin disabled |
| Microsoft.KeyVault/vaults | 1 | Not queried | High regional default | RBAC authorization |
| Microsoft.OperationalInsights/workspaces | 1 | Not queried | High regional default | 30-day retention |
| Microsoft.Insights/components | 1 | Not queried | Workspace-based | Linked to Log Analytics |

**Status:** ⚠️ Quota CLI not run. Do not provision until the user confirms the subscription and location.

Published defaults for a new subscription can hold this set. This is not a live usage reading.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [ ] Confirm subscription and location with user
- [x] Prepare resource inventory
- [ ] Fetch live quotas after the user confirms a subscription
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [ ] **User approved this plan**

### Phase 2: Execution
- [x] Research container app, registry, and azd file layout
- [x] Generate infrastructure files
- [x] Generate Dockerfiles and runtime configuration
- [x] Harden CORS, client IP rate limiting, and security headers
- [ ] Update plan status to "Ready for Validation" only after the subscription is confirmed and azure-validate runs

### Phase 3: Validation
- [ ] Invoke azure-validate skill
- [ ] All validation checks pass
- [ ] Update plan status to "Validated"
- [ ] Record validation proof below

### Phase 4: Deployment
- [ ] Invoke azure-deploy skill only after validation and an explicit yes
- [ ] Deployment successful
- [ ] Report deployed endpoint URLs

---

## 7. Validation Proof

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Not run yet | — | Pending subscription confirmation | — |

**Validated by:** not yet
**Validation timestamp:** —

---

## 8. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | This plan | ✅ |
| `azure.yaml` | AZD services | ⏳ |
| `infra/main.bicep` | Subscription deployment | ⏳ |
| `infra/main.parameters.json` | azd parameter mapping | ⏳ |
| `infra/modules/*.bicep` | Registry, apps, monitoring, roles | ⏳ |
| `Dockerfile` | Next.js image | ⏳ |
| `backend/Dockerfile` | API image | ⏳ |
| `.github/workflows/azure-dev.yml` | Manual azd deploy | ⏳ |

---

## 9. Next Steps

> Current: Execution. Artifacts are being added. `azd up` is not authorized yet.

1. Finish the container and infrastructure files.
2. Ask the user to confirm subscription and region before any Azure write.
3. Run validation, then deploy only after an explicit yes.
