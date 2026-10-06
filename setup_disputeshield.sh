#!/usr/bin/env bash
# setup_disputeshield.sh
# Scaffolds the DisputeShield project (PayPal + AI hackathon) per ANTIGRAVITY_CONTEXT.md.
#
# Usage:
#   bash setup_disputeshield.sh [project_dir]      # default: ./disputeshield
#   FORCE=1 bash setup_disputeshield.sh            # overwrite existing files
#
# Existing files are never overwritten unless FORCE=1.
set -euo pipefail

PROJECT="${1:-disputeshield}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YEAR="$(date +%Y)"

mkdir -p "$PROJECT"
cd "$PROJECT"

# ---------- helpers ----------
# w <path>   : write stdin to path (creates parent dirs, skips if exists unless FORCE=1)
w() {
  mkdir -p "$(dirname "$1")"
  if [ -e "$1" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "  skip    $1"
    cat > /dev/null
  else
    cat > "$1"
    echo "  create  $1"
  fi
}
# py <path> <description> : python stub with module docstring
py() { printf '"""%s"""\n' "$2" | w "$1"; }
# ts <path> <description> : TS/TSX stub
ts() { printf '// TODO: %s\nexport {};\n' "$2" | w "$1"; }
# md <path> <title> : markdown stub
md() { printf '# %s\n\nTODO\n' "$2" | w "$1"; }
# dir <path...> : just make directories
dir() { for d in "$@"; do mkdir -p "$d"; done; }

echo "Scaffolding DisputeShield in: $(pwd)"

# ---------- directories ----------
dir .github/workflows .agent/rules docs/postman \
    backend/app/api/routes backend/app/paypal backend/app/agent/prompts backend/app/agent/steps \
    backend/app/decision backend/app/rag backend/app/models backend/app/services \
    backend/app/seed/fixtures backend/knowledge_base/policies backend/scripts \
    backend/tests/unit backend/tests/integration backend/data \
    frontend/src/app/disputes/\[id\] frontend/src/app/demo-store frontend/src/app/settings \
    frontend/src/components frontend/src/lib frontend/public

# ---------- root files ----------
w .gitignore <<'EOF'
# env / secrets
.env
.env.*
!.env.example

# python
__pycache__/
*.pyc
.venv/
venv/
.pytest_cache/
.ruff_cache/
*.egg-info/

# data
*.db
backend/data/kb_index/

# node
node_modules/
.next/
out/

# os / ide
.DS_Store
.idea/
.vscode/
EOF

w LICENSE <<EOF
MIT License

Copyright (c) ${YEAR} Subhankar Nandi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

w .env.example <<'EOF'
# ---- PayPal (SANDBOX ONLY) ----
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=

# ---- AI ----
ANTHROPIC_API_KEY=
LLM_MODEL=claude-sonnet-5-5
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# ---- App ----
DATABASE_URL=sqlite:///./disputeshield.db
SIMULATION_MODE=true
CORS_ORIGINS=http://localhost:3000
DEFAULT_DISPUTE_FEE=20.00
DEFAULT_EFFORT_COST=5.00
ZAPIER_WEBHOOK_URL=

# ---- Frontend ----
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
EOF

w Makefile <<'EOF'
.PHONY: setup dev backend frontend test lint seed index

setup:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install
	@test -f .env || cp .env.example .env
	@echo "Edit .env with your sandbox credentials."

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Run 'make backend' and 'make frontend' in two terminals."

test:
	cd backend && . .venv/bin/activate && pytest -q

lint:
	cd backend && . .venv/bin/activate && ruff check .

index:
	cd backend && . .venv/bin/activate && python scripts/build_index.py

seed:
	cd backend && . .venv/bin/activate && python scripts/seed_sandbox.py
EOF

w docker-compose.yml <<'EOF'
services:
  backend:
    build: ./backend
    env_file: .env
    ports: ["8000:8000"]
    volumes:
      - ./backend/data:/app/data
  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm run dev"
    env_file: .env
    ports: ["3000:3000"]
    depends_on: [backend]
EOF

w render.yaml <<'EOF'
# Render blueprint (adjust names/plans). Set secrets in the Render dashboard, not here.
services:
  - type: web
    name: disputeshield-api
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt && python scripts/build_index.py
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PAYPAL_BASE_URL
        value: https://api-m.sandbox.paypal.com
      - key: SIMULATION_MODE
        value: "true"
      - key: PAYPAL_CLIENT_ID
        sync: false
      - key: PAYPAL_CLIENT_SECRET
        sync: false
      - key: PAYPAL_WEBHOOK_ID
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
  - type: web
    name: disputeshield-web
    runtime: node
    rootDir: frontend
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NEXT_PUBLIC_API_URL
        sync: false
      - key: NEXT_PUBLIC_PAYPAL_CLIENT_ID
        sync: false
EOF

w .github/workflows/ci.yml <<'EOF'
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest -q
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
EOF

w AGENTS.md <<'EOF'
# Agent instructions

Before doing anything, read `docs/ANTIGRAVITY_CONTEXT.md` completely. It contains the SRS,
architecture, repo layout, phased plan, and rules of engagement. Follow the phase order,
use PayPal sandbox only, never commit secrets, and require merchant approval before any
PayPal write action.
EOF

w .agent/rules/00-project-context.md <<'EOF'
# Project context rule

Always follow `docs/ANTIGRAVITY_CONTEXT.md`. Work phase by phase, verify PayPal API details
in the official docs, keep tests green, and stop for review at the end of each phase.
EOF

w README.md <<'EOF'
# DisputeShield

AI agent that helps small PayPal sellers fight (or wisely concede) disputes and chargebacks.

> TODO: problem, solution, features, architecture diagram, tools used (PayPal APIs, Claude, sentence-transformers,
> AG Grid, Render...), setup and run instructions, demo video link, limitations, license.

## Quick start (placeholder)
```bash
cp .env.example .env     # add sandbox credentials
make setup
make backend             # terminal 1
make frontend            # terminal 2
```
EOF

# ---------- docs ----------
if [ -f "$SCRIPT_DIR/ANTIGRAVITY_CONTEXT.md" ]; then
  cp -n "$SCRIPT_DIR/ANTIGRAVITY_CONTEXT.md" docs/ANTIGRAVITY_CONTEXT.md 2>/dev/null || true
  [ "${FORCE:-0}" = "1" ] && cp "$SCRIPT_DIR/ANTIGRAVITY_CONTEXT.md" docs/ANTIGRAVITY_CONTEXT.md
  echo "  copy    docs/ANTIGRAVITY_CONTEXT.md"
else
  md docs/ANTIGRAVITY_CONTEXT.md "Paste ANTIGRAVITY_CONTEXT.md here"
  echo "  NOTE: ANTIGRAVITY_CONTEXT.md not found next to this script. Copy it into docs/."
fi
md docs/SRS.md "SRS (see Section 2 of ANTIGRAVITY_CONTEXT.md; keep in sync)"
md docs/architecture.md "Architecture and Verified PayPal API notes"
md docs/DEMO_SCRIPT.md "Demo video script (under 3 minutes)"
w docs/SUBMISSION_CHECKLIST.md <<'EOF'
# Submission checklist
- [ ] Public repo with MIT LICENSE visible in About
- [ ] README: description, features, architecture, tools used, run steps
- [ ] Hosted demo URL (Render) and/or complete run instructions
- [ ] Text description (features and functionality)
- [ ] Tools list and how each is used (PayPal APIs, AI model, sponsor tools if any)
- [ ] Demo video < 3 min, public on YouTube, no third-party trademarks/copyrighted music
- [ ] No secrets in git history
- [ ] CI green, fresh-clone run verified
EOF
w docs/postman/DisputeShield.postman_collection.json <<'EOF'
{ "info": { "name": "DisputeShield", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, "item": [] }
EOF

# ---------- backend: config / infra ----------
w backend/requirements.txt <<'EOF'
fastapi>=0.110
uvicorn[standard]>=0.29
httpx>=0.27
pydantic>=2.6
pydantic-settings>=2.2
sqlalchemy>=2.0
anthropic>=0.40
sentence-transformers>=2.7
numpy>=1.26
tenacity>=8.2
python-multipart>=0.0.9
structlog>=24.1
pytest>=8.0
pytest-asyncio>=0.23
respx>=0.21
ruff>=0.4
EOF

w backend/pytest.ini <<'EOF'
[pytest]
asyncio_mode = auto
testpaths = tests
EOF

w backend/Dockerfile <<'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# ---------- backend: app core ----------
py backend/app/__init__.py "DisputeShield backend."

w backend/app/config.py <<'EOF'
"""Application settings loaded from environment variables."""
from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PayPal (sandbox only)
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_webhook_id: str = ""

    # AI
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-5-5"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # App
    database_url: str = "sqlite:///./disputeshield.db"
    simulation_mode: bool = True
    cors_origins: str = "http://localhost:3000"
    default_dispute_fee: Decimal = Decimal("20.00")
    default_effort_cost: Decimal = Decimal("5.00")
    zapier_webhook_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
EOF

w backend/app/main.py <<'EOF'
"""FastAPI application factory."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="DisputeShield API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    # TODO: include webhooks, disputes, orders, stats, settings, simulate routers
    return app


app = create_app()
EOF

py backend/app/db.py "SQLAlchemy engine, session factory, Base. TODO (Phase 1/2)."
py backend/app/logging_setup.py "Structured logging setup with dispute-id correlation. TODO."
py backend/app/api/__init__.py "API package."
py backend/app/api/deps.py "FastAPI dependencies (db session, settings, clients). TODO."
py backend/app/api/routes/__init__.py "Routes package."

w backend/app/api/routes/health.py <<'EOF'
"""Health endpoints."""
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "simulation_mode": get_settings().simulation_mode}


@router.get("/ready")
def ready() -> dict:
    # TODO: check DB, KB index, PayPal token reachability
    return {"status": "ready"}
EOF

py backend/app/api/routes/webhooks.py "POST /webhooks/paypal: verify signature, dedupe on event id, store raw event, enqueue pipeline. TODO (Phase 2)."
py backend/app/api/routes/disputes.py "Dispute list/detail/analyse/approve/reject/edit-draft endpoints. TODO (Phase 5-6)."
py backend/app/api/routes/orders.py "Create/capture sandbox orders for the demo storefront. TODO (Phase 1)."
py backend/app/api/routes/stats.py "Dashboard metrics endpoint. TODO (Phase 7)."
py backend/app/api/routes/settings.py "Merchant assumptions (fee, effort cost, base rates). TODO."
py backend/app/api/routes/simulate.py "Create a simulated dispute from fixtures. TODO (Phase 2)."

# ---------- backend: PayPal ----------
py backend/app/paypal/__init__.py "PayPal integration package."

w backend/app/paypal/errors.py <<'EOF'
"""PayPal integration errors."""


class PayPalError(Exception):
    def __init__(self, message: str, status_code: int | None = None, details: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class PayPalAuthError(PayPalError):
    pass
EOF

w backend/app/paypal/auth.py <<'EOF'
"""OAuth2 client-credentials token cache for the PayPal REST API (sandbox)."""
import time

import httpx

from app.config import Settings, get_settings
from app.paypal.errors import PayPalAuthError


class TokenProvider:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._token: str | None = None
        self._expires_at: float = 0.0

    async def get_token(self) -> str:
        # refresh 60s before expiry
        if self._token and time.time() < self._expires_at - 60:
            return self._token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.settings.paypal_base_url}/v1/oauth2/token",
                auth=(self.settings.paypal_client_id, self.settings.paypal_client_secret),
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json"},
            )
        if resp.status_code != 200:
            raise PayPalAuthError("Failed to obtain PayPal token", resp.status_code, {"body": resp.text})
        data = resp.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + int(data.get("expires_in", 300))
        return self._token
EOF

w backend/app/paypal/client.py <<'EOF'
"""Thin async PayPal REST client: bearer auth, retries on 429/5xx, idempotency header."""
import uuid

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.paypal.auth import TokenProvider
from app.paypal.errors import PayPalError


class _Retryable(Exception):
    pass


class PayPalClient:
    def __init__(self, settings: Settings | None = None, tokens: TokenProvider | None = None):
        self.settings = settings or get_settings()
        self.tokens = tokens or TokenProvider(self.settings)

    @retry(
        retry=retry_if_exception_type(_Retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=4),
        reraise=True,
    )
    async def request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
        params: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        token = await self.tokens.get_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        if method.upper() in {"POST", "PATCH", "PUT"}:
            # Same key on retries => PayPal treats the write as idempotent (verify per endpoint in docs)
            headers["PayPal-Request-Id"] = idempotency_key or str(uuid.uuid4())
        async with httpx.AsyncClient(base_url=self.settings.paypal_base_url, timeout=30) as client:
            resp = await client.request(method, path, json=json, params=params, headers=headers)
        if resp.status_code in (429, 500, 502, 503, 504):
            raise _Retryable(f"PayPal transient error {resp.status_code}")
        if resp.status_code >= 400:
            try:
                details = resp.json()
            except ValueError:
                details = {"body": resp.text}
            raise PayPalError(f"PayPal API error {resp.status_code}", resp.status_code, details)
        return resp.json() if resp.content else {}
EOF

py backend/app/paypal/orders.py "Orders v2: create and capture. TODO (Phase 1) - verify endpoints in official docs."
py backend/app/paypal/disputes.py "Disputes API: list, get, provide-evidence, accept-claim, make-offer, send-message. TODO (Phase 2/6)."
py backend/app/paypal/payments.py "Payments v2: refund a capture. TODO (Phase 6)."
py backend/app/paypal/transactions.py "Optional: reporting/transactions enrichment. TODO."
py backend/app/paypal/webhooks.py "Webhook signature verification via verify-webhook-signature. TODO (Phase 2)."
py backend/app/paypal/schemas.py "Pydantic models for PayPal payloads. TODO."

# ---------- backend: decision engine (real starter) ----------
py backend/app/decision/__init__.py "Deterministic decision engine."

w backend/app/decision/assumptions.py <<'EOF'
"""Configurable ASSUMPTIONS (not PayPal statistics). Label as assumptions everywhere they are shown."""
from decimal import Decimal

DEFAULT_FEE = Decimal("20.00")
DEFAULT_EFFORT_COST = Decimal("5.00")

# Illustrative base win rates per category if evidence were perfect-ish. Tune/override in settings.
BASE_RATES: dict[str, float] = {
    "item_not_received": 0.60,
    "not_as_described": 0.40,
    "unauthorized": 0.30,
    "duplicate": 0.50,
    "other": 0.35,
}
P_MIN, P_MAX = 0.02, 0.95
EOF

w backend/app/decision/engine.py <<'EOF'
"""Fight-vs-accept decision engine (SRS section 2.9).

EV_fight = p*A - (1-p)*F - E      (value of fighting relative to accepting)
Fight when EV_fight > 0  <=>  p > (F + E) / (A + F)
"""
from dataclasses import dataclass
from decimal import Decimal

from app.decision.assumptions import BASE_RATES, P_MAX, P_MIN


@dataclass(frozen=True)
class Decision:
    recommendation: str  # "fight" | "accept"
    p_win: float
    ev_fight: Decimal
    threshold: float
    explanation: str


def estimate_p_win(category: str, evidence_score: float, adjustment: float = 0.0,
                   base_rates: dict[str, float] | None = None) -> float:
    rates = base_rates or BASE_RATES
    base = rates.get(category, rates["other"])
    evidence_score = min(max(evidence_score, 0.0), 1.0)
    p = base * (0.5 + 0.5 * evidence_score) + adjustment
    return min(max(p, P_MIN), P_MAX)


def decide(amount: Decimal, fee: Decimal, effort_cost: Decimal, p_win: float) -> Decision:
    a, f, e = Decimal(amount), Decimal(fee), Decimal(effort_cost)
    if a <= 0:
        raise ValueError("amount must be positive")
    p = Decimal(str(p_win))
    ev = p * a - (Decimal(1) - p) * f - e
    threshold = float((f + e) / (a + f))
    rec = "fight" if ev > 0 else "accept"
    explanation = (
        f"Win probability {p_win:.0%} vs break-even {threshold:.0%}. "
        f"Expected value of fighting = {p_win:.2f} x {a} - {1 - p_win:.2f} x {f} - {e} = {ev.quantize(Decimal('0.01'))}. "
        f"Recommendation: {rec}."
    )
    return Decision(rec, p_win, ev.quantize(Decimal("0.01")), threshold, explanation)
EOF

py backend/app/decision/rubric.py "Evidence-strength rubric -> evidence_score in [0,1], computed deterministically from extracted facts. TODO (Phase 3)."

# ---------- backend: RAG ----------
py backend/app/rag/__init__.py "Policy knowledge-base RAG."
py backend/app/rag/embeddings.py "sentence-transformers embedding wrapper. TODO (Phase 4)."
py backend/app/rag/index.py "Build/load/query numpy cosine index persisted in backend/data/kb_index. TODO (Phase 4)."
py backend/app/rag/ingest.py "Chunk markdown policy files by heading. TODO (Phase 4)."
py backend/app/rag/retriever.py "Top-k retrieval with min-score filter and citation ids. TODO (Phase 4)."

# ---------- backend: agent ----------
py backend/app/agent/__init__.py "AI agent pipeline."
py backend/app/agent/pipeline.py "Orchestrates stages: ingest->enrich->classify->retrieve->score_evidence->decide->draft->await_approval->execute->record. TODO (Phase 5)."
py backend/app/agent/state.py "Typed PipelineState. TODO (Phase 5)."
py backend/app/agent/llm.py "Anthropic client wrapper with Pydantic-validated JSON output and one retry. TODO (Phase 5)."
py backend/app/agent/schemas.py "LLM input/output schemas. TODO (Phase 5)."
py backend/app/agent/steps/__init__.py "Pipeline steps."
for s in ingest enrich classify retrieve score_evidence decide draft execute; do
  py "backend/app/agent/steps/${s}.py" "Pipeline step: ${s}. TODO."
done
for p in classify extract_facts draft_evidence draft_message; do
  printf -- '---\nversion: 1\n---\n# Prompt: %s\n\nTODO\n' "$p" | w "backend/app/agent/prompts/${p}.md"
done

# ---------- backend: models / services / seed ----------
py backend/app/models/__init__.py "SQLAlchemy models (SRS section 2.8)."
for m in merchant order shipment dispute analysis evidence_package action audit_log webhook_event kb_chunk; do
  py "backend/app/models/${m}.py" "Model: ${m}. TODO."
done
py backend/app/services/__init__.py "Service layer."
py backend/app/services/dispute_service.py "Upsert/fetch disputes, orchestrate analysis. TODO."
py backend/app/services/evidence_builder.py "Build evidence packages from enrichment facts (no invented facts). TODO."
py backend/app/services/audit.py "Append-only audit logging helper. TODO."
py backend/app/services/notifier.py "Optional Zapier/Slack notifications. TODO (stretch)."
py backend/app/services/stats.py "Dashboard statistics. TODO."
py backend/app/seed/__init__.py "Seed and simulation utilities."
py backend/app/seed/seed_data.py "Create sandbox orders and local fixture data. TODO."
py backend/app/seed/simulate.py "Simulate realistic disputes from fixtures. TODO."

w backend/app/seed/fixtures/inr_delivered.json <<'EOF'
{
  "scenario": "item_not_received_but_delivered",
  "dispute": { "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "amount": "89.00", "currency": "USD" },
  "order": { "item_name": "Handmade ceramic mug set", "item_cost": "32.00" },
  "shipment": { "carrier": "DHL", "tracking_number": "SIM123456789", "status": "DELIVERED", "delivered_days_before_dispute": 6 },
  "messages": ["Buyer: I never got my package."]
}
EOF
w backend/app/seed/fixtures/inr_no_tracking.json <<'EOF'
{
  "scenario": "item_not_received_no_tracking",
  "dispute": { "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "amount": "24.00", "currency": "USD" },
  "order": { "item_name": "Phone case", "item_cost": "6.00" },
  "shipment": null,
  "messages": ["Buyer: Still waiting for my order."]
}
EOF
w backend/app/seed/fixtures/snad.json <<'EOF'
{
  "scenario": "not_as_described",
  "dispute": { "reason": "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", "amount": "140.00", "currency": "USD" },
  "order": { "item_name": "Vintage leather bag", "item_cost": "60.00" },
  "shipment": { "carrier": "FedEx", "tracking_number": "SIM987654321", "status": "DELIVERED", "delivered_days_before_dispute": 3 },
  "messages": ["Buyer: Colour is different from the photos."]
}
EOF
w backend/app/seed/fixtures/unauthorized.json <<'EOF'
{
  "scenario": "unauthorized_transaction",
  "dispute": { "reason": "UNAUTHORISED", "amount": "310.00", "currency": "USD" },
  "order": { "item_name": "Wireless headphones", "item_cost": "150.00" },
  "shipment": { "carrier": "UPS", "tracking_number": "SIM555000111", "status": "DELIVERED", "delivered_days_before_dispute": 10 },
  "messages": ["Buyer: I did not make this purchase."]
}
EOF

# ---------- backend: knowledge base, scripts, tests ----------
w backend/knowledge_base/policies/README.md <<'EOF'
# Policy knowledge base

Write concise summaries IN YOUR OWN WORDS from PayPal's public documentation. Put the source URL at the top of each file.
Suggested files: item-not-received.md, not-as-described.md, unauthorized.md, evidence-types.md,
tracking-and-proof-of-delivery.md, response-deadlines.md, refunds-and-offers.md, seller-protection-overview.md.
EOF
py backend/scripts/seed_sandbox.py "CLI: create sandbox orders and load fixtures. TODO (Phase 2)."
py backend/scripts/build_index.py "CLI: build the policy KB vector index. TODO (Phase 4)."
py backend/scripts/register_webhook.py "CLI: register the PayPal webhook for dispute events. TODO (Phase 2)."
touch backend/tests/unit/__init__.py backend/tests/integration/__init__.py
py backend/tests/conftest.py "Shared pytest fixtures."

w backend/tests/unit/test_decision_engine.py <<'EOF'
from decimal import Decimal

import pytest

from app.decision.engine import decide, estimate_p_win


def test_fights_when_p_above_threshold():
    d = decide(Decimal("100"), Decimal("20"), Decimal("5"), 0.8)
    assert d.recommendation == "fight"
    assert d.ev_fight > 0


def test_accepts_when_p_below_threshold():
    d = decide(Decimal("10"), Decimal("20"), Decimal("5"), 0.3)
    assert d.recommendation == "accept"


def test_threshold_formula():
    d = decide(Decimal("100"), Decimal("20"), Decimal("5"), 0.5)
    assert d.threshold == pytest.approx(25 / 120)


def test_p_win_is_clamped():
    assert estimate_p_win("item_not_received", 1.0, adjustment=5.0) <= 0.95
    assert estimate_p_win("item_not_received", 0.0, adjustment=-5.0) >= 0.02


def test_invalid_amount():
    with pytest.raises(ValueError):
        decide(Decimal("0"), Decimal("20"), Decimal("5"), 0.5)
EOF

# ---------- frontend ----------
w frontend/package.json <<'EOF'
{
  "name": "disputeshield-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "@paypal/react-paypal-js": "^8.5.0",
    "ag-grid-community": "^32.0.0",
    "ag-grid-react": "^32.0.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
EOF
w frontend/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "es2020", "lib": ["dom", "dom.iterable", "esnext"], "allowJs": false, "skipLibCheck": true,
    "strict": true, "noEmit": true, "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve", "incremental": true,
    "plugins": [{ "name": "next" }], "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
w frontend/next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true };
EOF
w frontend/tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss";
export default { content: ["./src/**/*.{ts,tsx}"], theme: { extend: {} }, plugins: [] } satisfies Config;
EOF
w frontend/postcss.config.js <<'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
EOF
w frontend/src/app/globals.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF
w frontend/src/app/layout.tsx <<'EOF'
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "DisputeShield", description: "AI agent for PayPal disputes" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
EOF
w frontend/src/app/page.tsx <<'EOF'
export default function Dashboard() {
  // TODO (Phase 7): stats cards, charts, upcoming deadlines, mode badge
  return <main className="p-8"><h1 className="text-2xl font-semibold">DisputeShield</h1></main>;
}
EOF
w frontend/src/app/disputes/page.tsx <<'EOF'
export default function DisputesPage() {
  // TODO (Phase 7): AG Grid table with deadline badges
  return <main className="p-8">Disputes</main>;
}
EOF
w "frontend/src/app/disputes/[id]/page.tsx" <<'EOF'
export default function DisputeCase() {
  // TODO (Phase 7): analysis panel, citations, decision meter, evidence editor, approve/reject, audit timeline
  return <main className="p-8">Dispute case</main>;
}
EOF
w frontend/src/app/demo-store/page.tsx <<'EOF'
export default function DemoStore() {
  // TODO (Phase 1): PayPal Buttons -> backend create/capture sandbox orders
  return <main className="p-8">Demo store</main>;
}
EOF
w frontend/src/app/settings/page.tsx <<'EOF'
export default function SettingsPage() {
  // TODO: merchant assumptions (fee, effort cost, base rates) - label as assumptions
  return <main className="p-8">Settings</main>;
}
EOF
for c in DisputeTable AnalysisPanel EvidenceEditor DecisionMeter DeadlineBadge ModeBadge StatsCards AuditTimeline; do
  printf 'export default function %s() {\n  // TODO\n  return null;\n}\n' "$c" | w "frontend/src/components/${c}.tsx"
done
ts frontend/src/lib/api.ts "typed API client for the FastAPI backend (NEXT_PUBLIC_API_URL)"
ts frontend/src/lib/types.ts "shared TypeScript types mirroring backend schemas"
ts frontend/src/lib/format.ts "money/date formatting helpers"

# ---------- git ----------
if [ ! -d .git ] && command -v git >/dev/null 2>&1; then
  git init -q && echo "  git     initialised repository"
fi

echo
echo "Done. Next steps:"
echo "  1. cd $PROJECT && cp .env.example .env   # add PayPal sandbox + Anthropic keys"
echo "  2. make setup"
echo "  3. make test                              # decision-engine tests should pass"
echo "  4. Open the folder in Antigravity IDE and give the agent the Phase 1 prompt from docs/ANTIGRAVITY_CONTEXT.md (Section 13)"
