# Docker Architecture, Diagnostics, and Modernization Report

## 1. Executive Summary

This diagnostic deliverable addresses Requirement R1 for PromisePay. It documents the operational status of Docker Desktop on the host development machine, performs a forensic investigation into why Docker was not previously used in the repository's initial hackathon and Phase 0–6 workflows, and details the comprehensive modernization fixes applied to containerize the complete PromisePay stack (PostgreSQL 16, FastAPI backend, Next.js 15 web application, and background verification worker).

As of this evaluation:
- Docker Desktop is fully operational on Windows 11 with WSL2 backend.
- The Docker Compose configuration (`infra/docker-compose.yml`) and container images have been updated to production-grade container standards.
- Ports 5432, 8000, and 3000 bind cleanly without conflicts.
- Healthchecks and deterministic database migrations/seeds have been integrated.

---

## 2. Host Docker Usability & Status Diagnostics

Empirical diagnostics executed directly on the host development workstation confirm the active state of Docker Desktop and its supporting subsystems:

### 2.1 Engine & Client Diagnostics
- **Docker Client Version**: `29.6.2` (Build: `dfc4efb`, API version: `1.55`, OS/Arch: `windows/amd64`, Context: `desktop-linux`).
- **Docker Engine Server**: `Docker Desktop 4.84.0 (234817)` running Engine version `29.6.2` (API version: `1.55`).
- **Container Runtime Subsystem**:
  - Subsystem: Windows Subsystem for Linux (WSL2).
  - Linux Kernel: `6.6.87.2-microsoft-standard-WSL2`.
  - OCI Runtime: `containerd v2.2.5`, `runc 1.3.6`.
- **Docker Compose Version**: `v5.3.1` (Binary location: `C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe`).

### 2.2 Host Port Availability & Bindability
Active TCP port inspection verified the following:
- **Port 5432 (PostgreSQL)**: Although a local Windows service `postgresql-x64-18` is installed on the host, empirical binding tests confirmed that Docker Desktop WSL2 port forwarding successfully claims `0.0.0.0:5432->5432/tcp` without port collision.
- **Port 8000 (FastAPI API)**: Free. Confirmed bindable to `0.0.0.0:8000->8000/tcp`.
- **Port 3000 (Next.js Web)**: Free. Confirmed bindable to `0.0.0.0:3000->3000/tcp`.

### 2.3 Windows Security Isolation & Execution Context
When executing commands via agent subshells or automated runners on Windows, interaction with Docker Desktop requires access to the Windows named pipe:
`\\.\pipe\docker_engine` and user profile configuration at `C:\Users\<User>\.docker\config.json`.
- Sandboxed or restricted execution environments fail with access denied errors:
  ```text
  WARNING: Error loading config file: open C:\Users\Shind\.docker\config.json: Access is denied.
  permission denied while trying to connect to the docker API at npipe:////./pipe/docker_engine
  ```
- Executing with standard user privileges / unsandboxed context (`BypassSandbox: true` in developer tooling) or explicitly setting `$env:DOCKER_CONFIG = "$env:TEMP\docker"` completely resolves access restrictions, allowing reliable communication with the Docker Desktop daemon.

---

## 3. Historical Analysis: Why Docker Was Not Previously Used

An in-depth code and git commit history review reveals four clear architectural and strategic reasons why Docker was bypassed during earlier stages of PromisePay development:

### 3.1 Pillar 1: Hackathon Evaluation Constraints (<2 Minute Quickstart)
PromisePay was built as an enterprise-grade hackathon prototype for PayPal integration. A primary judging criterion was the ability for judges and evaluators to clone the repository and run the live demo in under 2 minutes:
- Documented in `docs/DEMO_GUIDE.md`: The official quickstart instructed evaluators to run native `npm run dev:api` and `npm run dev:web`.
- Requiring judges to have Docker Desktop pre-installed, WSL2 properly configured, and 2GB+ of base container images downloaded would have introduced high evaluation friction, potential Windows virtualization conflicts, and prolonged onboarding times.

### 3.2 Pillar 2: Autonomous In-Memory State Model
The backend architecture was deliberately engineered to operate without external infrastructure dependencies:
- In `services/api/promisepay_api/services/promise_store.py` (lines 300–412) and `evidence_store.py` (lines 26–28), the API initializes with comprehensive in-memory singleton demo records (`PP-DEMO1-2026`, buyer/seller identities, milestones, dispute dossiers).
- The `POST /demo/reset` endpoint (`services/api/promisepay_api/routers/health.py:137-148`) allows instantaneous state resetting for automated tests and live demos.
- Consequently, a live PostgreSQL database instance was not required to demonstrate core escrow workflows, dispute resolution, or PayPal sandbox captures.

### 3.3 Pillar 3: Native Monorepo Tooling (`run_python.js`)
To provide developers with an instant feedback loop across Windows, macOS, and Linux:
- The project implemented `infra/scripts/run_python.js`, which detects local virtual environments (`.venv/Scripts/python.exe` or `.venv/bin/python`) dynamically.
- `package.json` scripts (`npm run dev:api`, `npm run dev:web`, `npm test`) enabled sub-second hot reloading with Uvicorn and Next.js Turbopack/Webpack on native host processes without the container build cycle.

### 3.4 Pillar 4: Configuration Drift Since Phase 0
- Docker configuration files (`infra/docker-compose.yml`, `apps/web/Dockerfile`, `services/api/Dockerfile`) were originally created in commit `645b7f8` ("feat: complete Phase 0 foundations").
- As rapid development proceeded through Phases 1 through 6, the Docker definitions remained untouched. This led to configuration drift:
  - Missing `.dockerignore` files allowed host Windows `node_modules` and Python caches to leak into builds.
  - Next.js 15 defaulted to binding to `127.0.0.1` inside containers instead of `0.0.0.0`, preventing host browser connectivity.
  - Alpine Linux lacked `libc6-compat` required by Next.js SWC binary compilers.
  - PostgreSQL database seeding was not mounted into `/docker-entrypoint-initdb.d/`.

---

## 4. Modernization Fixes Applied

To elevate the repository to professional containerization standards for ongoing development, team onboarding, and CI/CD pipelines, the following changes were executed:

### 4.1 Web Application Containerization (`apps/web/`)
1. **Alpine SWC & Health Probes**:
   Added `RUN apk add --no-cache libc6-compat curl` to `apps/web/Dockerfile`. This provides the musl/glibc compatibility layer required for Next.js 15 SWC binary modules and provides `curl` for container health checks.
2. **Deterministic Dependency Resolution**:
   Updated `apps/web/Dockerfile` to copy `package.json`, `package-lock.json*`, and `.npmrc*` together, running `npm install --legacy-peer-deps` to respect the repository's strict peer dependency configuration.
3. **External Network Interface Binding**:
   Added `ENV HOSTNAME="0.0.0.0"` in `apps/web/Dockerfile` and passed `HOSTNAME: 0.0.0.0` in Compose environment variables so `next dev` accepts connections from host port 3000.
4. **Build Context Isolation (`apps/web/.dockerignore`)**:
   Created `.dockerignore` ignoring `node_modules`, `.next`, `out`, `build`, `.env*.local`, `*.tsbuildinfo`, `*.log`, `.git`, and `.turbo`. Host Windows node binaries no longer pollute Linux containers.

### 4.2 API Backend Containerization (`services/api/`)
1. **Build Context Isolation (`services/api/.dockerignore`)**:
   Created `.dockerignore` ignoring `__pycache__`, `*.py[cod]`, `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `.venv`, `.git`, and environment files to prevent Windows bytecode and local virtual environments from entering the Debian Linux image.
2. **Rust Verifier Pure-Python Fallback**:
   Verified that `promisepay_api.services.rust_verifier` includes pure-Python cryptographic fallbacks using SHA-256 and HMAC, allowing full escrow verification functionality in containers without requiring the heavy Rust compilation toolchain.

### 4.3 Worker Service Containerization (`services/worker/`)
1. **Dockerfile Creation**:
   Created `services/worker/Dockerfile` based on `python:3.11-slim`, setting `PYTHONUNBUFFERED=1` and `PYTHONPATH=/app`.
2. **Build Context Isolation (`services/worker/.dockerignore`)**:
   Created `.dockerignore` mirroring API cache exclusion rules.
3. **Profile Isolation in Docker Compose**:
   Registered `worker` under `profiles: ["worker", "all"]` in `infra/docker-compose.yml`. Standard `docker compose up -d` boots the primary web stack (`postgres`, `api`, `web`), while background verification can be launched with `docker compose --profile worker up -d`.

### 4.4 Docker Compose Architecture (`infra/docker-compose.yml`)
1. **Sequential Database Initialization & Supabase Role Pre-provisioning**:
   Mounted both migration and seed scripts into `/docker-entrypoint-initdb.d/`:
   - `./supabase/migrations/00001_initial_schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro`
   - `./supabase/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql:ro`
   Added entrypoint command `echo 'CREATE ROLE service_role; CREATE ROLE authenticated; CREATE ROLE anon;' > /docker-entrypoint-initdb.d/00_roles.sql && exec docker-entrypoint.sh postgres` to provide the Supabase RLS roles expected by the initial schema. This guarantees tables and row-level security policies compile cleanly on standard PostgreSQL, followed by automatic demo seed data insertion (`promises`, `users`, `organizations`).
2. **Robust Container Healthchecks**:
   - `postgres`: `pg_isready -U postgres -d promisepay` (interval 5s, timeout 5s, retries 5).
   - `api`: `curl -f http://localhost:8000/health` (interval 10s, timeout 5s, retries 5, start_period 10s).
   - `web`: `curl -f http://localhost:3000/api/health` (interval 10s, timeout 5s, retries 5, start_period 20s).
3. **Network Architecture**:
   Configured explicit bridge network `promisepay-network` for reliable DNS resolution between containers.
4. **Environment Passthrough**:
   Added `env_file: [ path: ../.env, required: false ]` across all services to seamlessly pass PayPal sandbox credentials and OpenAI API keys when present.

---

## 5. Verification Commands and Health Contracts

To run and verify the modernized stack:

```powershell
# 1. Validate configuration
docker compose -f infra/docker-compose.yml config

# 2. Build and start containers
docker compose -f infra/docker-compose.yml up --build -d

# 3. Check container health status (wait ~15s for healthchecks)
docker compose -f infra/docker-compose.yml ps

# 4. Verify endpoints
curl.exe -f http://localhost:8000/health
curl.exe -f http://localhost:8000/docs
curl.exe -f http://localhost:3000/api/health
curl.exe -f http://localhost:3000

# 5. Verify database seed
docker exec promisepay-postgres psql -U postgres -d promisepay -c "SELECT count(*) FROM promises;"
```
